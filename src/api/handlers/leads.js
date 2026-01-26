// ============================================
// CAMILA 2.0 - HANDLER DE LEADS
// ============================================
// Integrado com novo schema e sistema de funil
// ============================================

import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient.js';
import { calculateLeadScore } from '../../agent/scoring/calculator.js';
import { trackFunnelEvent } from '../../lib/analytics.js';
import logger from '../../lib/logger.js';

/**
 * Valida parâmetros obrigatórios do lead
 */
function validateLeadParams(leadData) {
  const { nome, whatsapp, orcamento } = leadData;

  if (!nome || !whatsapp || !orcamento) {
    logger.error('Missing required lead params:', {
      nome: !!nome,
      whatsapp: !!whatsapp,
      orcamento: !!orcamento
    });

    return {
      valid: false,
      error: 'Nome, WhatsApp e orçamento são obrigatórios',
      message: 'Preciso do seu nome, WhatsApp e orçamento para seguir. Pode me passar essas informações?'
    };
  }

  return { valid: true };
}

/**
 * Parse orçamento para número
 */
function parseOrcamento(orcamento) {
  if (typeof orcamento === 'number') return orcamento;

  const text = String(orcamento).toLowerCase();
  const match = text.match(/(\d+)/);
  if (match) {
    let value = parseInt(match[1]);
    if (text.includes('mil') || text.includes('k') || value < 1000) {
      value *= 1000;
    }
    return value;
  }
  return 50000; // default
}

/**
 * Determina temperatura do lead baseado no score
 */
function getTemperature(score) {
  if (score >= 90) return 'muito_quente';
  if (score >= 70) return 'quente';
  if (score >= 40) return 'morno';
  return 'frio';
}

/**
 * Prepara dados do lead para o NOVO schema
 */
function prepareLeadData(leadData, score) {
  const budget = parseOrcamento(leadData.orcamento);

  return {
    name: leadData.nome,
    whatsapp: leadData.whatsapp.replace(/\D/g, ''), // Apenas números
    email: leadData.email || null,

    // BANT
    budget_max: budget,
    budget_text: leadData.orcamento,
    has_trade_in: leadData.temTroca || false,
    trade_in_vehicle: leadData.veiculoTroca || null,
    is_decision_maker: true, // Assume que é decisor até confirmar

    // Necessidade
    vehicle_type_interest: leadData.tipoCarro || null,
    usage_type: leadData.uso || null,

    // Timeline
    urgency_level: leadData.urgencia || 'pesquisando',

    // Score e status
    score: score,
    temperature: getTemperature(score),
    status: score >= 70 ? 'qualificado' : 'em_conversa',

    // Origem
    source: 'whatsapp',

    // Datas
    first_contact_at: new Date().toISOString(),
    last_contact_at: new Date().toISOString(),

    // Notas
    ai_notes: leadData.observacoes || null
  };
}

/**
 * Salva lead no Supabase (NOVO SCHEMA)
 */
async function saveToSupabase(leadData) {
  try {
    if (!isSupabaseConfigured()) {
      logger.debug('Supabase not configured, skipping database save');
      return { success: false, reason: 'not_configured' };
    }

    // Verifica se já existe lead com esse WhatsApp
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, score, status')
      .eq('whatsapp', leadData.whatsapp)
      .single();

    if (existingLead) {
      // Atualiza lead existente
      const { data, error } = await supabase
        .from('leads')
        .update({
          ...leadData,
          score: Math.max(existingLead.score, leadData.score), // Mantém maior score
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id)
        .select()
        .single();

      if (error) throw error;

      logger.info(`Lead updated: ${leadData.name} (ID: ${data.id})`);
      return { success: true, leadId: data.id, data, isUpdate: true };
    }

    // Cria novo lead
    const { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (error) throw error;

    logger.info(`Lead created: ${leadData.name} (ID: ${data.id})`);
    return { success: true, leadId: data.id, data, isUpdate: false };

  } catch (error) {
    logger.error('Error saving lead to Supabase:', error);
    return { success: false, reason: 'exception', error: error.message };
  }
}

/**
 * Registra atividade de qualificação do lead
 */
async function logQualificationActivity(leadId, score, leadData) {
  if (!isSupabaseConfigured() || !leadId) return;

  try {
    await supabase
      .from('lead_activities')
      .insert([{
        lead_id: leadId,
        activity_type: 'lead_qualified',
        description: `Lead qualificado com score ${score}. Orçamento: R$ ${parseOrcamento(leadData.orcamento).toLocaleString('pt-BR')}`,
        metadata: {
          score,
          budget: parseOrcamento(leadData.orcamento),
          vehicle_type: leadData.tipoCarro,
          urgency: leadData.urgencia
        },
        performed_by: 'camila',
        score_change: score
      }]);
  } catch (error) {
    logger.error('Error logging qualification activity:', error);
  }
}

/**
 * Salva lead qualificado no sistema
 * INTEGRADO com novo schema e sistema de funil
 *
 * @param {object} leadData - Dados do lead
 * @param {string} leadData.nome - Nome completo
 * @param {string} leadData.whatsapp - WhatsApp
 * @param {string} leadData.email - Email (opcional)
 * @param {string} leadData.orcamento - Orçamento
 * @param {string} leadData.tipoCarro - Tipo de carro desejado
 * @param {string} leadData.formaPagamento - Forma de pagamento
 * @param {string} leadData.urgencia - Urgência (imediato, 1_semana, 1_mes, pesquisando)
 * @param {boolean} leadData.temTroca - Tem carro para troca
 * @param {string} leadData.veiculoTroca - Descrição do veículo de troca
 * @param {string} leadData.observacoes - Observações adicionais
 * @returns {Promise<object>} Resultado do salvamento
 */
export async function saveLead(leadData) {
  try {
    logger.debug('Saving lead:', {
      nome: leadData.nome,
      whatsapp: leadData.whatsapp,
      orcamento: leadData.orcamento
    });

    // Validação de parâmetros obrigatórios
    const validation = validateLeadParams(leadData);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        message: validation.message
      };
    }

    // Calcula score de qualificação
    const score = calculateLeadScore(leadData);
    const temperature = getTemperature(score);
    logger.debug(`Lead score: ${score} (${temperature})`);

    // Prepara dados do lead para NOVO schema
    const lead = prepareLeadData(leadData, score);

    logger.info(`Saving lead: ${leadData.nome} (Score: ${score}, Temp: ${temperature})`);

    // Salva no Supabase
    const dbResult = await saveToSupabase(lead);

    if (dbResult.success) {
      const leadId = dbResult.leadId;

      // Registra atividade de qualificação
      await logQualificationActivity(leadId, score, leadData);

      // Registra evento no funil
      const eventType = dbResult.isUpdate ? 'lead_updated' : 'lead_qualified';
      await trackFunnelEvent(leadId, eventType, {
        score,
        temperature,
        budget: parseOrcamento(leadData.orcamento)
      });

      // Mensagem baseada no score
      let message;
      if (score >= 70) {
        message = `Perfeito! Voce tem um otimo perfil. Vamos agendar sua visita?`;
      } else if (score >= 40) {
        message = `Anotado! Tenho algumas opcoes que podem te interessar.`;
      } else {
        message = `Entendi! Vou te mostrar o que temos disponivel.`;
      }

      return {
        success: true,
        leadId,
        score,
        temperature,
        message
      };
    }

    // Fallback se Supabase não estiver disponível
    logger.info(`Lead logged (Supabase unavailable): ${leadData.nome} (Score: ${score})`);

    return {
      success: true,
      score,
      temperature,
      message: 'Dados anotados!'
    };
  } catch (error) {
    logger.error('Error in saveLead:', error);

    return {
      success: true,
      score: 50,
      temperature: 'morno',
      message: 'Dados anotados!'
    };
  }
}

/**
 * Busca lead por WhatsApp
 * @param {string} whatsapp - WhatsApp do lead
 * @returns {Promise<object>} Resultado da busca
 */
export async function getLeadByWhatsApp(whatsapp) {
  try {
    logger.debug('Fetching lead by WhatsApp:', whatsapp);

    if (!isSupabaseConfigured()) {
      logger.debug('Supabase not configured');
      return {
        success: false,
        error: 'Database not available',
        lead: null
      };
    }

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('whatsapp', whatsapp)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      logger.error('Error fetching lead:', error);
      return {
        success: false,
        error: error.message,
        lead: null
      };
    }

    const lead = leads?.[0] || null;

    if (lead) {
      logger.info(`Found lead for ${whatsapp}`);
    } else {
      logger.debug(`No lead found for ${whatsapp}`);
    }

    return {
      success: true,
      lead
    };
  } catch (error) {
    logger.error('Error in getLeadByWhatsApp:', error);

    return {
      success: false,
      error: error.message,
      lead: null
    };
  }
}

/**
 * Atualiza score de um lead
 * @param {string} leadId - ID do lead
 * @param {object} updateData - Dados para atualizar (calcula novo score automaticamente)
 * @returns {Promise<object>} Resultado da atualização
 */
export async function updateLeadScore(leadId, updateData) {
  try {
    logger.debug('Updating lead score:', leadId);

    if (!isSupabaseConfigured()) {
      logger.debug('Supabase not configured');
      return {
        success: false,
        error: 'Database not available'
      };
    }

    // Busca lead atual
    const { data: currentLead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchError || !currentLead) {
      logger.error('Error fetching current lead:', fetchError);
      return {
        success: false,
        error: 'Lead não encontrado'
      };
    }

    // Merge dados e recalcula score
    const updatedLeadData = { ...currentLead, ...updateData };
    const newScore = calculateLeadScore(updatedLeadData);

    logger.debug(`New score calculated: ${newScore}`);

    // Atualiza no Supabase
    const { data, error } = await supabase
      .from('leads')
      .update({
        ...updateData,
        score: newScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select();

    if (error) {
      logger.error('Error updating lead:', error);
      return {
        success: false,
        error: error.message
      };
    }

    logger.info(`Lead ${leadId} score updated to ${newScore}`);

    return {
      success: true,
      lead: data?.[0] || null,
      score: newScore
    };
  } catch (error) {
    logger.error('Error in updateLeadScore:', error);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Lista todos os leads com filtros opcionais
 * @param {object} filters - Filtros (status, urgencia, score_min, etc)
 * @returns {Promise<object>} Resultado da busca
 */
export async function listLeads(filters = {}) {
  try {
    logger.debug('Listing leads with filters:', filters);

    if (!isSupabaseConfigured()) {
      logger.debug('Supabase not configured');
      return {
        success: false,
        error: 'Database not available',
        leads: []
      };
    }

    let query = supabase.from('leads').select('*');

    // Aplica filtros
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.urgencia) {
      query = query.eq('urgencia', filters.urgencia);
    }
    if (filters.score_min) {
      query = query.gte('score', filters.score_min);
    }
    if (filters.score_max) {
      query = query.lte('score', filters.score_max);
    }

    // Ordena por score e data
    query = query.order('score', { ascending: false })
                 .order('created_at', { ascending: false });

    const { data: leads, error } = await query;

    if (error) {
      logger.error('Error listing leads:', error);
      return {
        success: false,
        error: error.message,
        leads: []
      };
    }

    logger.info(`Found ${leads.length} lead(s)`);

    return {
      success: true,
      leads: leads || []
    };
  } catch (error) {
    logger.error('Error in listLeads:', error);

    return {
      success: false,
      error: error.message,
      leads: []
    };
  }
}
