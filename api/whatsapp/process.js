// ✨ REFATORADO: Agora usa handlers compartilhados e arquitetura modular
import { AGENT_SYSTEM_PROMPT, TOOL_DEFINITIONS } from '../../src/constants/agentPrompts.js'
import Anthropic from '@anthropic-ai/sdk'
import { saveConversation, getConversation } from '../../src/lib/upstash.js'
import logger from '../../src/lib/logger.js'

// Importa handlers compartilhados
import {
  convertToolsForClaude,
  processClaudeToolUses
} from '../../src/api/handlers/index.js'

// Importa utilidades
import { getDateTimeContext } from '../../src/api/utils/index.js'

// Cliente Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const CONFIG = {
  model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
  maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 256,
  temperature: 0.7
}

/**
 * Processa mensagem com a Camila
 */
async function processCamilaMessage(userMessage, conversationId) {
  try {
    // Busca histórico da conversa
    const history = await getConversation(conversationId)

    // Adiciona data/horário de Fortaleza usando utilidade compartilhada
    const dateTimeContext = getDateTimeContext()

    // Monta mensagens para Claude (remove timestamp que não é aceito pela API)
    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage + `\n${dateTimeContext}` }
    ]

    logger.info('[WhatsApp] Processing with Camila:', {
      conversationId,
      historyLength: history.length,
      messagePreview: userMessage.substring(0, 100)
    })

    // Converte tools para formato Claude usando handler compartilhado
    const claudeTools = convertToolsForClaude(TOOL_DEFINITIONS)

    // Chama Claude com tools
    const response = await anthropic.messages.create({
      model: CONFIG.model,
      max_tokens: CONFIG.maxTokens,
      temperature: CONFIG.temperature,
      system: AGENT_SYSTEM_PROMPT,
      messages: messages,
      tools: claudeTools
    })

    let assistantMessage
    let toolCalled = null

    // Se Claude quis usar tool(s)
    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter(block => block.type === 'tool_use')

      if (toolUses.length > 0) {
        logger.info(`[WhatsApp] Claude tool use: ${toolUses.length} tool(s) requested`)

        // Processa TODAS as tools usando handler compartilhado
        const toolResults = await processClaudeToolUses(toolUses, conversationId)

        // Chama Claude novamente com TODOS os resultados
        const messagesWithToolResult = [
          ...messages,
          {
            role: 'assistant',
            content: response.content
          },
          {
            role: 'user',
            content: toolResults
          }
        ]

        logger.debug(`[WhatsApp] Sending ${messagesWithToolResult.length} messages to Claude after tool execution`)

        const finalResponse = await anthropic.messages.create({
          model: CONFIG.model,
          max_tokens: CONFIG.maxTokens,
          temperature: CONFIG.temperature,
          system: AGENT_SYSTEM_PROMPT,
          messages: messagesWithToolResult,
          tools: claudeTools
        })

        const textBlock = finalResponse.content.find(block => block.type === 'text')
        assistantMessage = textBlock?.text || 'Desculpe, não entendi.'
        toolCalled = toolUses.map(t => t.name).join(', ')
      }
    } else {
      // Resposta normal sem tool use
      const textBlock = response.content.find(block => block.type === 'text')
      assistantMessage = textBlock?.text || response.content[0].text
    }

    // Salva no histórico
    const updatedHistory = [
      ...history,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() }
    ]

    await saveConversation(conversationId, updatedHistory.slice(-10), 86400)

    if (toolCalled) {
      logger.info(`[WhatsApp] Camila response with tool: ${toolCalled}`, {
        messagePreview: assistantMessage.substring(0, 100)
      })
    } else {
      logger.info('[WhatsApp] Camila response generated:', {
        messagePreview: assistantMessage.substring(0, 100)
      })
    }

    return assistantMessage
  } catch (error) {
    logger.error('[WhatsApp] Error processing with Camila:', error)
    throw error
  }
}

/**
 * Envia mensagem via Evolution API
 */
async function sendEvolutionMessage(phoneNumber, message) {
  try {
    const evolutionUrl = process.env.EVOLUTION_API_URL
    const evolutionKey = process.env.EVOLUTION_API_KEY
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME

    if (!evolutionUrl || !evolutionKey || !instanceName) {
      logger.error('[Evolution] Missing configuration:', {
        hasUrl: !!evolutionUrl,
        hasKey: !!evolutionKey,
        hasInstance: !!instanceName
      })
      throw new Error('Evolution API not configured')
    }

    // Remove @s.whatsapp.net se estiver presente
    const cleanPhone = phoneNumber.replace('@s.whatsapp.net', '')

    const url = `${evolutionUrl}/message/sendText/${instanceName}`

    const payload = {
      number: cleanPhone,
      text: message
    }

    logger.info('[Evolution] Sending message:', {
      url,
      phonePreview: cleanPhone.substring(0, 8) + '...',
      messagePreview: message.substring(0, 100)
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionKey
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('[Evolution] Send failed:', {
        status: response.status,
        error: errorText
      })
      throw new Error(`Evolution API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    logger.info('[Evolution] Message sent successfully:', {
      messageId: result.key?.id
    })

    return result
  } catch (error) {
    logger.error('[Evolution] Send error:', error)
    throw error
  }
}

/**
 * Extrai dados do webhook do Evolution API v2.3.7
 */
function extractWebhookData(body) {
  try {
    // Formato Evolution API v2.3.7:
    // {
    //   "event": "messages.upsert",
    //   "instance": "...",
    //   "data": {
    //     "key": { "remoteJid": "5585...", "fromMe": false },
    //     "pushName": "...",
    //     "message": { "conversation": "..." }
    //   }
    // }

    const { event, instance, data } = body

    // Ignora mensagens enviadas por nós mesmos
    if (data?.key?.fromMe === true) {
      logger.debug('[WhatsApp] Ignoring message from self')
      return null
    }

    // Ignora eventos que não são mensagens novas
    if (event !== 'messages.upsert') {
      logger.debug('[WhatsApp] Ignoring non-upsert event:', event)
      return null
    }

    // Extrai número (remoteJid pode ser "5585988852900@s.whatsapp.net")
    const phoneNumber = data?.key?.remoteJid

    // Extrai mensagem (pode estar em diferentes campos)
    let message = null
    if (data?.message?.conversation) {
      message = data.message.conversation
    } else if (data?.message?.extendedTextMessage?.text) {
      message = data.message.extendedTextMessage.text
    } else if (data?.message?.imageMessage?.caption) {
      message = data.message.imageMessage.caption
    } else if (data?.message?.videoMessage?.caption) {
      message = data.message.videoMessage.caption
    }

    const pushName = data?.pushName || 'Cliente'

    if (!phoneNumber || !message) {
      logger.warn('[WhatsApp] Missing required fields:', {
        hasPhone: !!phoneNumber,
        hasMessage: !!message,
        messageType: data?.message ? Object.keys(data.message)[0] : 'none'
      })
      return null
    }

    return { phoneNumber, message, pushName, instance }
  } catch (error) {
    logger.error('[WhatsApp] Error extracting webhook data:', error)
    return null
  }
}

/**
 * Endpoint POST para processar mensagens do Evolution API
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // LOG COMPLETO DO PAYLOAD PARA DEBUG
    logger.info('[WhatsApp] WEBHOOK PAYLOAD COMPLETO:', {
      body: JSON.stringify(req.body, null, 2),
      headers: req.headers,
      method: req.method
    })

    // Extrai dados do webhook
    const webhookData = extractWebhookData(req.body)

    if (!webhookData) {
      // Não é um erro - apenas ignora mensagens que não precisam processar
      return res.status(200).json({ status: 'ignored' })
    }

    const { phoneNumber, message, pushName } = webhookData

    logger.info('[WhatsApp] Processing message from:', {
      pushName,
      phonePreview: phoneNumber.substring(0, 10) + '...',
      messagePreview: message.substring(0, 100)
    })

    // ID da conversa = número do WhatsApp
    const conversationId = `whatsapp_${phoneNumber}`

    // Processa com Camila
    const camilaResponse = await processCamilaMessage(message, conversationId)

    // Envia resposta de volta via Evolution API
    await sendEvolutionMessage(phoneNumber, camilaResponse)

    return res.status(200).json({
      status: 'success',
      message: 'Response sent via WhatsApp'
    })

  } catch (error) {
    logger.error('[WhatsApp] Process error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}
