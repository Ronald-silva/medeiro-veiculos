// ============================================
// CAMILA 2.0 - SISTEMA DE FEW-SHOT LEARNING
// ============================================
// Seleciona exemplos dinâmicos de conversas bem-sucedidas
// para enriquecer o prompt da Camila
// ============================================

import {
  generateEmbedding,
  findSimilarConversations
} from './embeddings.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import logger from './logger.js';

// ============================================
// CONFIGURAÇÃO
// ============================================

const FEW_SHOT_CONFIG = {
  // Número de exemplos a incluir no prompt
  maxExamples: 3,

  // Similaridade mínima para incluir (0-1)
  minSimilarity: 0.6,

  // Cache de exemplos (para prompt caching)
  cacheEnabled: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutos

  // Pesos por tipo de conversão
  conversionWeights: {
    sale: 1.5,          // Vendas têm peso maior
    appointment: 1.2,   // Agendamentos são bons
    qualified_lead: 1.0 // Qualificação é baseline
  }
};

// Cache em memória
const examplesCache = new Map();

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * Seleciona exemplos relevantes para o contexto atual
 * @param {Object} context - Contexto da conversa atual
 * @param {string} context.currentMessage - Mensagem atual do cliente
 * @param {string} context.customerSegment - Segmento do cliente
 * @param {string} context.vehicleType - Tipo de veículo de interesse
 * @param {string} context.budgetRange - Faixa de orçamento
 * @param {Array} context.recentMessages - Últimas mensagens da conversa
 * @returns {Promise<Array>} - Exemplos formatados para o prompt
 */
export async function selectFewShotExamples(context) {
  try {
    const {
      currentMessage,
      customerSegment,
      vehicleType,
      budgetRange,
      recentMessages = []
    } = context;

    // Verifica cache
    const cacheKey = generateCacheKey(context);
    if (FEW_SHOT_CONFIG.cacheEnabled && examplesCache.has(cacheKey)) {
      const cached = examplesCache.get(cacheKey);
      if (Date.now() - cached.timestamp < FEW_SHOT_CONFIG.cacheTTL) {
        logger.debug('[FewShot] Usando exemplos do cache');
        return cached.examples;
      }
    }

    // Monta texto para embedding (mensagem atual + contexto recente)
    const contextText = [
      currentMessage,
      ...recentMessages.slice(-4).map(m => m.content)
    ].join('\n');

    // Gera embedding do contexto atual
    const queryEmbedding = await generateEmbedding(contextText);

    if (!queryEmbedding) {
      logger.warn('[FewShot] Não foi possível gerar embedding');
      return getDefaultExamples();
    }

    // Busca conversas similares
    const similarConversations = await findSimilarConversations(
      queryEmbedding,
      { customerSegment, vehicleType, budgetRange },
      FEW_SHOT_CONFIG.maxExamples * 2 // Busca mais para filtrar
    );

    // Filtra por similaridade mínima e aplica pesos
    const scoredExamples = similarConversations
      .filter(c => c.similarity >= FEW_SHOT_CONFIG.minSimilarity)
      .map(c => ({
        ...c,
        weightedScore: c.similarity * (FEW_SHOT_CONFIG.conversionWeights[c.conversion_type] || 1)
      }))
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, FEW_SHOT_CONFIG.maxExamples);

    // Formata exemplos para o prompt
    const formattedExamples = scoredExamples.map(formatExampleForPrompt);

    // Salva no cache
    if (FEW_SHOT_CONFIG.cacheEnabled) {
      examplesCache.set(cacheKey, {
        examples: formattedExamples,
        timestamp: Date.now()
      });
    }

    logger.info(`[FewShot] Selecionados ${formattedExamples.length} exemplos`);
    return formattedExamples;

  } catch (error) {
    logger.error('[FewShot] Erro ao selecionar exemplos:', error);
    return getDefaultExamples();
  }
}

/**
 * Formata um exemplo para inclusão no prompt
 */
function formatExampleForPrompt(example) {
  const messages = example.messages_sample || [];

  // Formata troca de mensagens
  const conversation = messages
    .map(m => {
      const role = m.role === 'user' ? 'Cliente' : 'Camila';
      return `${role}: ${m.content}`;
    })
    .join('\n');

  return {
    context: example.conversation_summary,
    strategy: example.winning_strategy,
    conversionType: example.conversion_type,
    conversation,
    similarity: example.similarity
  };
}

/**
 * Gera chave de cache baseada no contexto
 */
function generateCacheKey(context) {
  const parts = [
    context.customerSegment || 'any',
    context.vehicleType || 'any',
    context.budgetRange || 'any',
    // Hash simples da mensagem
    context.currentMessage?.slice(0, 50) || ''
  ];
  return parts.join('_');
}

/**
 * Retorna exemplos padrão quando não há dados suficientes
 */
function getDefaultExamples() {
  return [
    {
      context: 'Cliente interessado em SUV para família, preocupado com financiamento',
      strategy: 'emphasis_affordability',
      conversionType: 'appointment',
      conversation: `Cliente: Boa tarde, vocês tem SUV? Tô procurando um carro pra família
Camila: Boa tarde! 😊 Temos sim! SUVs são perfeitos pra família. Qual faixa de valor você tá pensando?
Cliente: Uns 80 mil, mas tô preocupado com a parcela
Camila: Entendo! Com 80 mil a gente tem ótimas opções. E sobre a parcela, trabalhamos com várias financeiras pra encontrar a melhor condição pra você. Quer agendar uma visita pra eu te mostrar as opções e simular na hora?`,
      similarity: 0.8
    }
  ];
}

// ============================================
// CONSTRUÇÃO DO PROMPT
// ============================================

/**
 * Constrói a seção de exemplos para o prompt
 * @param {Array} examples - Exemplos selecionados
 * @returns {string} - Texto formatado para o prompt
 */
export function buildExamplesSection(examples) {
  if (!examples || examples.length === 0) {
    return '';
  }

  const header = `
## EXEMPLOS DE CONVERSAS BEM-SUCEDIDAS
Aprenda com estas conversas que resultaram em conversão:
`;

  const examplesText = examples.map((ex, i) => `
### Exemplo ${i + 1} (${ex.conversionType}) - Estratégia: ${ex.strategy}
**Contexto:** ${ex.context}

${ex.conversation}
`).join('\n');

  const footer = `
---
Use estes exemplos como referência para tom, estratégia e abordagem.
`;

  return header + examplesText + footer;
}

/**
 * Enriquece o prompt da Camila com exemplos dinâmicos
 * @param {string} basePrompt - Prompt base da Camila
 * @param {Object} context - Contexto da conversa
 * @returns {Promise<string>} - Prompt enriquecido
 */
export async function enrichPromptWithExamples(basePrompt, context) {
  try {
    const examples = await selectFewShotExamples(context);
    const examplesSection = buildExamplesSection(examples);

    // Insere exemplos antes das regras finais
    const enrichedPrompt = basePrompt + '\n\n' + examplesSection;

    return enrichedPrompt;

  } catch (error) {
    logger.error('[FewShot] Erro ao enriquecer prompt:', error);
    return basePrompt;
  }
}

// ============================================
// TRACKING DE ESTRATÉGIAS
// ============================================

/**
 * Registra a estratégia usada em uma resposta
 * Para análise de outcome-based learning
 */
export async function trackResponseStrategy(data) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { error, data: result } = await supabase
      .from('response_strategies')
      .insert({
        message_id: data.messageId,
        lead_id: data.leadId,
        conversation_id: data.conversationId,
        strategy_used: data.strategy,
        vehicle_suggested: data.vehicleSuggested,
        cta_type: data.ctaType,
        customer_segment: data.customerSegment,
        lead_temperature: data.leadTemperature,
        response_preview: data.responsePreview?.slice(0, 200)
      })
      .select('id')
      .single();

    if (error) throw error;

    logger.debug('[FewShot] Estratégia registrada:', result.id);
    return result.id;

  } catch (error) {
    logger.error('[FewShot] Erro ao registrar estratégia:', error);
    return null;
  }
}

/**
 * Atualiza o outcome de uma estratégia
 */
export async function updateStrategyOutcome(strategyId, outcome, details = null) {
  if (!isSupabaseConfigured() || !strategyId) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('response_strategies')
      .update({
        outcome,
        outcome_details: details,
        outcome_measured_at: new Date()
      })
      .eq('id', strategyId);

    if (error) throw error;

    logger.info('[FewShot] Outcome atualizado:', { strategyId, outcome });
    return true;

  } catch (error) {
    logger.error('[FewShot] Erro ao atualizar outcome:', error);
    return false;
  }
}

// ============================================
// ANÁLISE DE PERFORMANCE
// ============================================

/**
 * Obtém performance das estratégias por segmento
 */
export async function getStrategyPerformance(filters = {}) {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    let query = supabase
      .from('strategy_performance')
      .select('*');

    if (filters.customerSegment) {
      query = query.eq('customer_segment', filters.customerSegment);
    }

    if (filters.minUses) {
      query = query.gte('total_uses', filters.minUses);
    }

    const { data, error } = await query
      .order('success_rate', { ascending: false });

    if (error) throw error;

    return data || [];

  } catch (error) {
    logger.error('[FewShot] Erro ao obter performance:', error);
    return [];
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  selectFewShotExamples,
  buildExamplesSection,
  enrichPromptWithExamples,
  trackResponseStrategy,
  updateStrategyOutcome,
  getStrategyPerformance,
  config: FEW_SHOT_CONFIG
};
