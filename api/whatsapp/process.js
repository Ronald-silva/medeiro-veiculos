// ============================================
// CAMILA 2.0 - WEBHOOK WHATSAPP (Evolution API)
// ============================================
// Sistema com memoria inteligente e personalizacao dinamica
// ============================================

import { TOOL_DEFINITIONS } from '../../src/constants/agentPrompts.js'
import { buildDynamicPrompt, AGENT_SYSTEM_PROMPT } from '../../src/agent/prompts/index.js'
import Anthropic from '@anthropic-ai/sdk'
import logger from '../../src/lib/logger.js'

// Sistema de memoria e analytics
import { createMemory, convertToClaudeFormat } from '../../src/lib/memory.js'
import { trackFunnelEvent, trackConversationMetrics } from '../../src/lib/analytics.js'

// Handlers compartilhados
import {
  convertToolsForClaude,
  processClaudeToolUses
} from '../../src/api/handlers/index.js'

// Utilidades
import { getDateTimeContext } from '../../src/api/utils/index.js'

// Cliente Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const CONFIG = {
  model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
  maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 1024,
  temperature: 0.8,
  historyLimit: 20,
  useDynamicPrompt: true // Ativa sistema de personalizacao
}

/**
 * Processa mensagem com a Camila 2.0
 * Usa sistema de memoria inteligente e personalizacao dinamica
 */
async function processCamilaMessage(userMessage, conversationId, whatsappNumber, pushName = 'Cliente') {
  const startTime = Date.now()
  let toolsCalled = 0

  try {
    // Inicializa sistema de memoria
    const memory = createMemory(whatsappNumber)

    // Busca/cria perfil do cliente
    let customerProfile = await memory.getCustomerProfile()

    // Se nao existe, cria novo lead
    if (!customerProfile) {
      customerProfile = await memory.createLead({
        name: pushName,
        source: 'whatsapp'
      })

      // Registra evento de novo lead
      await trackFunnelEvent(memory.leadId, 'lead_created', {
        source: 'whatsapp',
        firstMessage: userMessage.substring(0, 100)
      })

      logger.info('[WhatsApp] New lead created:', { whatsapp: whatsappNumber, name: pushName })
    }

    // Salva mensagem do usuario na memoria
    await memory.addMessage('user', userMessage, {
      intent: memory.analyzeIntent(userMessage),
      sentiment: memory.analyzeSentiment(userMessage)
    })

    // Busca contexto otimizado (memoria curta + longa)
    const context = await memory.getOptimizedContext()

    // Determina persona e temperatura para personalizacao
    const persona = customerProfile?.profile?.persona || customerProfile?.persona || 'desconhecido'
    const temperature = customerProfile?.temperature || 'morno'

    // Constroi prompt dinamico personalizado
    const systemPrompt = CONFIG.useDynamicPrompt
      ? buildDynamicPrompt({
          context,
          persona,
          temperature,
          currentDate: new Date().toLocaleDateString('pt-BR'),
          currentTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        })
      : AGENT_SYSTEM_PROMPT

    // Converte mensagens para formato Claude
    const messages = [
      ...convertToClaudeFormat(context.recentMessages || []),
      { role: 'user', content: userMessage }
    ]

    logger.info('[WhatsApp] Processing with Camila 2.0:', {
      conversationId,
      leadId: memory.leadId,
      persona,
      temperature,
      historyLength: messages.length
    })

    // Converte tools para formato Claude
    const claudeTools = convertToolsForClaude(TOOL_DEFINITIONS)

    // Chama Claude com tools
    const response = await anthropic.messages.create({
      model: CONFIG.model,
      max_tokens: CONFIG.maxTokens,
      temperature: CONFIG.temperature,
      system: systemPrompt,
      messages: messages,
      tools: claudeTools
    })

    let assistantMessage
    let toolCalled = null

    // Se Claude quis usar tool(s)
    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter(block => block.type === 'tool_use')

      if (toolUses.length > 0) {
        toolsCalled = toolUses.length
        logger.info(`[WhatsApp] Claude tool use: ${toolUses.length} tool(s) requested`)

        // Processa TODAS as tools
        const toolResults = await processClaudeToolUses(toolUses, conversationId)

        // Chama Claude novamente com resultados
        const messagesWithToolResult = [
          ...messages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults }
        ]

        const finalResponse = await anthropic.messages.create({
          model: CONFIG.model,
          max_tokens: CONFIG.maxTokens,
          temperature: CONFIG.temperature,
          system: systemPrompt,
          messages: messagesWithToolResult,
          tools: claudeTools
        })

        const textBlock = finalResponse.content.find(block => block.type === 'text')
        assistantMessage = textBlock?.text || 'Me conta mais sobre o que voce procura!'
        toolCalled = toolUses.map(t => t.name).join(', ')
      }
    } else {
      // Resposta normal sem tool use
      const textBlock = response.content.find(block => block.type === 'text')
      assistantMessage = textBlock?.text || response.content[0].text
    }

    // Salva resposta da Camila na memoria
    await memory.addMessage('assistant', assistantMessage, { toolCalled })

    // Atualiza score do lead baseado na interacao
    await memory.updateLeadScore()

    // Registra metricas da conversa
    const responseTime = Date.now() - startTime
    await trackConversationMetrics({
      leadId: memory.leadId,
      messagesCount: 2, // user + assistant
      toolsCalled,
      responseTimeAvg: responseTime,
      sentiment: memory.analyzeSentiment(userMessage).sentiment,
      intent: memory.analyzeIntent(userMessage).intent
    })

    // Registra atividade
    await memory.logActivity('message_received', `Cliente enviou: ${userMessage.substring(0, 50)}...`)

    logger.info('[WhatsApp] Camila 2.0 response:', {
      responseTime: `${responseTime}ms`,
      toolCalled,
      messagePreview: assistantMessage.substring(0, 100)
    })

    return assistantMessage

  } catch (error) {
    logger.error('[WhatsApp] Error processing with Camila 2.0:', error)
    throw error
  }
}

/**
 * Envia mensagem via Evolution API
 */
async function sendEvolutionMessage(phoneNumber, message, webhookInstance = null) {
  try {
    const evolutionUrl = process.env.EVOLUTION_API_URL
    const evolutionKey = process.env.EVOLUTION_API_KEY
    // Usa instância do webhook se disponível, senão usa variável de ambiente
    const instanceName = webhookInstance || process.env.EVOLUTION_INSTANCE_NAME

    if (!evolutionUrl || !evolutionKey || !instanceName) {
      logger.error('[Evolution] Missing configuration:', {
        hasUrl: !!evolutionUrl,
        hasKey: !!evolutionKey,
        hasInstance: !!instanceName,
        webhookInstance
      })
      throw new Error('Evolution API not configured')
    }

    // Remove @s.whatsapp.net se estiver presente
    const cleanPhone = phoneNumber.replace('@s.whatsapp.net', '')

    // Tenta diferentes formatos de URL para Evolution API
    // Formato 1: com encoding (para espaços e acentos)
    const encodedInstance = encodeURIComponent(instanceName)

    logger.info('[Evolution] Instance details:', {
      original: instanceName,
      encoded: encodedInstance,
      evolutionUrl
    })

    const url = `${evolutionUrl}/message/sendText/${encodedInstance}`

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

    // Extrai número - Evolution API v2.3.7 usa remoteJidAlt para o número real
    // quando addressingMode é 'lid', o remoteJid é um ID interno
    const phoneNumber = data?.key?.remoteJidAlt || data?.key?.remoteJid

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

    // Extrai numero limpo (sem @s.whatsapp.net)
    const cleanPhone = phoneNumber.replace('@s.whatsapp.net', '')

    // Processa com Camila 2.0 (passa numero e nome para memoria)
    const camilaResponse = await processCamilaMessage(message, conversationId, cleanPhone, pushName)

    // Envia resposta de volta via Evolution API
    // Usa a variável de ambiente (mais confiável após renomear instância)
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
