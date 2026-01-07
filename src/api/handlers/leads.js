import { isSupabaseConfigured, saveLead as saveLeadToSupabase } from '@lib/supabaseClient.js';
import { calculateLeadScore } from '@agent/scoring/calculator.js';
import logger from '@lib/logger.js';

/**
 * Valida parâmetros obrigatórios do lead
 * @param {object} leadData - Dados do lead
 * @returns {object} Resultado da validação { valid: boolean, error?: string, message?: string }
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
 * Prepara dados do lead para salvamento
 * @param {object} leadData - Dados brutos do lead
 * @param {number} score - Score calculado
 * @returns {object} Dados formatados para salvar
 */
function prepareLeadData(leadData, score) {
  return {
    conversation_id: leadData.conversationId || crypto.randomUUID(),
    nome: leadData.nome,
    whatsapp: leadData.whatsapp,
    email: leadData.email || null,
    orcamento: leadData.orcamento,
    tipo_carro: leadData.tipoCarro || '',
    forma_pagamento: leadData.formaPagamento || '',
    urgencia: leadData.urgencia || 'media',
    tem_troca: leadData.temTroca || false,
    veiculos_interesse: leadData.veiculosInteresse || [],
    observacoes: leadData.observacoes || '',
    score: score,
    status: 'novo',
    created_at: new Date().toISOString()
  };
}

/**
 * Salva lead no Supabase
 * @param {object} leadData - Dados do lead
 * @returns {Promise<object>} Resultado do salvamento
 */
async function saveToSupabase(leadData) {
  try {
    if (!isSupabaseConfigured()) {
      logger.debug('Supabase not configured, skipping database save');
      return { success: false, reason: 'not_configured' };
    }

    const result = await saveLeadToSupabase(leadData);

    if (result.success) {
      logger.info(`Lead saved to Supabase: ${leadData.nome} (ID: ${result.data.id})`);
      return {
        success: true,
        leadId: result.data.id,
        data: result.data
      };
    }

    logger.warn('Failed to save lead to Supabase:', result.error);
    return { success: false, reason: 'save_failed', error: result.error };
  } catch (error) {
    logger.error('Error saving lead to Supabase:', error);
    return { success: false, reason: 'exception', error: error.message };
  }
}

/**
 * Salva lead qualificado no sistema
 * @param {object} leadData - Dados do lead
 * @param {string} leadData.nome - Nome completo
 * @param {string} leadData.whatsapp - WhatsApp
 * @param {string} leadData.email - Email (opcional)
 * @param {string} leadData.orcamento - Orçamento
 * @param {string} leadData.tipoCarro - Tipo de carro desejado
 * @param {string} leadData.formaPagamento - Forma de pagamento (à vista, financiamento, etc)
 * @param {string} leadData.urgencia - Urgência da compra (alta, media, baixa)
 * @param {boolean} leadData.temTroca - Tem carro para troca
 * @param {Array<string>} leadData.veiculosInteresse - Veículos de interesse
 * @param {string} leadData.observacoes - Observações adicionais
 * @param {string} leadData.conversationId - ID da conversa
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
    logger.debug(`Lead score calculated: ${score}`);

    // Prepara dados do lead
    const lead = prepareLeadData(leadData, score);

    logger.info(`Saving lead: ${leadData.nome} (Score: ${score})`);

    // Tenta salvar no Supabase
    const dbResult = await saveToSupabase(lead);

    if (dbResult.success) {
      return {
        success: true,
        leadId: dbResult.leadId,
        score,
        message: 'Lead salvo com sucesso!'
      };
    }

    // Fallback se Supabase não estiver disponível
    logger.info(`Lead logged (Supabase unavailable): ${leadData.nome} (Score: ${score})`);

    return {
      success: true,
      score,
      message: 'Dados anotados!'
    };
  } catch (error) {
    logger.error('Error in saveLead:', error);

    // Mesmo com erro, confirma pro usuário para não prejudicar a experiência
    return {
      success: true,
      score: 50,
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
