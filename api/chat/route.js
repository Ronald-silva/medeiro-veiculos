// ✨ REFATORADO: Agora usa handlers compartilhados e arquitetura modular
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { isSupabaseConfigured } from '../../src/lib/supabaseClient.js'
import { AGENT_SYSTEM_PROMPT, TOOL_DEFINITIONS } from '../../src/constants/agentPrompts.js'
import { saveConversation, getConversation, checkRateLimit, isUpstashConfigured } from '../../src/lib/upstash.js'
import { withCircuitBreaker } from '../../src/lib/circuit-breaker.js'
import { captureException } from '../../src/lib/sentry.js'
import logger from '../../src/lib/logger.js'

// Importa handlers compartilhados (apenas os usados)
import {
  convertToolsForClaude,
  processClaudeToolUses,
  processOpenAIToolCalls
} from '../../src/api/handlers/index.js'

// Importa utilidades
import { getDateTimeContext } from '../../src/api/utils/index.js'

// Importa sistema de histórico de conversas (persistência no Supabase)
import {
  getOrCreateConversation,
  saveMessage as saveMessageToDb
} from '../../src/lib/conversationHistory.js'

// Importa supervisor de validação
import { validateResponse, applyCorrections, logValidation } from '../../src/lib/supervisor.js'

// === SISTEMAS DE INTELIGÊNCIA AVANÇADA ===
import { calculatePredictiveIntent } from '../../src/lib/predictiveIntent.js'
import { getExamplesForPrompt, detectCustomerSegment, detectVehicleInterest, detectBudgetRange } from '../../src/lib/fewShotLearning.js'

// Detecta qual API usar (Anthropic preferido, OpenAI como fallback)
const USE_ANTHROPIC = process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('your-')
const USE_OPENAI = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-')

// Logs de inicialização
logger.info('🔍 API Detection:', {
  anthropic: USE_ANTHROPIC ? 'ENABLED' : 'DISABLED',
  openai: USE_OPENAI ? 'ENABLED' : 'DISABLED',
  selected: USE_ANTHROPIC ? 'CLAUDE' : (USE_OPENAI ? 'OPENAI' : 'NONE')
})

logger.info('💾 Cache Configuration:', {
  upstash: isUpstashConfigured() ? 'ENABLED (persistent)' : 'DISABLED (memory fallback)',
  supabase: isSupabaseConfigured() ? 'ENABLED' : 'DISABLED'
})

// Inicializa clients
const anthropic = USE_ANTHROPIC ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
}) : null

const openai = USE_OPENAI ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null

// Configuração - OTIMIZADO PARA EVITAR ALUCINAÇÕES
const CONFIG = {
  anthropic: {
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 512,
    temperature: 0.3  // Baixa para respostas mais consistentes e factuais
  },
  openai: {
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 800,
    temperature: 0.3  // Baixa para respostas mais consistentes e factuais
  }
}

// Gerenciamento de conversas (agora usando Upstash Redis)
async function getConversationHistory(conversationId) {
  return await getConversation(conversationId)
}

async function saveMessage(conversationId, role, content) {
  const history = await getConversationHistory(conversationId)

  // Se content não é string, não salvar no cache (evita problemas com tool_use)
  if (typeof content !== 'string') {
    logger.warn('Skipping non-string message from cache')
    return history
  }

  history.push({ role, content, timestamp: new Date().toISOString() })

  // ✅ RAILWAY + UPSTASH: Mantém até 10 mensagens (5 trocas completas) para IA ser INTELIGENTE
  // Upstash Redis garante persistência mesmo com reinicializações do servidor
  // Isso permite: memória contextual, não repetir perguntas, usar técnicas SPIN/BANT
  const limitedHistory = history.slice(-10)

  // Salva no Upstash Redis (ou memória como fallback) com TTL de 24h
  await saveConversation(conversationId, limitedHistory, 86400)

  return limitedHistory
}

// Helper para timeout
function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ])
}

// Chat usando Anthropic Claude
async function chatWithClaude(messages, convId) {
  const claudeTools = convertToolsForClaude(TOOL_DEFINITIONS)

  // Filtrar e garantir que apenas mensagens com conteúdo string sejam enviadas
  const cleanMessages = messages
    .filter(m => typeof m.content === 'string' && m.content.trim().length > 0)
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }))

  logger.debug(`Sending ${cleanMessages.length} messages to Claude`)

  // Claude precisa do system message separado
  // Circuit Breaker protege contra falhas consecutivas da API
  const response = await withCircuitBreaker('claude-api', async () => {
    return await withTimeout(
      anthropic.messages.create({
        model: CONFIG.anthropic.model,
        max_tokens: CONFIG.anthropic.maxTokens,
        temperature: CONFIG.anthropic.temperature,
        system: AGENT_SYSTEM_PROMPT,
        messages: cleanMessages,
        tools: claudeTools
      }),
      25000
    )
  }, { failureThreshold: 3, resetTimeout: 30000 })

  // Se Claude quis usar tool(s)
  if (response.stop_reason === 'tool_use') {
    // Encontrar TODAS as tools que Claude quer usar (pode ser múltiplas!)
    const toolUses = response.content.filter(block => block.type === 'tool_use')

    if (toolUses.length > 0) {
      logger.info(`Claude tool use: ${toolUses.length} tool(s) requested`)

      // Processa TODAS as tools usando handler compartilhado
      const toolResults = await processClaudeToolUses(toolUses, convId)

      // Chama Claude novamente com TODOS os resultados
      const cleanMessagesForToolResult = messages
        .filter(m => typeof m.content === 'string' && m.content.trim().length > 0)
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))

      // IMPORTANTE: Incluir histórico limpo + tool_use + TODOS tool_results
      const messagesWithToolResult = [
        ...cleanMessagesForToolResult,
        {
          role: 'assistant',
          content: response.content  // Inclui TODOS os tool_use blocks
        },
        {
          role: 'user',
          content: toolResults  // Array com TODOS os tool_results
        }
      ]

      logger.debug(`Sending ${messagesWithToolResult.length} messages to Claude after tool execution`)
      logger.debug(`Processed ${toolResults.length} tool results`)

      const finalResponse = await withCircuitBreaker('claude-api', async () => {
        return await withTimeout(
          anthropic.messages.create({
            model: CONFIG.anthropic.model,
            max_tokens: CONFIG.anthropic.maxTokens,
            temperature: CONFIG.anthropic.temperature,
            system: AGENT_SYSTEM_PROMPT,
            messages: messagesWithToolResult,
            tools: claudeTools
          }),
          25000
        )
      }, { failureThreshold: 3, resetTimeout: 30000 })

      const textBlock = finalResponse.content.find(block => block.type === 'text')
      const responseMessage = textBlock?.text || 'Desculpe, não entendi.'

      return {
        message: responseMessage,
        toolCalled: toolUses.map(t => t.name).join(', '),
        toolResult: toolResults,
        shouldSaveToHistory: true
      }
    }
  }

  // Resposta normal
  const textBlock = response.content.find(block => block.type === 'text')
  return {
    message: textBlock?.text || 'Desculpe, não entendi.',
    shouldSaveToHistory: true // Sinaliza que é seguro salvar no histórico
  }
}

// Chat usando OpenAI (fallback)
async function chatWithOpenAI(messages, convId) {
  const completion = await withCircuitBreaker('openai-api', async () => {
    return await openai.chat.completions.create({
      model: CONFIG.openai.model,
      messages: [
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
        ...messages.map(h => ({ role: h.role, content: h.content }))
      ],
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
      temperature: CONFIG.openai.temperature,
      max_tokens: CONFIG.openai.maxTokens
    })
  }, { failureThreshold: 3, resetTimeout: 30000 })

  const responseMessage = completion.choices[0].message

  // Se IA quis chamar uma tool
  if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
    logger.info(`OpenAI tool calls: ${responseMessage.tool_calls.length} tool(s) requested`)

    // Processa tools usando handler compartilhado
    const toolResults = await processOpenAIToolCalls(responseMessage.tool_calls, convId)

    // Monta mensagens para segunda chamada
    const messagesWithToolResult = [
      { role: 'system', content: AGENT_SYSTEM_PROMPT },
      ...messages.map(h => ({ role: h.role, content: h.content })),
      responseMessage, // Inclui a resposta original com tool_calls
      ...toolResults // Inclui os tool results
    ]

    const finalCompletion = await withCircuitBreaker('openai-api', async () => {
      return await openai.chat.completions.create({
        model: CONFIG.openai.model,
        messages: messagesWithToolResult,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        temperature: CONFIG.openai.temperature,
        max_tokens: CONFIG.openai.maxTokens
      })
    }, { failureThreshold: 3, resetTimeout: 30000 })

    return {
      message: finalCompletion.choices[0].message.content,
      toolCalled: responseMessage.tool_calls.map(t => t.function.name).join(', '),
      toolResult: toolResults,
      shouldSaveToHistory: true
    }
  }

  // Resposta normal
  return {
    message: responseMessage.content,
    shouldSaveToHistory: true
  }
}

// Endpoint POST principal
export async function POST(request) {
  try {
    const body = await request.json()
    const { message, conversationId, context } = body

    if (!message) {
      return new Response(
        JSON.stringify({
          error: 'Message is required',
          message: 'Por favor, envie uma mensagem.'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = await checkRateLimit(ip)

    if (!rateLimitResult.allowed) {
      logger.warn(`Rate limit exceeded for IP: ${ip}`)
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Muitas mensagens. Aguarde um momento e tente novamente.',
          retryAfter: rateLimitResult.retryAfter
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verifica se alguma API está configurada
    if (!USE_ANTHROPIC && !USE_OPENAI) {
      logger.error('No AI API configured')
      return new Response(
        JSON.stringify({
          error: 'No AI API configured',
          message: 'Configure ANTHROPIC_API_KEY ou OPENAI_API_KEY no arquivo .env.local'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const convId = conversationId || crypto.randomUUID()
    const history = await getConversationHistory(convId)

    // === INTELIGÊNCIA PREDITIVA ===
    let intentScore = null
    let fewShotExamples = ''

    try {
      // Detecta contexto do cliente
      const customerSegment = detectCustomerSegment([...history, { role: 'user', content: message }])
      const vehicleType = detectVehicleInterest([...history, { role: 'user', content: message }])
      const budgetRange = detectBudgetRange([...history, { role: 'user', content: message }])

      // Calcula Intent Score preditivo
      intentScore = calculatePredictiveIntent({
        messages: [...history, { role: 'user', content: message }],
        conversationHistory: history,
        behavioralData: context?.behavioral || {}
      })

      logger.info('Predictive Intent:', {
        score: intentScore.score,
        classification: intentScore.classification,
        confidence: intentScore.confidence,
        recommendation: intentScore.recommendation?.action
      })

      // Busca exemplos de conversas similares para Few-Shot Learning
      if (history.length >= 2) {
        fewShotExamples = await getExamplesForPrompt({
          customerSegment,
          vehicleType,
          budgetRange,
          intentScore: intentScore.score
        })
      }
    } catch (intentError) {
      logger.warn('Erro ao calcular intent:', intentError.message)
    }

    // Adiciona contexto se houver
    let userMessage = message

    // Adiciona data e horário atual de Fortaleza usando utilidade compartilhada
    const dateTimeContext = getDateTimeContext()

    if (context?.carName) {
      userMessage += `\n[Contexto: Cliente está vendo o ${context.carName}]`
    }

    userMessage += `\n${dateTimeContext}`

    // Adiciona Intent Score como contexto para a IA
    if (intentScore) {
      userMessage += `\n[Intent Score: ${intentScore.score}/100 (${intentScore.classification}) - ${intentScore.recommendation?.action || 'QUALIFY'}]`

      // Se for lead quente, adiciona sugestão de resposta
      if (intentScore.recommendation?.suggestedResponse && intentScore.score >= 50) {
        userMessage += `\n[Sugestão: ${intentScore.recommendation.suggestedResponse}]`
      }
    }

    // Adiciona exemplos de conversas bem-sucedidas (Few-Shot Learning)
    if (fewShotExamples && history.length >= 4) {
      userMessage += `\n\n${fewShotExamples}`
    }

    // Monta histórico de mensagens
    const messages = [
      ...history,
      { role: 'user', content: userMessage }
    ]

    logger.info(`Chat request - Conversation: ${convId.substring(0, 8)}... - Using: ${USE_ANTHROPIC ? 'Claude' : 'OpenAI'}`)

    // Chama a API apropriada
    let result
    if (USE_ANTHROPIC) {
      result = await chatWithClaude(messages, convId)
    } else {
      result = await chatWithOpenAI(messages, convId)
    }

    // === SUPERVISOR: Valida resposta ANTES de enviar ===
    try {
      const validation = await validateResponse(result.message, {
        toolResults: result.toolResult,
        conversationHistory: history,
        autoCorrect: true
      })

      // 🚨 BLOQUEIO DE ALUCINAÇÃO: Se detectou alucinação, substitui resposta
      if (!validation.isValid) {
        const isHallucination = validation.errors.some(e => e.includes('ALUCINAÇÃO'))

        if (isHallucination) {
          logger.error('🚨 SUPERVISOR: Bloqueando resposta com alucinação de estoque')

          // Substitui por resposta segura
          result.message = 'Deixa eu verificar o que temos no estoque pra você! Me conta: qual tipo de carro você procura e qual seu orçamento?'
          result.hallucinationBlocked = true

          // Loga para análise
          await logValidation(convId, validation, result.message)
        } else {
          // Outros erros (não alucinação) - apenas avisa
          logger.warn('Supervisor: resposta com erros (não-alucinação)', validation.errors)
        }
      }

      // Se houver correções de preço, aplica
      if (validation.corrections.length > 0) {
        result.message = applyCorrections(result.message, validation.corrections)
        logger.info('Supervisor: correções aplicadas', validation.corrections)
      }

      // Loga validação para análise
      await logValidation(convId, validation, result.message)

      // Adiciona flag de validação na resposta (para debug)
      result.validation = {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings
      }
    } catch (validationError) {
      // Não bloqueia se validação falhar
      logger.warn('Supervisor: erro na validação', validationError.message)
    }

    // Salva no histórico (Upstash Redis com persistência)
    await saveMessage(convId, 'user', message)
    await saveMessage(convId, 'assistant', result.message)

    // === PERSISTÊNCIA NO SUPABASE (histórico permanente para CRM) ===
    try {
      // Usa o conversationId como identificador único (chat do site)
      const dbConversationId = await getOrCreateConversation(`site_${convId}`)

      if (dbConversationId) {
        // Salva mensagem do usuário
        await saveMessageToDb({
          conversationId: dbConversationId,
          role: 'user',
          content: message
        })

        // Salva resposta da Camila
        await saveMessageToDb({
          conversationId: dbConversationId,
          role: 'assistant',
          content: result.message,
          toolName: result.toolCalled || null
        })

        logger.debug('Messages persisted to Supabase (site chat):', { dbConversationId })
      }
    } catch (dbError) {
      // Não falha a requisição se o salvamento no DB falhar
      logger.warn('Failed to persist to Supabase:', dbError.message)
    }

    return new Response(
      JSON.stringify({
        message: result.message,
        conversationId: convId,
        aiProvider: USE_ANTHROPIC ? 'claude' : 'openai',
        ...(result.toolCalled && { toolCalled: result.toolCalled }),
        ...(result.toolResult && { toolResult: result.toolResult })
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    logger.error('Error in chat API:', error)
    captureException(error, { service: 'chat-api' })

    // Circuit Breaker aberto - API instável
    if (error.code === 'CIRCUIT_OPEN') {
      return new Response(
        JSON.stringify({
          error: 'Serviço temporariamente indisponível',
          message: 'Nosso sistema está se recuperando. Tente novamente em alguns segundos.',
          retryAfter: error.retryAfter || 30
        }),
        { status: 503, headers: { 'Content-Type': 'application/json', 'Retry-After': String(error.retryAfter || 30) } }
      )
    }

    return new Response(
      JSON.stringify({
        error: 'Desculpe, ocorreu um erro. Tente novamente.',
        details: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Endpoint GET para health check
export async function GET() {
  const supabaseStatus = isSupabaseConfigured() ? 'configured' : 'not configured'
  const aiProvider = USE_ANTHROPIC ? 'claude-3.5-sonnet' : (USE_OPENAI ? 'gpt-4o' : 'none')

  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'chat-api',
      supabase: supabaseStatus,
      aiProvider,
      upstash: isUpstashConfigured() ? 'configured' : 'not configured',
      timestamp: new Date().toISOString()
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
