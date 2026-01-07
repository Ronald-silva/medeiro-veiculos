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
 * Endpoint POST para processar mensagens (sem enviar de volta)
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
    const { phoneNumber, message } = req.body

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'phoneNumber and message are required' })
    }

    logger.info('[WhatsApp] Processing message:', { phoneNumber })

    // ID da conversa = número do WhatsApp
    const conversationId = `whatsapp_${phoneNumber}`

    // Processa com Camila
    const camilaResponse = await processCamilaMessage(message, conversationId)

    return res.status(200).json({
      status: 'success',
      response: camilaResponse
    })

  } catch (error) {
    logger.error('[WhatsApp] Process error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}
