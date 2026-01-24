// Webhook handler para Twilio WhatsApp
import { AGENT_SYSTEM_PROMPT, TOOL_DEFINITIONS } from '../../src/constants/agentPrompts.js'
import Anthropic from '@anthropic-ai/sdk'
import { saveConversation, getConversation } from '../../src/lib/upstash.js'
import logger from '../../src/lib/logger.js'
import twilio from 'twilio'

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

// Cliente Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

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

    logger.info('[Twilio] Processing with Camila:', {
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
        logger.info(`[Twilio] Claude tool use: ${toolUses.length} tool(s) requested`)

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

        logger.debug(`[Twilio] Sending ${messagesWithToolResult.length} messages to Claude after tool execution`)

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
      logger.info(`[Twilio] Camila response with tool: ${toolCalled}`, {
        messagePreview: assistantMessage.substring(0, 100)
      })
    } else {
      logger.info('[Twilio] Camila response generated:', {
        messagePreview: assistantMessage.substring(0, 100)
      })
    }

    return assistantMessage
  } catch (error) {
    logger.error('[Twilio] Error processing with Camila:', error)
    throw error
  }
}

/**
 * Envia mensagem via Twilio WhatsApp
 */
async function sendTwilioMessage(to, message) {
  try {
    const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER

    if (!twilioNumber) {
      logger.error('[Twilio] Missing TWILIO_WHATSAPP_NUMBER')
      throw new Error('Twilio WhatsApp number not configured')
    }

    // Formata números para Twilio (whatsapp:+5585...)
    const fromNumber = twilioNumber.startsWith('whatsapp:')
      ? twilioNumber
      : `whatsapp:${twilioNumber}`

    const toNumber = to.startsWith('whatsapp:')
      ? to
      : `whatsapp:${to}`

    logger.info('[Twilio] Sending message:', {
      from: fromNumber,
      to: toNumber,
      messagePreview: message.substring(0, 100)
    })

    const result = await twilioClient.messages.create({
      from: fromNumber,
      to: toNumber,
      body: message
    })

    logger.info('[Twilio] Message sent successfully:', {
      sid: result.sid,
      status: result.status
    })

    return result
  } catch (error) {
    logger.error('[Twilio] Send error:', error)
    throw error
  }
}

/**
 * Extrai dados do webhook do Twilio
 * Twilio envia dados como application/x-www-form-urlencoded
 */
function extractTwilioData(body) {
  try {
    // Formato Twilio:
    // {
    //   From: 'whatsapp:+5585999999999',
    //   To: 'whatsapp:+5585920021150',
    //   Body: 'mensagem',
    //   ProfileName: 'Nome do contato',
    //   WaId: '5585999999999',
    //   ...
    // }

    const { From, Body, ProfileName, WaId } = body

    if (!From || !Body) {
      logger.warn('[Twilio] Missing required fields:', {
        hasFrom: !!From,
        hasBody: !!Body
      })
      return null
    }

    // Extrai número (remove 'whatsapp:' prefix se existir)
    const phoneNumber = From.replace('whatsapp:', '')
    const pushName = ProfileName || 'Cliente'

    logger.info('[Twilio] Extracted webhook data:', {
      phoneNumber: phoneNumber.substring(0, 10) + '...',
      pushName,
      messagePreview: Body.substring(0, 50)
    })

    return { phoneNumber, message: Body, pushName }
  } catch (error) {
    logger.error('[Twilio] Error extracting webhook data:', error)
    return null
  }
}

/**
 * Endpoint POST para processar mensagens do Twilio WhatsApp
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    logger.info('[Twilio] WEBHOOK RECEIVED:', {
      body: req.body,
      contentType: req.headers['content-type']
    })

    // Extrai dados do webhook
    const webhookData = extractTwilioData(req.body)

    if (!webhookData) {
      // Retorna 200 para Twilio não ficar retentando
      return res.status(200).send('OK')
    }

    const { phoneNumber, message, pushName } = webhookData

    logger.info('[Twilio] Processing message from:', {
      pushName,
      phonePreview: phoneNumber.substring(0, 10) + '...',
      messagePreview: message.substring(0, 100)
    })

    // ID da conversa = número do WhatsApp
    const conversationId = `whatsapp_${phoneNumber.replace('+', '')}`

    // Processa com Camila
    const camilaResponse = await processCamilaMessage(message, conversationId)

    // Envia resposta de volta via Twilio
    await sendTwilioMessage(phoneNumber, camilaResponse)

    // Twilio espera resposta TwiML ou 200 OK
    return res.status(200).send('OK')

  } catch (error) {
    logger.error('[Twilio] Process error:', error)
    // Retorna 200 mesmo com erro para Twilio não ficar retentando
    return res.status(200).send('OK')
  }
}
