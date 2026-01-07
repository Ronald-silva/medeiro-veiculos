import { isSupabaseConfigured, saveAppointment as saveAppointmentToSupabase } from '../../lib/supabaseClient.js';
import { convertBrazilianDateToISO } from '../utils/dateTime.js';
import logger from '../../lib/logger.js';

/**
 * Valida parâmetros obrigatórios do agendamento
 * @param {object} params - Parâmetros do agendamento
 * @returns {object} Resultado da validação { valid: boolean, error?: string, message?: string }
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
 * Prepara dados do agendamento
 * @param {object} params - Parâmetros brutos do agendamento
 * @returns {object} Dados formatados para salvar
 */
function prepareAppointmentData(params) {
  const { customerName, phone, preferredDate, preferredTime, visitType, vehicleInterest } = params;

  // Converter data do formato brasileiro para ISO se fornecida
  const scheduledDate = convertBrazilianDateToISO(preferredDate);

  return {
    customer_name: customerName,
    phone: phone,
    scheduled_date: scheduledDate,
    scheduled_time: preferredTime || 'a confirmar',
    visit_type: visitType || 'visit',
    vehicle_interest: vehicleInterest || '',
    status: 'confirmado',
    created_at: new Date().toISOString()
  };
}

/**
 * Salva agendamento no Supabase
 * @param {object} appointmentData - Dados do agendamento
 * @returns {Promise<object>} Resultado do salvamento
 */
async function saveToSupabase(appointmentData) {
  try {
    if (!isSupabaseConfigured()) {
      logger.debug('Supabase not configured, skipping database save');
      return { success: false, reason: 'not_configured' };
    }

    const result = await saveAppointmentToSupabase(appointmentData);

    if (result.success) {
      logger.info('Appointment saved to Supabase:', result.data.id);
      return {
        success: true,
        appointmentId: result.data.id,
        data: result.data
      };
    }

    logger.warn('Failed to save appointment to Supabase:', result.error);
    return { success: false, reason: 'save_failed', error: result.error };
  } catch (error) {
    logger.error('Error saving to Supabase:', error);
    return { success: false, reason: 'exception', error: error.message };
  }
}

/**
 * Agenda visita presencial ou test drive
 * @param {object} params - Parâmetros do agendamento
 * @param {string} params.customerName - Nome completo do cliente
 * @param {string} params.phone - WhatsApp do cliente
 * @param {string} params.preferredDate - Data preferida (DD/MM/YYYY)
 * @param {string} params.preferredTime - Horário preferido
 * @param {string} params.visitType - Tipo de visita (test_drive ou visit)
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

    // Prepara dados do agendamento
    const appointmentData = prepareAppointmentData(params);

    logger.info('Scheduling appointment:', {
      customer: appointmentData.customer_name,
      phone: appointmentData.phone,
      type: appointmentData.visit_type
    });

    // Tenta salvar no Supabase
    const dbResult = await saveToSupabase(appointmentData);

    if (dbResult.success) {
      return {
        success: true,
        appointmentId: dbResult.appointmentId,
        message: `Agendamento confirmado! Em breve entraremos em contato via WhatsApp (${params.phone}).`
      };
    }

    // Fallback se Supabase não estiver disponível
    logger.info('Appointment logged (Supabase unavailable):', appointmentData);

    return {
      success: true,
      message: `Anotado! Vou repassar para nossa equipe entrar em contato no WhatsApp ${params.phone}.`
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
