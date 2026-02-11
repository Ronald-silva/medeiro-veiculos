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

// Importa transcrição de áudio
import { transcribeAudio } from './audioTranscriber.js'

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
  maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 512,
  temperature: 0.3,  // Baixa para respostas mais consistentes e evitar alucinações
  historyLimit: 15   // Histórico completo para contexto
}

/**
 * CACHE DE RESPOSTAS INSTANTÂNEAS
 * Saudações comuns não precisam de IA - resposta em <100ms
 */
const INSTANT_RESPONSES = {
  greetings: {
    patterns: [/^(oi|olá|ola|hey|eae|e aí)[\s!?.]*$/i, /^(bom dia|boa tarde|boa noite)[\s!?.]*$/i],
    responses: [
      'Oi! 😊 Aqui é a Camila da Medeiros Veículos! Como posso te ajudar hoje?',
      'Olá! 😊 Sou a Camila, consultora da Medeiros Veículos. Em que posso ajudar?',
      'Oi! Tudo bem? 😊 Sou a Camila! Está procurando algum veículo específico?'
    ]
  },
  howAreYou: {
    patterns: [/^(tudo bem|td bem|tdb|como vai|beleza|blz)[\s!?.]*$/i],
    responses: [
      'Tudo ótimo! 😊 E você? Em que posso te ajudar hoje?',
      'Tudo bem sim! 😊 Como posso te ajudar?',
      'Bem demais! 😊 Procurando algum carro ou moto?'
    ]
  }
}

/**
 * Verifica se tem resposta instantânea (sem IA)
 * Retorna a resposta ou null se precisar de IA
 */
function getInstantResponse(message) {
  const msg = message.trim().toLowerCase()

  for (const [type, config] of Object.entries(INSTANT_RESPONSES)) {
    if (config.patterns.some(p => p.test(msg))) {
      const responses = config.responses
      return responses[Math.floor(Math.random() * responses.length)]
    }
  }
  return null
}

/**
 * Persiste mensagens no Supabase em background (fire & forget)
 * Não bloqueia a resposta ao usuário
 */
async function persistToSupabase(phone, userMessage, assistantMessage, responseTimeMs, toolCalled) {
  try {
    const dbConversationId = await getOrCreateConversation(phone)
    if (!dbConversationId) return

    // Salva ambas em paralelo
    await Promise.all([
      saveMessage({
        conversationId: dbConversationId,
        role: 'user',
        content: userMessage
      }),
      saveMessage({
        conversationId: dbConversationId,
        role: 'assistant',
        content: assistantMessage,
        responseTimeMs,
        toolName: toolCalled || null
      })
    ])

    logger.debug('[Twilio] Persisted to Supabase in background')
  } catch (error) {
    logger.error('[Twilio] Supabase persist error:', error)
  }
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
 * OTIMIZADO PARA VELOCIDADE
 */
async function processCamilaMessage(userMessage, conversationId, clientInfo = {}) {
  try {
    // ============================================
    // 1. RESPOSTA INSTANTÂNEA (sem IA) - <100ms
    // ============================================
    const instantResponse = getInstantResponse(userMessage)
    if (instantResponse) {
      logger.info('[Twilio] INSTANT response (no AI)', { responseTime: '<100ms' })
      return instantResponse
    }

    // Detecta mensagem de encerramento - resposta rápida
    if (isClosingMessage(userMessage)) {
      logger.info('[Twilio] Closing message, quick response')
      return getClosingResponse()
    }

    // Usa modelo configurado
    const selectedModel = CONFIG.model
    const maxTokens = CONFIG.maxTokens

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
      historyLength: history.length
    })

    // Converte tools para formato Claude usando handler compartilhado
    const claudeTools = convertToolsForClaude(TOOL_DEFINITIONS)

    // Chama Claude com tools
    const response = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: maxTokens,
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
          max_tokens: maxTokens,
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

    // ============================================
    // 3. SALVAR E RETORNAR IMEDIATAMENTE
    // ============================================

    // Salva no Redis (rápido) e retorna resposta
    const updatedHistory = [
      ...history,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() }
    ]

    // Redis é rápido - aguarda para garantir histórico
    await saveConversation(conversationId, updatedHistory.slice(-CONFIG.historyLimit), 86400)

    // ============================================
    // 4. PERSISTÊNCIA SUPABASE EM BACKGROUND (fire & forget)
    // ============================================
    const responseTimeMs = Date.now() - (clientInfo._startTime || Date.now())

    // Não aguarda - salva em background
    persistToSupabase(clientInfo.phone, userMessage, assistantMessage, responseTimeMs, toolCalled)
      .catch(err => logger.error('[Twilio] Background persist error:', err))

    logger.info(`[Twilio] Response ready in ${responseTimeMs}ms`, {
      model: selectedModel,
      tool: toolCalled || 'none'
    })

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

    logger.info('[Twilio] Sending message via Twilio API')

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

    const { From, Body, ProfileName, WaId, NumMedia, MediaUrl0, MediaContentType0 } = body

    if (!From) {
      logger.warn('[Twilio] Missing From field')
      return null
    }

    // Extrai número (remove 'whatsapp:' prefix se existir)
    const phoneNumber = From.replace('whatsapp:', '')
    const pushName = ProfileName || 'Cliente'

    // Verifica se é mensagem de áudio/mídia
    const numMedia = parseInt(NumMedia) || 0
    const isAudio = numMedia > 0 && MediaContentType0?.startsWith('audio/')

    if (isAudio) {
      logger.info('[Twilio] Audio message detected, will transcribe')
      return {
        phoneNumber,
        message: Body || '', // Pode ter legenda junto com áudio
        pushName,
        audioUrl: MediaUrl0,
        audioType: MediaContentType0
      }
    }

    if (!Body) {
      // Mídia não-áudio (imagem, vídeo, etc) sem texto
      if (numMedia > 0) {
        logger.info('[Twilio] Non-audio media received, treating as generic message')
        return { phoneNumber, message: '[Cliente enviou uma imagem/mídia]', pushName }
      }
      logger.warn('[Twilio] Missing Body field')
      return null
    }

    logger.debug('[Twilio] Webhook data extracted successfully')

    return { phoneNumber, message: Body, pushName }
  } catch (error) {
    logger.error('[Twilio] Error extracting webhook data:', error)
    return null
  }
}

/**
 * Processa mensagem de forma ASSÍNCRONA (fire and forget)
 * Isso permite que o webhook responda imediatamente
 */
async function processMessageAsync(webhookData) {
  const { phoneNumber, pushName, audioUrl, audioType } = webhookData
  let { message } = webhookData
  const startTime = Date.now()

  try {
    logger.info('[Twilio] ASYNC processing started')

    // Se é áudio, transcreve antes de processar
    if (audioUrl) {
      const transcription = await transcribeAudio(audioUrl, audioType)
      if (transcription) {
        message = transcription
        logger.info(`[Twilio] Audio transcribed: "${transcription.substring(0, 80)}..."`)
      } else {
        // Fallback: pede pro cliente digitar
        await sendTwilioMessage(phoneNumber,
          'Desculpa, não consegui entender o áudio. Pode me mandar por texto? 😊'
        )
        return
      }
    }

    // Ignora mensagens vazias
    if (!message || !message.trim()) return

    // ID da conversa = número do WhatsApp
    const conversationId = `whatsapp_${phoneNumber.replace('+', '')}`

    // Processa com Camila
    const camilaResponse = await processCamilaMessage(message, conversationId, {
      phone: phoneNumber,
      name: pushName,
      _startTime: startTime
    })

    // Calcula tempo de processamento
    const processingTime = Date.now() - startTime
    logger.info(`[Twilio] ASYNC processing completed in ${processingTime}ms`)

    // Envia resposta via Twilio API
    await sendTwilioMessage(phoneNumber, camilaResponse)

    logger.info('[Twilio] Response sent successfully', {
      totalTime: Date.now() - startTime
    })

  } catch (error) {
    logger.error('[Twilio] ASYNC process error:', error)

    // Tenta enviar mensagem de fallback em caso de erro
    try {
      await sendTwilioMessage(phoneNumber,
        'Oi! Tive um probleminha aqui, mas já estou voltando. Me manda sua mensagem de novo? 😊'
      )
    } catch (fallbackError) {
      logger.error('[Twilio] Failed to send fallback message:', fallbackError)
    }
  }
}

/**
 * Endpoint POST para processar mensagens do Twilio WhatsApp
 * OTIMIZADO: Responde imediatamente e processa em background
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

  const webhookReceivedAt = Date.now()

  try {
    // Valida assinatura do Twilio (segurança contra requests falsos)
    const twilioSignature = req.headers['x-twilio-signature']
    const webhookUrl = process.env.TWILIO_WEBHOOK_URL || `https://${req.headers.host}${req.url}`

    if (process.env.NODE_ENV === 'production' && process.env.TWILIO_AUTH_TOKEN) {
      const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        twilioSignature,
        webhookUrl,
        req.body
      )

      if (!isValid) {
        logger.warn('[Twilio] Invalid webhook signature - rejecting request')
        return res.status(403).send('Forbidden')
      }
    }

    // Log seguro (sem dados sensíveis do cliente)
    logger.info('[Twilio] WEBHOOK RECEIVED:', {
      hasBody: !!req.body,
      contentType: req.headers['content-type']
    })

    // Extrai dados do webhook
    const webhookData = extractTwilioData(req.body)

    if (!webhookData) {
      // Retorna 200 para Twilio não ficar retentando
      return res.status(200).send('OK')
    }

    // ============================================
    // RESPOSTA IMEDIATA AO TWILIO (< 200ms)
    // ============================================
    // Processa a mensagem de forma ASSÍNCRONA
    // Não aguarda o processamento - responde imediatamente
    processMessageAsync(webhookData).catch(err => {
      logger.error('[Twilio] Background processing failed:', err)
    })

    // Responde ao Twilio IMEDIATAMENTE
    const responseTime = Date.now() - webhookReceivedAt
    logger.info(`[Twilio] Webhook response time: ${responseTime}ms (target: <200ms)`)

    return res.status(200).send('OK')

  } catch (error) {
    logger.error('[Twilio] Webhook error:', error)
    // Retorna 200 mesmo com erro para Twilio não ficar retentando
    return res.status(200).send('OK')
  }
}
