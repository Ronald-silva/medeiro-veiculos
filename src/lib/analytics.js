// ============================================
// CAMILA 2.0 - SISTEMA DE ANALYTICS E METRICAS
// ============================================
// Tracking de conversao, performance e insights
// ============================================

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import logger from './logger.js';

// ============================================
// METRICAS DE CONVERSAO
// ============================================

/**
 * Registra evento do funil de vendas
 */
export async function trackFunnelEvent(leadId, eventType, metadata = {}) {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('funnel_events')
      .insert([{
        lead_id: leadId,
        event_type: eventType,
        context: metadata,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    logger.info(`Funnel event tracked: ${eventType} for lead ${leadId}`);
    return data;
  } catch (error) {
    logger.error('Error tracking funnel event:', error);
    return null;
  }
}

/**
 * Calcula metricas de conversao
 */
export async function getConversionMetrics(period = '30d') {
  if (!isSupabaseConfigured()) {
    return getDefaultMetrics();
  }

  try {
    const periodDate = getPeriodDate(period);

    // Busca metricas agregadas
    const { data: metrics } = await supabase
      .from('dashboard_metrics')
      .select('*')
      .single();

    // Busca leads por periodo
    const { data: leads } = await supabase
      .from('leads')
      .select('id, status, score, created_at')
      .gte('created_at', periodDate.toISOString());

    // Busca vendas por periodo
    const { data: sales } = await supabase
      .from('sales')
      .select('id, sale_price, created_at')
      .gte('created_at', periodDate.toISOString());

    // Busca agendamentos por periodo
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, status, created_at')
      .gte('created_at', periodDate.toISOString());

    // Calcula metricas
    const totalLeads = leads?.length || 0;
    const totalSales = sales?.length || 0;
    const totalAppointments = appointments?.length || 0;
    const attendedAppointments = appointments?.filter(a => a.status === 'compareceu').length || 0;

    const conversionRate = totalLeads > 0 ? (totalSales / totalLeads * 100).toFixed(2) : 0;
    const appointmentRate = totalLeads > 0 ? (totalAppointments / totalLeads * 100).toFixed(2) : 0;
    const showUpRate = totalAppointments > 0 ? (attendedAppointments / totalAppointments * 100).toFixed(2) : 0;

    const totalRevenue = sales?.reduce((sum, s) => sum + parseFloat(s.sale_price || 0), 0) || 0;
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    return {
      period,
      leads: {
        total: totalLeads,
        byStatus: countByStatus(leads || [])
      },
      sales: {
        total: totalSales,
        revenue: totalRevenue,
        avgTicket
      },
      appointments: {
        total: totalAppointments,
        attended: attendedAppointments,
        showUpRate: parseFloat(showUpRate)
      },
      rates: {
        conversion: parseFloat(conversionRate),
        appointment: parseFloat(appointmentRate),
        showUp: parseFloat(showUpRate)
      },
      comparison: await getComparisonMetrics(periodDate)
    };
  } catch (error) {
    logger.error('Error getting conversion metrics:', error);
    return getDefaultMetrics();
  }
}

/**
 * Busca metricas para comparacao (periodo anterior)
 */
async function getComparisonMetrics(currentPeriodStart) {
  try {
    const previousPeriodStart = new Date(currentPeriodStart);
    const periodDays = Math.ceil((new Date() - currentPeriodStart) / (1000 * 60 * 60 * 24));
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);

    const { data: previousLeads } = await supabase
      .from('leads')
      .select('id')
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', currentPeriodStart.toISOString());

    const { data: previousSales } = await supabase
      .from('sales')
      .select('id, sale_price')
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', currentPeriodStart.toISOString());

    return {
      previousLeads: previousLeads?.length || 0,
      previousSales: previousSales?.length || 0,
      previousRevenue: previousSales?.reduce((sum, s) => sum + parseFloat(s.sale_price || 0), 0) || 0
    };
  } catch (error) {
    return { previousLeads: 0, previousSales: 0, previousRevenue: 0 };
  }
}

// ============================================
// METRICAS DA IA (CAMILA)
// ============================================

/**
 * Registra metricas de uma conversa da Camila
 */
export async function trackConversationMetrics(data) {
  if (!isSupabaseConfigured()) return null;

  const {
    leadId,
    conversationId,
    messagesCount,
    toolsCalled,
    responseTimeAvg,
    sentiment,
    intent,
    outcome
  } = data;

  try {
    // Atualiza conversa
    if (conversationId) {
      await supabase
        .from('conversations')
        .update({
          messages_count: messagesCount,
          tools_called: toolsCalled,
          detected_intent: intent,
          sentiment,
          outcome,
          ended_at: new Date().toISOString()
        })
        .eq('id', conversationId);
    }

    // Atualiza lead
    if (leadId) {
      await supabase
        .from('leads')
        .update({
          messages_count: supabase.sql`messages_count + ${messagesCount}`,
          last_contact_at: new Date().toISOString(),
          response_time_avg: responseTimeAvg
        })
        .eq('id', leadId);
    }

    return true;
  } catch (error) {
    logger.error('Error tracking conversation metrics:', error);
    return false;
  }
}

/**
 * Busca performance da Camila
 */
export async function getCamilaPerformance(period = '30d') {
  if (!isSupabaseConfigured()) {
    return getDefaultCamilaMetrics();
  }

  try {
    const periodDate = getPeriodDate(period);

    // Conversas no periodo
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .gte('created_at', periodDate.toISOString());

    // Mensagens no periodo
    const { data: messages } = await supabase
      .from('messages')
      .select('role, created_at')
      .gte('created_at', periodDate.toISOString());

    // Insights gerados
    const { data: insights } = await supabase
      .from('ai_insights')
      .select('*')
      .gte('created_at', periodDate.toISOString());

    const totalConversations = conversations?.length || 0;
    const totalMessages = messages?.length || 0;
    const userMessages = messages?.filter(m => m.role === 'user').length || 0;
    const assistantMessages = messages?.filter(m => m.role === 'assistant').length || 0;

    const avgMessagesPerConversation = totalConversations > 0
      ? (totalMessages / totalConversations).toFixed(1)
      : 0;

    const toolCalls = conversations?.reduce((sum, c) => sum + (c.tools_called || 0), 0) || 0;

    // Analise de sentimento
    const sentimentCounts = {
      positive: conversations?.filter(c => c.sentiment === 'positivo').length || 0,
      neutral: conversations?.filter(c => c.sentiment === 'neutro').length || 0,
      negative: conversations?.filter(c => c.sentiment === 'negativo').length || 0
    };

    // Outcomes
    const outcomes = {
      agendamento: conversations?.filter(c => c.outcome === 'agendamento').length || 0,
      qualificado: conversations?.filter(c => c.outcome === 'lead_qualificado').length || 0,
      sem_interesse: conversations?.filter(c => c.outcome === 'sem_interesse').length || 0
    };

    return {
      period,
      conversations: {
        total: totalConversations,
        avgMessages: parseFloat(avgMessagesPerConversation)
      },
      messages: {
        total: totalMessages,
        fromUsers: userMessages,
        fromCamila: assistantMessages,
        toolCalls
      },
      sentiment: sentimentCounts,
      outcomes,
      insights: {
        total: insights?.length || 0,
        actioned: insights?.filter(i => i.is_actioned).length || 0
      }
    };
  } catch (error) {
    logger.error('Error getting Camila performance:', error);
    return getDefaultCamilaMetrics();
  }
}

// ============================================
// METRICAS DE VEICULOS
// ============================================

/**
 * Registra visualizacao de veiculo
 */
export async function trackVehicleView(vehicleId, source = 'chat') {
  if (!isSupabaseConfigured()) return;

  try {
    await supabase
      .from('vehicles')
      .update({
        views_count: supabase.sql`views_count + 1`
      })
      .eq('id', vehicleId);
  } catch (error) {
    logger.error('Error tracking vehicle view:', error);
  }
}

/**
 * Registra interesse em veiculo
 */
export async function trackVehicleInquiry(vehicleId, leadId) {
  if (!isSupabaseConfigured()) return;

  try {
    // Incrementa contador de interesse
    await supabase
      .from('vehicles')
      .update({
        inquiries_count: supabase.sql`inquiries_count + 1`
      })
      .eq('id', vehicleId);

    // Adiciona ao array de veiculos de interesse do lead
    if (leadId) {
      await supabase
        .from('leads')
        .update({
          interested_vehicles: supabase.sql`array_append(COALESCE(interested_vehicles, '{}'), ${vehicleId})`
        })
        .eq('id', leadId);
    }
  } catch (error) {
    logger.error('Error tracking vehicle inquiry:', error);
  }
}

/**
 * Busca veiculos mais populares
 */
export async function getPopularVehicles(limit = 10) {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data } = await supabase
      .from('vehicles')
      .select('id, name, brand, price, views_count, inquiries_count')
      .eq('status', 'available')
      .order('inquiries_count', { ascending: false })
      .limit(limit);

    return data || [];
  } catch (error) {
    logger.error('Error getting popular vehicles:', error);
    return [];
  }
}

// ============================================
// HELPERS
// ============================================

function getPeriodDate(period) {
  const now = new Date();
  const days = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '365d': 365
  };

  const daysToSubtract = days[period] || 30;
  now.setDate(now.getDate() - daysToSubtract);
  return now;
}

function countByStatus(leads) {
  return leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});
}

function getDefaultMetrics() {
  return {
    period: '30d',
    leads: { total: 0, byStatus: {} },
    sales: { total: 0, revenue: 0, avgTicket: 0 },
    appointments: { total: 0, attended: 0, showUpRate: 0 },
    rates: { conversion: 0, appointment: 0, showUp: 0 },
    comparison: { previousLeads: 0, previousSales: 0, previousRevenue: 0 }
  };
}

function getDefaultCamilaMetrics() {
  return {
    period: '30d',
    conversations: { total: 0, avgMessages: 0 },
    messages: { total: 0, fromUsers: 0, fromCamila: 0, toolCalls: 0 },
    sentiment: { positive: 0, neutral: 0, negative: 0 },
    outcomes: { agendamento: 0, qualificado: 0, sem_interesse: 0 },
    insights: { total: 0, actioned: 0 }
  };
}

// ============================================
// DASHBOARD DATA
// ============================================

/**
 * Busca todos os dados para o dashboard
 */
export async function getDashboardData() {
  const [
    conversionMetrics,
    camilaPerformance,
    popularVehicles
  ] = await Promise.all([
    getConversionMetrics('30d'),
    getCamilaPerformance('30d'),
    getPopularVehicles(5)
  ]);

  return {
    conversion: conversionMetrics,
    camila: camilaPerformance,
    vehicles: popularVehicles,
    lastUpdated: new Date().toISOString()
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  trackFunnelEvent,
  getConversionMetrics,
  trackConversationMetrics,
  getCamilaPerformance,
  trackVehicleView,
  trackVehicleInquiry,
  getPopularVehicles,
  getDashboardData
};
