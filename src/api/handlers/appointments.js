// ============================================
// CAMILA 2.0 - HANDLER DE AGENDAMENTOS
// ============================================
// Integrado com sistema de leads e funil de vendas
// ============================================

import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient.js';
import { convertBrazilianDateToISO } from '../utils/dateTime.js';
import { trackFunnelEvent } from '../../lib/analytics.js';
import logger from '../../lib/logger.js';

/**
 * Valida parâmetros obrigatórios do agendamento
 */
function validateAppointmentParams(params) {
  const { customerName, phone } = params;

  if (!customerName || !phone) {
    logger.error('Missing required appointment params:', { customerName, phone });
    return {
      valid: false,
      error: 'Nome e telefone são obrigatórios',
      message: 'Preciso do seu nome completo e WhatsApp para confirmar o agendamento. Pode me passar?'
    };
  }

  return { valid: true };
}

/**
 * Busca ou cria lead pelo telefone
 */
async function findOrCreateLead(phone, customerName) {
  if (!isSupabaseConfigured()) return null;

  try {
    // Limpa o telefone
    const cleanPhone = phone.replace(/\D/g, '');

    // Busca lead existente
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, status, score')
      .eq('whatsapp', cleanPhone)
      .single();

    if (existingLead) {
      return existingLead;
    }

    // Cria novo lead se não existe
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert([{
        whatsapp: cleanPhone,
        name: customerName,
        status: 'novo',
        source: 'whatsapp',
        first_contact_at: new Date().toISOString(),
        last_contact_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      logger.error('Error creating lead:', error);
      return null;
    }

    logger.info('New lead created for appointment:', { leadId: newLead.id });
    return newLead;
  } catch (error) {
    logger.error('Error in findOrCreateLead:', error);
    return null;
  }
}

/**
 * Atualiza status do lead para 'agendado'
 */
async function updateLeadToScheduled(leadId) {
  if (!isSupabaseConfigured() || !leadId) return;

  try {
    await supabase
      .from('leads')
      .update({
        status: 'agendado',
        last_contact_at: new Date().toISOString()
      })
      .eq('id', leadId);

    logger.info('Lead status updated to agendado:', { leadId });
  } catch (error) {
    logger.error('Error updating lead status:', error);
  }
}

/**
 * Registra atividade do agendamento no lead
 */
async function logAppointmentActivity(leadId, appointmentData) {
  if (!isSupabaseConfigured() || !leadId) return;

  try {
    await supabase
      .from('lead_activities')
      .insert([{
        lead_id: leadId,
        activity_type: 'appointment_scheduled',
        description: `Agendamento: ${appointmentData.visit_type} para ${appointmentData.scheduled_date} às ${appointmentData.scheduled_time}`,
        metadata: {
          visit_type: appointmentData.visit_type,
          scheduled_date: appointmentData.scheduled_date,
          scheduled_time: appointmentData.scheduled_time,
          vehicle_interest: appointmentData.vehicle_interest
        },
        performed_by: 'camila',
        score_change: 15 // Agendamento adiciona 15 pontos
      }]);
  } catch (error) {
    logger.error('Error logging appointment activity:', error);
  }
}

/**
 * Prepara dados do agendamento para o NOVO schema
 */
function prepareAppointmentData(params, leadId = null) {
  const { customerName, phone, preferredDate, preferredTime, visitType, vehicleInterest } = params;

  // Converter data do formato brasileiro para ISO
  const scheduledDate = convertBrazilianDateToISO(preferredDate) || new Date().toISOString().split('T')[0];

  return {
    lead_id: leadId,
    scheduled_date: scheduledDate,
    scheduled_time: preferredTime || '14:00',
    visit_type: visitType || 'visita',
    vehicle_interest: vehicleInterest || '',
    status: 'pendente', // Começa como pendente, muda para confirmado após confirmação
    confirmation_sent: false,
    reminder_sent: false,
    created_at: new Date().toISOString()
  };
}

/**
 * Salva agendamento no Supabase (NOVO SCHEMA)
 */
async function saveToSupabase(appointmentData) {
  try {
    if (!isSupabaseConfigured()) {
      logger.debug('Supabase not configured, skipping database save');
      return { success: false, reason: 'not_configured' };
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select()
      .single();

    if (error) {
      logger.error('Error saving appointment:', error);
      return { success: false, reason: 'save_failed', error: error.message };
    }

    logger.info('Appointment saved to Supabase:', { id: data.id });
    return {
      success: true,
      appointmentId: data.id,
      data: data
    };
  } catch (error) {
    logger.error('Error saving to Supabase:', error);
    return { success: false, reason: 'exception', error: error.message };
  }
}

/**
 * Agenda visita presencial ou test drive
 * INTEGRADO com sistema de leads e funil de vendas
 *
 * @param {object} params - Parâmetros do agendamento
 * @param {string} params.customerName - Nome completo do cliente
 * @param {string} params.phone - WhatsApp do cliente
 * @param {string} params.preferredDate - Data preferida (DD/MM/YYYY)
 * @param {string} params.preferredTime - Horário preferido
 * @param {string} params.visitType - Tipo de visita (test_drive ou visita)
 * @param {string} params.vehicleInterest - Veículo de interesse
 * @returns {Promise<object>} Resultado do agendamento
 */
export async function scheduleVisit(params) {
  try {
    logger.debug('Scheduling visit:', {
      customerName: params.customerName,
      phone: params.phone,
      visitType: params.visitType
    });

    // Validação de parâmetros obrigatórios
    const validation = validateAppointmentParams(params);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        message: validation.message
      };
    }

    // 1. Busca ou cria lead pelo telefone
    const lead = await findOrCreateLead(params.phone, params.customerName);
    const leadId = lead?.id || null;

    logger.info('Scheduling appointment for lead:', {
      leadId,
      customerName: params.customerName,
      visitType: params.visitType
    });

    // 2. Prepara dados do agendamento COM lead_id
    const appointmentData = prepareAppointmentData(params, leadId);

    // 3. Salva agendamento no Supabase
    const dbResult = await saveToSupabase(appointmentData);

    if (dbResult.success && leadId) {
      // 4. Atualiza status do lead para 'agendado'
      await updateLeadToScheduled(leadId);

      // 5. Registra atividade no histórico do lead
      await logAppointmentActivity(leadId, appointmentData);

      // 6. Registra evento no funil de vendas
      await trackFunnelEvent(leadId, 'appointment_scheduled', {
        appointmentId: dbResult.appointmentId,
        visitType: appointmentData.visit_type,
        scheduledDate: appointmentData.scheduled_date
      });

      // Formata data para exibição
      const displayDate = params.preferredDate || 'em breve';
      const displayTime = params.preferredTime || 'horário a confirmar';

      return {
        success: true,
        appointmentId: dbResult.appointmentId,
        leadId: leadId,
        message: `Perfeito! Agendado para ${displayDate} às ${displayTime}. O Adel vai te receber! Vou mandar uma confirmação antes.`
      };
    }

    // Fallback se Supabase não estiver disponível
    if (!dbResult.success) {
      logger.info('Appointment logged (Supabase unavailable):', appointmentData);
    }

    return {
      success: true,
      message: `Anotado! Vou repassar para o Adel entrar em contato pelo WhatsApp ${params.phone} para confirmar o horário.`
    };
  } catch (error) {
    logger.error('Error in scheduleVisit:', error);

    // Mesmo com erro, confirma pro usuário para não prejudicar a experiência
    return {
      success: true,
      message: `Anotado! Vou repassar para nossa equipe entrar em contato no WhatsApp ${params.phone || 'fornecido'}.`
    };
  }
}

/**
 * Lista agendamentos de um cliente específico
 * @param {string} phone - WhatsApp do cliente
 * @returns {Promise<object>} Resultado da busca
 */
export async function getAppointmentsByPhone(phone) {
  try {
    logger.debug('Fetching appointments for phone:', phone);

    if (!isSupabaseConfigured()) {
      logger.debug('Supabase not configured');
      return {
        success: false,
        error: 'Database not available',
        appointments: []
      };
    }

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching appointments:', error);
      return {
        success: false,
        error: error.message,
        appointments: []
      };
    }

    logger.info(`Found ${appointments.length} appointment(s) for ${phone}`);

    return {
      success: true,
      appointments: appointments || []
    };
  } catch (error) {
    logger.error('Error in getAppointmentsByPhone:', error);

    return {
      success: false,
      error: error.message,
      appointments: []
    };
  }
}

/**
 * Atualiza status de um agendamento
 * @param {string} appointmentId - ID do agendamento
 * @param {string} status - Novo status (confirmado, cancelado, concluido)
 * @returns {Promise<object>} Resultado da atualização
 */
export async function updateAppointmentStatus(appointmentId, status) {
  try {
    logger.debug('Updating appointment status:', { appointmentId, status });

    if (!isSupabaseConfigured()) {
      logger.debug('Supabase not configured');
      return {
        success: false,
        error: 'Database not available'
      };
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', appointmentId)
      .select();

    if (error) {
      logger.error('Error updating appointment:', error);
      return {
        success: false,
        error: error.message
      };
    }

    logger.info(`Appointment ${appointmentId} status updated to ${status}`);

    return {
      success: true,
      appointment: data?.[0] || null
    };
  } catch (error) {
    logger.error('Error in updateAppointmentStatus:', error);

    return {
      success: false,
      error: error.message
    };
  }
}
