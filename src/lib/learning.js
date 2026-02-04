/**
 * Sistema de Aprendizado da Camila
 * - Salva conversas bem-sucedidas
 * - Busca exemplos similares para few-shot learning
 * - Registra estratégias e mede resultados
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import logger from './logger.js'

/**
 * Classifica o segmento do cliente baseado na conversa
 */
export function classifyCustomerSegment(messages, leadData) {
  const allText = messages.map(m => m.content).join(' ').toLowerCase()

  // Decisor rápido: poucas mensagens, direto ao ponto
  if (messages.length < 6 && (allText.includes('quero') || allText.includes('preciso logo'))) {
    return 'decisor_rapido'
  }

  // Analítico: muitas perguntas, comparações
  if (allText.includes('comparar') || allText.includes('diferença') || allText.includes('qual melhor')) {
    return 'analitico'
  }

  // Emocional: fala de família, sonho, história
  if (allText.includes('família') || allText.includes('sonho') || allText.includes('filhos')) {
    return 'emocional'
  }

  // Econômico: foco em preço, economia, parcela
  if (allText.includes('parcela') || allText.includes('desconto') || allText.includes('mais barato')) {
    return 'economico'
  }

  return 'geral'
}

/**
 * Classifica a faixa de orçamento
 */
export function classifyBudgetRange(budget) {
  if (!budget) return 'nao_informado'

  const value = typeof budget === 'number' ? budget : parseInt(budget.replace(/\D/g, '')) || 0

  if (value <= 30000) return 'ate_30k'
  if (value <= 60000) return '30k_60k'
  if (value <= 100000) return '60k_100k'
  return 'acima_100k'
}

/**
 * Identifica a estratégia vencedora baseada nas mensagens
 */
export function identifyWinningStrategy(messages) {
  const assistantMessages = messages
    .filter(m => m.role === 'assistant')
    .map(m => m.content.toLowerCase())
    .join(' ')

  if (assistantMessages.includes('família') || assistantMessages.includes('filhos')) {
    return 'familia'
  }
  if (assistantMessages.includes('urgente') || assistantMessages.includes('última unidade')) {
    return 'urgencia'
  }
  if (assistantMessages.includes('entrada') || assistantMessages.includes('parcela')) {
    return 'financiamento'
  }
  if (assistantMessages.includes('economia') || assistantMessages.includes('diesel')) {
    return 'economia'
  }
  if (assistantMessages.includes('trabalho') || assistantMessages.includes('carga')) {
    return 'trabalho'
  }

  return 'consultivo'
}

/**
 * Extrai mensagens-chave da conversa (as que levaram à conversão)
 */
export function extractKeyMessages(messages, maxMessages = 5) {
  // Pega as últimas mensagens antes da conversão (agendamento/venda)
  const relevantMessages = messages.slice(-10)

  // Filtra para pegar pares de pergunta/resposta importantes
  const keyPairs = []
  for (let i = 0; i < relevantMessages.length - 1; i++) {
    const current = relevantMessages[i]
    const next = relevantMessages[i + 1]

    // Se cliente fez objeção e assistente respondeu bem
    if (current.role === 'user' && next.role === 'assistant') {
      const userText = current.content.toLowerCase()
      if (
        userText.includes('caro') ||
        userText.includes('pensar') ||
        userText.includes('não sei') ||
        userText.includes('quando') ||
        userText.includes('pode')
      ) {
        keyPairs.push({
          user: current.content,
          assistant: next.content
        })
      }
    }
  }

  return keyPairs.slice(0, maxMessages)
}

/**
 * Salva uma conversa bem-sucedida para aprendizado
 */
export async function saveSuccessfulConversation({
  conversationId,
  leadId,
  messages,
  conversionType, // 'sale', 'appointment', 'qualified_lead'
  conversionValue = null,
  vehicleType = null
}) {
  try {
    if (!isSupabaseConfigured()) {
      logger.warn('Supabase not configured, skipping learning save')
      return null
    }

    const segment = classifyCustomerSegment(messages, null)
    const strategy = identifyWinningStrategy(messages)
    const keyMessages = extractKeyMessages(messages)

    // Calcular duração se tivermos timestamps
    let durationMinutes = null
    if (messages.length > 1 && messages[0].created_at && messages[messages.length - 1].created_at) {
      const start = new Date(messages[0].created_at)
      const end = new Date(messages[messages.length - 1].created_at)
      durationMinutes = Math.round((end - start) / 60000)
    }

    const { data, error } = await supabase
      .from('successful_conversations')
      .insert([{
        conversation_id: conversationId,
        lead_id: leadId,
        customer_segment: segment,
        vehicle_type: vehicleType,
        budget_range: 'nao_informado', // Será atualizado se disponível
        winning_strategy: strategy,
        key_messages: keyMessages,
        conversion_type: conversionType,
        conversion_value: conversionValue,
        messages_count: messages.length,
        conversation_duration_minutes: durationMinutes
      }])
      .select()

    if (error) {
      logger.error('Error saving successful conversation:', error)
      return null
    }

    logger.info(`Saved successful conversation: ${conversionType} via ${strategy}`)
    return data[0]
  } catch (error) {
    logger.error('Error in saveSuccessfulConversation:', error)
    return null
  }
}

/**
 * Busca exemplos similares para few-shot learning
 */
export async function findSimilarSuccessfulConversations({
  customerSegment = null,
  vehicleType = null,
  budgetRange = null,
  limit = 3
}) {
  try {
    if (!isSupabaseConfigured()) {
      logger.debug('Supabase not configured, skipping similar search')
      return []
    }

    let query = supabase
      .from('successful_conversations')
      .select('*')
      .order('created_at', { ascending: false })

    // Priorizar matches exatos
    if (customerSegment) {
      query = query.eq('customer_segment', customerSegment)
    }
    if (vehicleType) {
      query = query.eq('vehicle_type', vehicleType)
    }
    if (budgetRange) {
      query = query.eq('budget_range', budgetRange)
    }

    query = query.limit(limit)

    const { data, error } = await query

    if (error) {
      logger.error('Error finding similar conversations:', error)
      return []
    }

    // Se não encontrou matches específicos, busca genéricos
    if (!data || data.length === 0) {
      const { data: fallback } = await supabase
        .from('successful_conversations')
        .select('*')
        .eq('conversion_type', 'sale')
        .order('created_at', { ascending: false })
        .limit(limit)

      return fallback || []
    }

    return data
  } catch (error) {
    logger.error('Error in findSimilarSuccessfulConversations:', error)
    return []
  }
}

/**
 * Gera exemplos de few-shot para incluir no prompt
 */
export async function generateFewShotExamples(context) {
  const examples = await findSimilarSuccessfulConversations(context)

  if (!examples || examples.length === 0) {
    return ''
  }

  let fewShotText = '\n\n📚 **EXEMPLOS DE CONVERSAS QUE CONVERTERAM:**\n\n'

  examples.forEach((example, index) => {
    fewShotText += `**Exemplo ${index + 1}** (${example.conversion_type} - estratégia: ${example.winning_strategy}):\n`

    if (example.key_messages && example.key_messages.length > 0) {
      example.key_messages.forEach(msg => {
        fewShotText += `Cliente: "${msg.user}"\n`
        fewShotText += `Camila: "${msg.assistant}"\n\n`
      })
    }
  })

  fewShotText += '---\n'

  return fewShotText
}

/**
 * Registra a estratégia usada em uma resposta (para tracking)
 */
export async function trackResponseStrategy({
  messageId,
  conversationId,
  strategyType,
  vehicleSuggested = null,
  ctaType = null,
  customerSegment = null,
  objectionHandled = null
}) {
  try {
    if (!isSupabaseConfigured()) return null

    const { data, error } = await supabase
      .from('response_strategies')
      .insert([{
        message_id: messageId,
        conversation_id: conversationId,
        strategy_type: strategyType,
        vehicle_suggested: vehicleSuggested,
        cta_type: ctaType,
        customer_segment: customerSegment,
        objection_handled: objectionHandled
      }])
      .select()

    if (error) {
      logger.error('Error tracking strategy:', error)
      return null
    }

    return data[0]
  } catch (error) {
    logger.error('Error in trackResponseStrategy:', error)
    return null
  }
}

/**
 * Atualiza o resultado de uma estratégia (chamado depois de medir outcome)
 */
export async function updateStrategyOutcome(messageId, outcome) {
  try {
    if (!isSupabaseConfigured()) return null

    const { data, error } = await supabase
      .from('response_strategies')
      .update({
        outcome,
        outcome_measured_at: new Date().toISOString()
      })
      .eq('message_id', messageId)
      .select()

    if (error) {
      logger.error('Error updating strategy outcome:', error)
      return null
    }

    return data[0]
  } catch (error) {
    logger.error('Error in updateStrategyOutcome:', error)
    return null
  }
}

/**
 * Busca métricas de aprendizado
 */
export async function getLearningMetrics() {
  try {
    if (!isSupabaseConfigured()) return null

    const { data, error } = await supabase
      .from('learning_metrics')
      .select('*')

    if (error) {
      // View pode não existir ainda
      logger.debug('Learning metrics view not available:', error)
      return null
    }

    return data
  } catch (error) {
    logger.error('Error in getLearningMetrics:', error)
    return null
  }
}
