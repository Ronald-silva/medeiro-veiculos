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

// Importa sistema de histórico de conversas
import {
  getOrCreateConversation,
  saveMessage,
  markConversationAsAppointment
} from '../../src/lib/conversationHistory.js'

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
  maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 800, // Reduzido para respostas mais rápidas
  temperature: 0.7,  // Balanceado entre criatividade e consistência
  historyLimit: 15,  // Histórico otimizado para velocidade
  typingDelay: 1500  // Delay mínimo para simular digitação humana (ms)
}

/**
 * Detecta se a mensagem é simples (saudação, confirmação, etc.)
 * Mensagens simples podem usar modelo mais rápido
 */
function isSimpleMessage(message) {
  const simplePatterns = [
    /^(oi|olá|ola|hey|eae|e aí|bom dia|boa tarde|boa noite|blz|ok|sim|não|nao)[\s!?.]*$/i,
    /^(tudo bem|td bem|tdb|como vai|beleza)[\s!?.]*$/i
  ]
  return simplePatterns.some(pattern => pattern.test(message.trim()))
}

/**
 * Detecta mensagens de encerramento/agradecimento
 * Estas precisam de resposta contextual, não genérica
 */
function isClosingMessage(message) {
  const closingPatterns = [
    /^(obrigad[oa]|valeu|brigad[oa]|vlw|thanks|thank you)[\s!?.]*$/i,
    /^(até|ate|tchau|flw|falou|abraço|abraco)[\s!?.]*$/i
  ]
  return closingPatterns.some(pattern => pattern.test(message.trim()))
}

/**
 * Resposta padrão para mensagens de agradecimento
 */
function getClosingResponse() {
  const responses = [
    'Por nada! Qualquer dúvida, é só chamar 😊',
    'Disponha! Estou aqui se precisar de algo mais 😊',
    'Imagina! Fico feliz em ajudar. Até logo! 😊',
    'De nada! Qualquer coisa, me chama aqui 😊'
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

/**
 * Processa mensagem com a Camila
 * @param {string} userMessage - Mensagem do usuário
 * @param {string} conversationId - ID da conversa
 * @param {Object} clientInfo - Informações do cliente (opcional)
 * @param {string} clientInfo.phone - Telefone do cliente
 * @param {string} clientInfo.name - Nome do cliente
 */
async function processCamilaMessage(userMessage, conversationId, clientInfo = {}) {
  try {
    // Detecta mensagem de encerramento - resposta rápida e contextual
    if (isClosingMessage(userMessage)) {
      logger.info('[Twilio] Closing message detected, using quick response')
      return getClosingResponse()
    }

    // Detecta complexidade da mensagem para otimizar modelo
    const useQuickModel = isSimpleMessage(userMessage)
    const selectedModel = useQuickModel ? 'claude-3-5-haiku-20241022' : CONFIG.model

    // Busca histórico da conversa
    const history = await getConversation(conversationId)

    // Adiciona data/horário de Fortaleza usando utilidade compartilhada
    const dateTimeContext = getDateTimeContext()

    // Contexto do cliente (para tools como schedule_visit)
    const clientContext = clientInfo.phone
      ? `\n[WhatsApp do cliente: ${clientInfo.phone}]${clientInfo.name ? ` [Nome: ${clientInfo.name}]` : ''}`
      : ''

    // Monta mensagens para Claude (remove timestamp que não é aceito pela API)
    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage + `\n${dateTimeContext}${clientContext}` }
    ]

    logger.info('[Twilio] Processing with Camila:', {
      conversationId,
      historyLength: history.length,
      messagePreview: userMessage.substring(0, 100)
    })

    // Converte tools para formato Claude usando handler compartilhado
    const claudeTools = convertToolsForClaude(TOOL_DEFINITIONS)

    logger.info(`[Twilio] Using model: ${selectedModel} (quick: ${useQuickModel})`)

    // Chama Claude com tools
    const response = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: useQuickModel ? 400 : CONFIG.maxTokens,
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
          model: selectedModel,
          max_tokens: CONFIG.maxTokens,
          temperature: CONFIG.temperature,
          system: AGENT_SYSTEM_PROMPT,
          messages: messagesWithToolResult,
          tools: claudeTools
        })

        const textBlock = finalResponse.content.find(block => block.type === 'text')
        assistantMessage = textBlock?.text || 'Como posso te ajudar? 😊'
        toolCalled = toolUses.map(t => t.name).join(', ')
      }
    } else {
      // Resposta normal sem tool use
      const textBlock = response.content.find(block => block.type === 'text')
      assistantMessage = textBlock?.text || response.content[0].text
    }

    // Salva no histórico Redis (memória de curto prazo)
    const updatedHistory = [
      ...history,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() }
    ]

    await saveConversation(conversationId, updatedHistory.slice(-CONFIG.historyLimit), 86400)

    // === PERSISTÊNCIA NO SUPABASE (histórico permanente) ===
    const processingEndTime = Date.now()
    const responseTimeMs = processingEndTime - (clientInfo._startTime || processingEndTime)

    // Busca ou cria conversa no Supabase
    const dbConversationId = await getOrCreateConversation(clientInfo.phone)

    if (dbConversationId) {
      // Salva mensagem do usuário
      await saveMessage({
        conversationId: dbConversationId,
        role: 'user',
        content: userMessage
      })

      // Salva resposta da Camila
      await saveMessage({
        conversationId: dbConversationId,
        role: 'assistant',
        content: assistantMessage,
        responseTimeMs,
        toolName: toolCalled || null
      })

      logger.debug('[Twilio] Messages persisted to Supabase:', { dbConversationId })
    }

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
 * Simula indicador de "digitando" com delay humanizado
 * Envia feedback imediato ao usuário
 */
async function simulateTyping(to, processingTime = CONFIG.typingDelay) {
  // Delay humanizado baseado no tamanho esperado da resposta
  const humanDelay = Math.min(processingTime, 2000)
  await new Promise(resolve => setTimeout(resolve, humanDelay))
}

/**
 * Envia reação de "lido" imediatamente (feedback visual)
 */
async function sendReadReceipt(to) {
  try {
    // Twilio não tem "read receipt" nativo, mas podemos logar
    logger.info('[Twilio] Message received, processing...', { to })
  } catch (error) {
    logger.warn('[Twilio] Could not send read receipt:', error)
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
    const startTime = Date.now()

    logger.info('[Twilio] Processing message from:', {
      pushName,
      phonePreview: phoneNumber.substring(0, 10) + '...',
      messagePreview: message.substring(0, 100)
    })

    // ID da conversa = número do WhatsApp
    const conversationId = `whatsapp_${phoneNumber.replace('+', '')}`

    // Feedback imediato (marca como recebido)
    await sendReadReceipt(phoneNumber)

    // Processa com Camila (otimizado) - passa telefone, nome e timestamp
    const camilaResponse = await processCamilaMessage(message, conversationId, {
      phone: phoneNumber,
      name: pushName,
      _startTime: startTime
    })

    // Calcula tempo de processamento
    const processingTime = Date.now() - startTime
    logger.info(`[Twilio] Processing time: ${processingTime}ms`)

    // Simula tempo de digitação humanizado baseado no tamanho da resposta
    // Humanos digitam ~40 palavras/minuto = ~200 chars/minuto = ~3.3 chars/segundo
    const responseLength = camilaResponse.length
    const estimatedTypingTime = Math.min(responseLength * 30, 4000) // ~30ms por char, max 4s
    const totalDesiredTime = Math.max(2000, estimatedTypingTime) // Mínimo 2s para parecer natural
    const remainingDelay = Math.max(0, totalDesiredTime - processingTime)

    if (remainingDelay > 0) {
      logger.info(`[Twilio] Adding ${remainingDelay}ms delay to simulate typing`)
      await simulateTyping(phoneNumber, remainingDelay)
    }

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
