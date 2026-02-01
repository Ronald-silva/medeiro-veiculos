// ============================================
// SISTEMA DE HISTÓRICO DE CONVERSAS
// ============================================
// Persiste todas as mensagens no Supabase para
// análise de performance e histórico completo
// ============================================

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import logger from './logger.js';

/**
 * Busca ou cria uma conversa ativa para o WhatsApp
 * @param {string} whatsapp - Número do WhatsApp
 * @param {string} leadId - ID do lead (opcional)
 * @returns {Promise<string|null>} ID da conversa
 */
export async function getOrCreateConversation(whatsapp, leadId = null) {
  if (!isSupabaseConfigured()) {
    logger.debug('Supabase not configured, skipping conversation history');
    return null;
  }

  try {
    // Limpa o número
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');

    // Busca conversa ativa recente (últimas 24h)
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('id, last_message_at')
      .eq('whatsapp', cleanWhatsapp)
      .eq('status', 'ativa')
      .order('last_message_at', { ascending: false })
      .limit(1)
      .single();

    if (existingConversation) {
      // Verifica se a última mensagem foi há menos de 24h
      const lastMessageAt = new Date(existingConversation.last_message_at);
      const hoursSinceLastMessage = (Date.now() - lastMessageAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastMessage < 24) {
        return existingConversation.id;
      }

      // Encerra conversa anterior
      await supabase
        .from('conversations')
        .update({ status: 'encerrada', ended_at: new Date().toISOString() })
        .eq('id', existingConversation.id);
    }

    // Cria nova conversa
    const { data: newConversation, error } = await supabase
      .from('conversations')
      .insert([{
        whatsapp: cleanWhatsapp,
        lead_id: leadId,
        channel: 'whatsapp',
        status: 'ativa',
        started_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      logger.error('Error creating conversation:', error);
      return null;
    }

    logger.info('New conversation created:', { id: newConversation.id, whatsapp: cleanWhatsapp });
    return newConversation.id;
  } catch (error) {
    logger.error('Error in getOrCreateConversation:', error);
    return null;
  }
}

/**
 * Salva uma mensagem no histórico
 * @param {Object} params - Parâmetros da mensagem
 * @param {string} params.conversationId - ID da conversa
 * @param {string} params.role - 'user' ou 'assistant'
 * @param {string} params.content - Conteúdo da mensagem
 * @param {string} params.leadId - ID do lead (opcional)
 * @param {number} params.responseTimeMs - Tempo de resposta em ms (opcional)
 * @param {string} params.toolName - Nome da tool usada (opcional)
 * @param {Object} params.toolInput - Input da tool (opcional)
 * @param {Object} params.toolOutput - Output da tool (opcional)
 * @returns {Promise<string|null>} ID da mensagem
 */
export async function saveMessage({
  conversationId,
  role,
  content,
  leadId = null,
  responseTimeMs = null,
  toolName = null,
  toolInput = null,
  toolOutput = null
}) {
  if (!isSupabaseConfigured() || !conversationId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        conversation_id: conversationId,
        lead_id: leadId,
        role,
        content,
        response_time_ms: responseTimeMs,
        tool_name: toolName,
        tool_input: toolInput,
        tool_output: toolOutput,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      logger.error('Error saving message:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    logger.error('Error in saveMessage:', error);
    return null;
  }
}

/**
 * Atualiza informações da conversa (resultado, sentimento, etc)
 * @param {string} conversationId - ID da conversa
 * @param {Object} updates - Campos a atualizar
 */
export async function updateConversation(conversationId, updates) {
  if (!isSupabaseConfigured() || !conversationId) return;

  try {
    await supabase
      .from('conversations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);
  } catch (error) {
    logger.error('Error updating conversation:', error);
  }
}

/**
 * Marca conversa como tendo resultado em agendamento
 * @param {string} conversationId - ID da conversa
 * @param {string} appointmentId - ID do agendamento
 */
export async function markConversationAsAppointment(conversationId, appointmentId) {
  await updateConversation(conversationId, {
    resulted_in_appointment: true,
    appointment_id: appointmentId
  });
}

/**
 * Busca conversas recentes para o CRM
 * @param {Object} filters - Filtros opcionais
 * @param {number} filters.limit - Limite de resultados
 * @param {string} filters.status - Status da conversa
 * @param {boolean} filters.withAppointment - Apenas com agendamento
 * @returns {Promise<Array>} Lista de conversas
 */
export async function getRecentConversations({
  limit = 20,
  status = null,
  withAppointment = null,
  startDate = null,
  endDate = null
} = {}) {
  if (!isSupabaseConfigured()) return [];

  try {
    let query = supabase
      .from('conversations')
      .select(`
        id,
        whatsapp,
        channel,
        status,
        messages_count,
        user_messages_count,
        assistant_messages_count,
        resulted_in_appointment,
        resulted_in_sale,
        overall_sentiment,
        vehicle_interest,
        started_at,
        last_message_at,
        ended_at,
        leads (
          id,
          name,
          score
        )
      `)
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (withAppointment !== null) {
      query = query.eq('resulted_in_appointment', withAppointment);
    }

    if (startDate) {
      query = query.gte('started_at', startDate);
    }

    if (endDate) {
      query = query.lte('started_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching conversations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error in getRecentConversations:', error);
    return [];
  }
}

/**
 * Busca mensagens de uma conversa específica
 * @param {string} conversationId - ID da conversa
 * @returns {Promise<Array>} Lista de mensagens
 */
export async function getConversationMessages(conversationId) {
  if (!isSupabaseConfigured() || !conversationId) return [];

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching messages:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error in getConversationMessages:', error);
    return [];
  }
}

/**
 * Busca estatísticas de conversas para o dashboard
 * @param {string} startDate - Data inicial (ISO)
 * @param {string} endDate - Data final (ISO)
 * @returns {Promise<Object>} Estatísticas
 */
export async function getConversationStats(startDate = null, endDate = null) {
  if (!isSupabaseConfigured()) return null;

  try {
    // Define período padrão (últimos 7 dias)
    if (!startDate) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString();
    }
    if (!endDate) {
      endDate = new Date().toISOString();
    }

    // Total de conversas
    const { count: totalConversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', startDate)
      .lte('started_at', endDate);

    // Conversas com agendamento
    const { count: withAppointment } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', startDate)
      .lte('started_at', endDate)
      .eq('resulted_in_appointment', true);

    // Total de mensagens
    const { count: totalMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // Média de mensagens por conversa
    const avgMessages = totalConversations > 0
      ? Math.round(totalMessages / totalConversations)
      : 0;

    // Taxa de conversão
    const conversionRate = totalConversations > 0
      ? Math.round((withAppointment / totalConversations) * 100)
      : 0;

    return {
      totalConversations: totalConversations || 0,
      withAppointment: withAppointment || 0,
      totalMessages: totalMessages || 0,
      avgMessagesPerConversation: avgMessages,
      conversionRate,
      period: { startDate, endDate }
    };
  } catch (error) {
    logger.error('Error in getConversationStats:', error);
    return null;
  }
}

export default {
  getOrCreateConversation,
  saveMessage,
  updateConversation,
  markConversationAsAppointment,
  getRecentConversations,
  getConversationMessages,
  getConversationStats
};
