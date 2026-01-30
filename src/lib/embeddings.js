// ============================================
// CAMILA 2.0 - SISTEMA DE EMBEDDINGS
// ============================================
// Gera embeddings para busca semântica de conversas
// Usa Claude API (Voyage) ou OpenAI embeddings como fallback
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import logger from './logger.js';

// ============================================
// CONFIGURAÇÃO
// ============================================

const EMBEDDINGS_CONFIG = {
  // Modelo de embeddings (Claude usa Voyage internamente)
  model: 'voyage-3',
  dimensions: 1536,

  // Cache TTL (embeddings são estáticos)
  cacheTTL: 7 * 24 * 60 * 60, // 7 dias

  // Batch processing
  maxBatchSize: 100
};

// Cliente Anthropic
let anthropic = null;

function getClient() {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  return anthropic;
}

// ============================================
// FUNÇÕES DE EMBEDDING
// ============================================

/**
 * Gera embedding para um texto usando Claude
 * @param {string} text - Texto para gerar embedding
 * @returns {Promise<number[]>} - Vetor de embedding (1536 dimensões)
 */
export async function generateEmbedding(text) {
  try {
    if (!text || text.trim().length === 0) {
      logger.warn('[Embeddings] Texto vazio, retornando null');
      return null;
    }

    // Limita tamanho do texto (máximo ~8000 tokens)
    const truncatedText = text.slice(0, 30000);

    // Usa a API de mensagens do Claude para gerar um "embedding semântico"
    // Como Claude não tem API de embeddings nativa, usamos uma abordagem alternativa
    // Opção 1: Usar OpenAI embeddings (recomendado para produção)
    // Opção 2: Usar hash semântico via Claude (mais caro, mas funciona)

    // Por enquanto, vamos usar OpenAI embeddings se disponível
    if (process.env.OPENAI_API_KEY) {
      return await generateOpenAIEmbedding(truncatedText);
    }

    // Fallback: Gerar embedding via Claude (menos eficiente)
    return await generateClaudeSemanticHash(truncatedText);

  } catch (error) {
    logger.error('[Embeddings] Erro ao gerar embedding:', error);
    return null;
  }
}

/**
 * Gera embedding usando OpenAI (recomendado)
 */
async function generateOpenAIEmbedding(text) {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: EMBEDDINGS_CONFIG.dimensions
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;

  } catch (error) {
    logger.error('[Embeddings] Erro OpenAI:', error);
    throw error;
  }
}

/**
 * Fallback: Gera hash semântico via Claude
 * Menos eficiente mas funciona sem OpenAI
 */
async function generateClaudeSemanticHash(text) {
  try {
    // Usa Claude para extrair features semânticas
    const client = getClient();

    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      system: `Extraia 50 palavras-chave semânticas deste texto, separadas por vírgula.
Foque em: intenção, sentimento, produtos mencionados, objeções, nível de interesse.
Responda APENAS com as palavras, sem explicações.`,
      messages: [{
        role: 'user',
        content: text
      }]
    });

    const keywords = response.content[0].text;

    // Converte keywords em vetor numérico simples (hash)
    // Nota: Isso é um fallback, não tão preciso quanto embeddings reais
    return textToSimpleVector(keywords, EMBEDDINGS_CONFIG.dimensions);

  } catch (error) {
    logger.error('[Embeddings] Erro Claude fallback:', error);
    throw error;
  }
}

/**
 * Converte texto em vetor numérico simples (fallback)
 */
function textToSimpleVector(text, dimensions) {
  const vector = new Array(dimensions).fill(0);
  const words = text.toLowerCase().split(/[,\s]+/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    // Hash simples da palavra
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(j);
      hash = hash & hash;
    }

    // Distribui no vetor
    const index = Math.abs(hash) % dimensions;
    vector[index] += 1 / words.length;
  }

  // Normaliza
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }
  }

  return vector;
}

// ============================================
// FUNÇÕES DE CONVERSAÇÃO
// ============================================

/**
 * Gera embedding para uma conversa completa
 * @param {Array} messages - Array de mensagens {role, content}
 * @returns {Promise<number[]>} - Embedding da conversa
 */
export async function generateConversationEmbedding(messages) {
  // Formata mensagens em texto
  const text = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => `${m.role === 'user' ? 'Cliente' : 'Camila'}: ${m.content}`)
    .join('\n');

  return generateEmbedding(text);
}

/**
 * Gera resumo + embedding de uma conversa bem-sucedida
 */
export async function processSuccessfulConversation(messages, metadata = {}) {
  try {
    const client = getClient();

    // Formata conversa
    const conversationText = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => `${m.role === 'user' ? 'Cliente' : 'Camila'}: ${m.content}`)
      .join('\n');

    // Gera resumo estruturado
    const summaryResponse = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: `Você é um analista de vendas. Analise esta conversa que resultou em conversão.
Extraia:
1. RESUMO: 2-3 frases do que aconteceu
2. ESTRATÉGIA_VENCEDORA: qual técnica funcionou (ex: emphasis_affordability, urgency, rapport, feature_highlight)
3. MOMENTO_CHAVE: qual resposta foi decisiva
4. OBJECOES_SUPERADAS: quais objeções foram tratadas

Responda em formato JSON.`,
      messages: [{
        role: 'user',
        content: conversationText
      }]
    });

    let analysis;
    try {
      // Tenta extrair JSON da resposta
      const jsonMatch = summaryResponse.content[0].text.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        RESUMO: summaryResponse.content[0].text,
        ESTRATEGIA_VENCEDORA: 'unknown'
      };
    } catch {
      analysis = {
        RESUMO: summaryResponse.content[0].text,
        ESTRATEGIA_VENCEDORA: 'unknown'
      };
    }

    // Gera embedding
    const embedding = await generateEmbedding(conversationText);

    // Seleciona mensagens-chave (primeiras 2, últimas 3)
    const keyMessages = [
      ...messages.slice(0, 4),
      ...messages.slice(-6)
    ].filter(m => m.role === 'user' || m.role === 'assistant');

    return {
      summary: analysis.RESUMO || analysis.resumo,
      winningStrategy: analysis.ESTRATEGIA_VENCEDORA || analysis.estrategia_vencedora || 'unknown',
      keyMoment: analysis.MOMENTO_CHAVE || analysis.momento_chave,
      objectionsHandled: analysis.OBJECOES_SUPERADAS || analysis.objecoes_superadas,
      embedding,
      messagesSample: keyMessages,
      ...metadata
    };

  } catch (error) {
    logger.error('[Embeddings] Erro ao processar conversa:', error);
    throw error;
  }
}

// ============================================
// FUNÇÕES DE PERSISTÊNCIA
// ============================================

/**
 * Salva conversa bem-sucedida no banco para aprendizado
 */
export async function saveSuccessfulConversation(data) {
  if (!isSupabaseConfigured()) {
    logger.warn('[Embeddings] Supabase não configurado');
    return null;
  }

  try {
    const { error, data: result } = await supabase
      .from('successful_conversations')
      .insert({
        lead_id: data.leadId,
        conversation_summary: data.summary,
        customer_segment: data.customerSegment,
        vehicle_type: data.vehicleType,
        budget_range: data.budgetRange,
        winning_strategy: data.winningStrategy,
        messages_sample: data.messagesSample,
        embedding: data.embedding,
        conversion_type: data.conversionType,
        conversion_value: data.conversionValue,
        total_messages: data.totalMessages,
        conversation_date: data.conversationDate || new Date()
      })
      .select('id')
      .single();

    if (error) throw error;

    logger.info('[Embeddings] Conversa salva para aprendizado:', result.id);
    return result.id;

  } catch (error) {
    logger.error('[Embeddings] Erro ao salvar conversa:', error);
    throw error;
  }
}

/**
 * Busca conversas similares usando embedding
 */
export async function findSimilarConversations(embedding, filters = {}, limit = 5) {
  if (!isSupabaseConfigured() || !embedding) {
    return [];
  }

  try {
    const { data, error } = await supabase.rpc('find_similar_successful_conversations', {
      query_embedding: embedding,
      p_customer_segment: filters.customerSegment || null,
      p_vehicle_type: filters.vehicleType || null,
      p_budget_range: filters.budgetRange || null,
      p_limit: limit
    });

    if (error) throw error;

    return data || [];

  } catch (error) {
    logger.error('[Embeddings] Erro ao buscar conversas similares:', error);
    return [];
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  generateEmbedding,
  generateConversationEmbedding,
  processSuccessfulConversation,
  saveSuccessfulConversation,
  findSimilarConversations,
  config: EMBEDDINGS_CONFIG
};
