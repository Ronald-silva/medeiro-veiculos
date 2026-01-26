// ============================================
// CAMILA 2.0 - SISTEMA DE MEMORIA INTELIGENTE
// ============================================
// Baseado em: Pinecone, GetStream, Langchain best practices
// Arquitetura: Hybrid Memory (Short-term Redis + Long-term Supabase)
// ============================================

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { saveConversation, getConversation, redis, isUpstashConfigured } from './upstash.js';
import logger from './logger.js';

// ============================================
// CONSTANTES E CONFIGURACOES
// ============================================

const MEMORY_CONFIG = {
  // Limites de mensagens
  MAX_SHORT_TERM_MESSAGES: 20,      // Ultimas 20 mensagens na sessao
  MAX_CONTEXT_MESSAGES: 10,         // Mensagens enviadas ao Claude
  SUMMARY_THRESHOLD: 15,            // Resumir apos 15 mensagens

  // TTLs (em segundos)
  SESSION_TTL: 24 * 60 * 60,        // 24 horas
  CONTEXT_TTL: 7 * 24 * 60 * 60,    // 7 dias

  // Chaves Redis
  KEYS: {
    SESSION: 'session',
    CONTEXT: 'context',
    PROFILE: 'profile',
    FACTS: 'facts'
  }
};

// ============================================
// CLASSE PRINCIPAL DE MEMORIA
// ============================================

class CamilaMemory {
  constructor(leadId, whatsapp) {
    this.leadId = leadId;
    this.whatsapp = whatsapp;
    this.sessionId = `${whatsapp}_${Date.now()}`;
  }

  // ============================================
  // MEMORIA DE CURTO PRAZO (Redis)
  // ============================================

  /**
   * Salva mensagem na sessao atual
   */
  async addMessage(role, content, metadata = {}) {
    try {
      const key = `${MEMORY_CONFIG.KEYS.SESSION}:${this.whatsapp}`;

      const message = {
        role,
        content,
        timestamp: Date.now(),
        ...metadata
      };

      // Busca mensagens existentes
      const existing = await this.getSessionMessages();
      existing.push(message);

      // Limita tamanho
      const limited = existing.slice(-MEMORY_CONFIG.MAX_SHORT_TERM_MESSAGES);

      // Salva no Redis/memoria
      await saveConversation(key, limited, MEMORY_CONFIG.SESSION_TTL);

      // Verifica se precisa resumir
      if (existing.length >= MEMORY_CONFIG.SUMMARY_THRESHOLD) {
        await this.summarizeAndStore(existing);
      }

      return message;
    } catch (error) {
      logger.error('Error adding message to memory:', error);
      return null;
    }
  }

  /**
   * Busca mensagens da sessao atual
   */
  async getSessionMessages() {
    try {
      const key = `${MEMORY_CONFIG.KEYS.SESSION}:${this.whatsapp}`;
      return await getConversation(key) || [];
    } catch (error) {
      logger.error('Error getting session messages:', error);
      return [];
    }
  }

  /**
   * Monta contexto otimizado para o Claude
   * Combina: ultimas mensagens + resumo + perfil + fatos
   */
  async getOptimizedContext() {
    try {
      const [
        sessionMessages,
        customerProfile,
        conversationSummary,
        keyFacts
      ] = await Promise.all([
        this.getSessionMessages(),
        this.getCustomerProfile(),
        this.getLastSummary(),
        this.getKeyFacts()
      ]);

      // Monta contexto estruturado
      const context = {
        // Informacoes do cliente (memoria longa)
        customer: customerProfile ? {
          name: customerProfile.name,
          persona: customerProfile.persona,
          budget: customerProfile.budget_max,
          preferences: customerProfile.preferred_vehicle_types,
          painPoints: customerProfile.pain_points,
          emotionalTriggers: customerProfile.emotional_triggers
        } : null,

        // Resumo de conversas anteriores
        previousContext: conversationSummary?.summary || null,

        // Fatos importantes memorizados
        keyFacts: keyFacts || {},

        // Ultimas mensagens (para contexto imediato)
        recentMessages: sessionMessages.slice(-MEMORY_CONFIG.MAX_CONTEXT_MESSAGES)
      };

      return context;
    } catch (error) {
      logger.error('Error building optimized context:', error);
      return { recentMessages: [] };
    }
  }

  // ============================================
  // MEMORIA DE LONGO PRAZO (Supabase)
  // ============================================

  /**
   * Busca ou cria perfil do cliente
   */
  async getCustomerProfile() {
    if (!isSupabaseConfigured()) return null;

    try {
      // Busca lead pelo WhatsApp
      const { data: lead } = await supabase
        .from('leads')
        .select(`
          *,
          customer_profiles (*)
        `)
        .eq('whatsapp', this.whatsapp)
        .single();

      if (lead) {
        this.leadId = lead.id;
        return {
          ...lead,
          profile: lead.customer_profiles?.[0] || null
        };
      }

      return null;
    } catch (error) {
      logger.error('Error getting customer profile:', error);
      return null;
    }
  }

  /**
   * Atualiza perfil do cliente com novos dados
   */
  async updateCustomerProfile(updates) {
    if (!isSupabaseConfigured() || !this.leadId) return false;

    try {
      // Atualiza lead
      if (updates.lead) {
        await supabase
          .from('leads')
          .update({
            ...updates.lead,
            last_contact_at: new Date().toISOString()
          })
          .eq('id', this.leadId);
      }

      // Atualiza perfil comportamental
      if (updates.profile) {
        await supabase
          .from('customer_profiles')
          .upsert({
            lead_id: this.leadId,
            ...updates.profile,
            updated_at: new Date().toISOString()
          }, { onConflict: 'lead_id' });
      }

      return true;
    } catch (error) {
      logger.error('Error updating customer profile:', error);
      return false;
    }
  }

  /**
   * Registra novo lead
   */
  async createLead(data) {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data: lead, error } = await supabase
        .from('leads')
        .insert([{
          whatsapp: this.whatsapp,
          name: data.name,
          source: data.source || 'whatsapp',
          status: 'novo',
          first_contact_at: new Date().toISOString(),
          last_contact_at: new Date().toISOString(),
          ...data
        }])
        .select()
        .single();

      if (error) throw error;

      this.leadId = lead.id;
      return lead;
    } catch (error) {
      // Se ja existe, busca
      if (error.code === '23505') {
        return await this.getCustomerProfile();
      }
      logger.error('Error creating lead:', error);
      return null;
    }
  }

  // ============================================
  // SUMARIZACAO DE CONVERSAS
  // ============================================

  /**
   * Resume conversa e salva no banco
   */
  async summarizeAndStore(messages) {
    if (!isSupabaseConfigured() || !this.leadId) return;

    try {
      // Extrai fatos importantes das mensagens
      const facts = this.extractFacts(messages);

      // Gera resumo simples (pode ser melhorado com IA)
      const summary = this.generateSimpleSummary(messages, facts);

      // Salva no Supabase
      await supabase
        .from('conversation_summaries')
        .insert([{
          lead_id: this.leadId,
          conversation_id: null, // Sera preenchido se tiver conversa ativa
          summary: summary.text,
          key_points: summary.keyPoints,
          facts_learned: facts,
          overall_sentiment: summary.sentiment,
          created_at: new Date().toISOString()
        }]);

      // Atualiza perfil com novos fatos
      await this.updateProfileFromFacts(facts);

      logger.info(`Conversation summarized for lead ${this.leadId}`);
    } catch (error) {
      logger.error('Error summarizing conversation:', error);
    }
  }

  /**
   * Extrai fatos importantes das mensagens
   */
  extractFacts(messages) {
    const facts = {
      orcamento: null,
      entrada: null,
      tipo_veiculo: null,
      uso: null,
      familia: null,
      urgencia: null,
      objecoes: [],
      veiculos_interesse: []
    };

    const userMessages = messages.filter(m => m.role === 'user');
    const allText = userMessages.map(m => m.content).join(' ').toLowerCase();

    // Extrai orcamento
    const budgetMatch = allText.match(/(\d+)\s*(mil|k)/i);
    if (budgetMatch) {
      facts.orcamento = parseInt(budgetMatch[1]) * 1000;
    }

    // Extrai entrada
    const entradaMatch = allText.match(/entrada.*?(\d+)\s*(mil|k)/i) ||
                         allText.match(/dar.*?(\d+)\s*(mil|k)/i);
    if (entradaMatch) {
      facts.entrada = parseInt(entradaMatch[1]) * 1000;
    }

    // Extrai tipo de veiculo
    const tipos = ['suv', 'sedan', 'hatch', 'picape', 'pickup', 'moto'];
    for (const tipo of tipos) {
      if (allText.includes(tipo)) {
        facts.tipo_veiculo = tipo.toUpperCase();
        break;
      }
    }

    // Extrai uso
    if (allText.includes('familia') || allText.includes('filhos')) {
      facts.uso = 'familia';
    } else if (allText.includes('trabalho')) {
      facts.uso = 'trabalho';
    } else if (allText.includes('lazer') || allText.includes('viagem')) {
      facts.uso = 'lazer';
    }

    // Extrai urgencia
    if (allText.includes('urgente') || allText.includes('agora') || allText.includes('hoje')) {
      facts.urgencia = 'imediato';
    } else if (allText.includes('semana')) {
      facts.urgencia = '1_semana';
    } else if (allText.includes('mes')) {
      facts.urgencia = '1_mes';
    }

    // Detecta objecoes
    if (allText.includes('caro') || allText.includes('muito')) {
      facts.objecoes.push('preco');
    }
    if (allText.includes('pensar') || allText.includes('depois')) {
      facts.objecoes.push('tempo');
    }
    if (allText.includes('esposa') || allText.includes('marido') || allText.includes('familia')) {
      facts.objecoes.push('decisor');
    }

    return facts;
  }

  /**
   * Gera resumo simples da conversa
   */
  generateSimpleSummary(messages, facts) {
    const userMsgCount = messages.filter(m => m.role === 'user').length;
    const assistantMsgCount = messages.filter(m => m.role === 'assistant').length;

    let sentiment = 'neutro';
    const lastUserMsgs = messages.filter(m => m.role === 'user').slice(-3);
    const lastText = lastUserMsgs.map(m => m.content).join(' ').toLowerCase();

    if (lastText.includes('sim') || lastText.includes('bora') || lastText.includes('quero')) {
      sentiment = 'positivo';
    } else if (lastText.includes('nao') || lastText.includes('depois') || lastText.includes('caro')) {
      sentiment = 'negativo';
    }

    const keyPoints = [];
    if (facts.orcamento) keyPoints.push(`Orcamento: R$ ${facts.orcamento.toLocaleString('pt-BR')}`);
    if (facts.entrada) keyPoints.push(`Entrada: R$ ${facts.entrada.toLocaleString('pt-BR')}`);
    if (facts.tipo_veiculo) keyPoints.push(`Interesse: ${facts.tipo_veiculo}`);
    if (facts.urgencia) keyPoints.push(`Urgencia: ${facts.urgencia}`);
    if (facts.objecoes.length) keyPoints.push(`Objecoes: ${facts.objecoes.join(', ')}`);

    return {
      text: `Conversa com ${userMsgCount} mensagens do cliente. ${keyPoints.join('. ')}`,
      keyPoints,
      sentiment
    };
  }

  /**
   * Atualiza perfil com fatos extraidos
   */
  async updateProfileFromFacts(facts) {
    const updates = { lead: {}, profile: {} };

    if (facts.orcamento) {
      updates.lead.budget_max = facts.orcamento;
    }
    if (facts.entrada) {
      updates.lead.down_payment = facts.entrada;
    }
    if (facts.tipo_veiculo) {
      updates.lead.vehicle_type_interest = facts.tipo_veiculo;
    }
    if (facts.uso) {
      updates.lead.usage_type = facts.uso;
    }
    if (facts.urgencia) {
      updates.lead.urgency_level = facts.urgencia;
    }
    if (facts.objecoes.length) {
      updates.lead.objections = facts.objecoes;
    }

    if (Object.keys(updates.lead).length > 0) {
      await this.updateCustomerProfile(updates);
    }
  }

  /**
   * Busca ultimo resumo da conversa
   */
  async getLastSummary() {
    if (!isSupabaseConfigured() || !this.leadId) return null;

    try {
      const { data } = await supabase
        .from('conversation_summaries')
        .select('*')
        .eq('lead_id', this.leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return data;
    } catch (error) {
      return null;
    }
  }

  // ============================================
  // FATOS CHAVE (Key Facts)
  // ============================================

  /**
   * Salva fato importante
   */
  async saveKeyFact(key, value) {
    try {
      const factsKey = `${MEMORY_CONFIG.KEYS.FACTS}:${this.whatsapp}`;

      if (redis) {
        const existing = await redis.get(factsKey) || {};
        existing[key] = value;
        await redis.setex(factsKey, MEMORY_CONFIG.CONTEXT_TTL, JSON.stringify(existing));
      }

      // Tambem salva no Supabase se disponivel
      if (isSupabaseConfigured() && this.leadId) {
        await supabase
          .from('customer_profiles')
          .upsert({
            lead_id: this.leadId,
            key_memories: supabase.sql`array_append(COALESCE(key_memories, '{}'), ${`${key}: ${value}`})`
          }, { onConflict: 'lead_id' });
      }

      return true;
    } catch (error) {
      logger.error('Error saving key fact:', error);
      return false;
    }
  }

  /**
   * Busca fatos importantes
   */
  async getKeyFacts() {
    try {
      const factsKey = `${MEMORY_CONFIG.KEYS.FACTS}:${this.whatsapp}`;

      if (redis) {
        const facts = await redis.get(factsKey);
        return facts ? (typeof facts === 'string' ? JSON.parse(facts) : facts) : {};
      }

      return {};
    } catch (error) {
      logger.error('Error getting key facts:', error);
      return {};
    }
  }

  // ============================================
  // DETECCAO DE INTENCAO E SENTIMENTO
  // ============================================

  /**
   * Analisa ultima mensagem e detecta intencao
   */
  analyzeIntent(message) {
    const text = message.toLowerCase();

    // Intencoes de compra (alto valor)
    if (text.match(/quero|preciso|procuro|busco|tem|me mostra/)) {
      return { intent: 'buying', confidence: 0.8 };
    }

    // Intencoes de agendamento
    if (text.match(/visitar|ir a[ií]|test.?drive|ver pessoalmente|horario/)) {
      return { intent: 'scheduling', confidence: 0.9 };
    }

    // Intencoes de negociacao
    if (text.match(/desconto|negociar|melhor pre[çc]o|parcela|financ/)) {
      return { intent: 'negotiating', confidence: 0.85 };
    }

    // Objecoes
    if (text.match(/caro|muito|n[aã]o sei|vou pensar|depois/)) {
      return { intent: 'objection', confidence: 0.7 };
    }

    // Informacao
    if (text.match(/quanto|qual|como|onde|quando/)) {
      return { intent: 'information', confidence: 0.75 };
    }

    // Saudacao
    if (text.match(/^(oi|ol[aá]|bom dia|boa tarde|boa noite|opa|e a[ií])/)) {
      return { intent: 'greeting', confidence: 0.95 };
    }

    return { intent: 'unknown', confidence: 0.5 };
  }

  /**
   * Detecta sentimento da mensagem
   */
  analyzeSentiment(message) {
    const text = message.toLowerCase();

    const positiveWords = ['sim', 'quero', 'gostei', 'bom', 'otimo', 'perfeito', 'bora', 'fechado', 'legal', 'top'];
    const negativeWords = ['nao', 'caro', 'ruim', 'depois', 'pensar', 'complicado', 'dificil'];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of positiveWords) {
      if (text.includes(word)) positiveCount++;
    }
    for (const word of negativeWords) {
      if (text.includes(word)) negativeCount++;
    }

    if (positiveCount > negativeCount) {
      return { sentiment: 'positive', score: 0.7 + (positiveCount * 0.1) };
    } else if (negativeCount > positiveCount) {
      return { sentiment: 'negative', score: 0.7 + (negativeCount * 0.1) };
    }

    return { sentiment: 'neutral', score: 0.5 };
  }

  // ============================================
  // REGISTRO DE ATIVIDADES
  // ============================================

  /**
   * Registra atividade do lead
   */
  async logActivity(type, description, metadata = {}) {
    if (!isSupabaseConfigured() || !this.leadId) return;

    try {
      await supabase
        .from('lead_activities')
        .insert([{
          lead_id: this.leadId,
          activity_type: type,
          description,
          metadata,
          performed_by: 'camila',
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      logger.error('Error logging activity:', error);
    }
  }

  /**
   * Registra insight da IA
   */
  async logInsight(type, insight, suggestedAction = null, priority = 'media') {
    if (!isSupabaseConfigured() || !this.leadId) return;

    try {
      await supabase
        .from('ai_insights')
        .insert([{
          lead_id: this.leadId,
          insight_type: type,
          insight,
          suggested_action: suggestedAction,
          action_priority: priority,
          confidence: 0.8,
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      logger.error('Error logging insight:', error);
    }
  }

  // ============================================
  // ATUALIZACAO DE SCORE
  // ============================================

  /**
   * Recalcula score do lead baseado em interacoes
   */
  async updateLeadScore() {
    if (!isSupabaseConfigured() || !this.leadId) return;

    try {
      const profile = await this.getCustomerProfile();
      if (!profile) return;

      let score = 0;

      // Budget (0-30 pontos)
      if (profile.budget_max) {
        if (profile.budget_max >= 100000) score += 30;
        else if (profile.budget_max >= 70000) score += 25;
        else if (profile.budget_max >= 50000) score += 20;
        else if (profile.budget_max >= 30000) score += 15;
        else score += 10;
      }

      // Urgencia (0-25 pontos)
      if (profile.urgency_level === 'imediato') score += 25;
      else if (profile.urgency_level === '1_semana') score += 20;
      else if (profile.urgency_level === '1_mes') score += 10;

      // Decisor (0-25 pontos)
      if (profile.is_decision_maker) score += 25;
      else score += 10;

      // Engajamento (0-20 pontos)
      if (profile.messages_count >= 20) score += 20;
      else if (profile.messages_count >= 10) score += 15;
      else if (profile.messages_count >= 5) score += 10;
      else score += 5;

      // Atualiza score
      await supabase
        .from('leads')
        .update({
          score,
          conversion_probability: Math.min(score, 100)
        })
        .eq('id', this.leadId);

      return score;
    } catch (error) {
      logger.error('Error updating lead score:', error);
      return 0;
    }
  }
}

// ============================================
// FUNCOES HELPER
// ============================================

/**
 * Cria instancia de memoria para um cliente
 */
export function createMemory(whatsapp, leadId = null) {
  return new CamilaMemory(leadId, whatsapp);
}

/**
 * Formata contexto para incluir no system prompt
 */
export function formatContextForPrompt(context) {
  let contextText = '';

  if (context.customer) {
    contextText += `\n📋 PERFIL DO CLIENTE:`;
    if (context.customer.name) contextText += `\n- Nome: ${context.customer.name}`;
    if (context.customer.persona && context.customer.persona !== 'desconhecido') {
      contextText += `\n- Perfil: ${context.customer.persona}`;
    }
    if (context.customer.budget) {
      contextText += `\n- Orcamento: R$ ${context.customer.budget.toLocaleString('pt-BR')}`;
    }
    if (context.customer.preferences?.length) {
      contextText += `\n- Preferencias: ${context.customer.preferences.join(', ')}`;
    }
    if (context.customer.painPoints?.length) {
      contextText += `\n- Dores identificadas: ${context.customer.painPoints.join(', ')}`;
    }
  }

  if (context.previousContext) {
    contextText += `\n\n📝 CONTEXTO ANTERIOR:\n${context.previousContext}`;
  }

  if (context.keyFacts && Object.keys(context.keyFacts).length > 0) {
    contextText += `\n\n🔑 FATOS IMPORTANTES:`;
    for (const [key, value] of Object.entries(context.keyFacts)) {
      contextText += `\n- ${key}: ${value}`;
    }
  }

  return contextText;
}

/**
 * Converte mensagens do formato interno para formato Claude
 */
export function convertToClaudeFormat(messages) {
  return messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role,
      content: m.content
    }));
}

// ============================================
// EXPORTS
// ============================================

export {
  CamilaMemory,
  MEMORY_CONFIG
};

export default {
  createMemory,
  formatContextForPrompt,
  convertToClaudeFormat,
  CamilaMemory,
  MEMORY_CONFIG
};
