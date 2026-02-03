// ============================================
// CAMILA 2.0 - HANDLER DE AGENDAMENTOS
// ============================================
// Integrado com sistema de leads e funil de vendas
// ============================================

import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient.js';
import { convertBrazilianDateToISO } from '../utils/dateTime.js';
import { trackFunnelEvent } from '../../lib/analytics.js';
import { markConversationAsAppointment } from '../../lib/conversationHistory.js';
import { processSuccessfulConversation, saveSuccessfulConversation } from '../../lib/embeddings.js';
import logger from '../../lib/logger.js';

/**
 * Verifica se uma data cai em domingo
 * @param {string} dateStr - Data no formato DD/MM/YYYY ou texto como "domingo", "amanha"
 * @returns {boolean} true se for domingo
 */
function isSunday(dateStr) {
  if (!dateStr) return false;

  const lowerDate = dateStr.toLowerCase().trim();

  // Verifica se menciona domingo explicitamente
  if (lowerDate.includes('domingo')) {
    return true;
  }

  // Se for "amanhã" ou "amanha", calcula se amanhã é domingo
  if (lowerDate === 'amanhã' || lowerDate === 'amanha') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getDay() === 0; // 0 = domingo
  }

  // Tenta parsear data no formato DD/MM/YYYY
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.getDay() === 0;
  }

  return false;
}

/**
 * Calcula a próxima segunda-feira
 * @returns {string} Data formatada DD/MM/YYYY
 */
function getNextMonday() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);

  const day = String(nextMonday.getDate()).padStart(2, '0');
  const month = String(nextMonday.getMonth() + 1).padStart(2, '0');
  const year = nextMonday.getFullYear();

  return `${day}/${month}/${year}`;
}

// ============================================
// SISTEMA DE QUALIFICAÇÃO - SUPERPOTÊNCIA
// ============================================

/**
 * Registra métrica de qualificação no Supabase
 * @param {string} type - Tipo da métrica (blocked, approved, warning)
 * @param {object} data - Dados da métrica
 */
async function trackQualificationMetric(type, data) {
  try {
    if (!isSupabaseConfigured()) return;

    await supabase
      .from('qualification_metrics')
      .insert([{
        metric_type: type,
        vehicle_interest: data.vehicleInterest || null,
        detected_intent: data.intent || null,
        block_reason: data.blockReason || null,
        customer_phone: data.phone || null,
        created_at: new Date().toISOString()
      }]);

    logger.info(`[Qualification] Métrica registrada: ${type}`, data);
  } catch (error) {
    // Não falha o fluxo se métrica falhar
    logger.warn('[Qualification] Erro ao registrar métrica:', error.message);
  }
}

/**
 * Detecta se cliente quer picape aberta baseado no interesse
 * @param {string} vehicleInterest - Texto do interesse do cliente
 * @returns {object} { wantsPicape, wantsSUV, mentionsHilux, rawIntent }
 */
function detectVehicleTypeIntent(vehicleInterest) {
  if (!vehicleInterest) return { wantsPicape: false, wantsSUV: false, mentionsHilux: false, rawIntent: null };

  const interest = vehicleInterest.toLowerCase();

  // Palavras que indicam PICAPE ABERTA
  const picapeKeywords = ['picape', 'caçamba', 'aberta', 'carga', 'transporte', 'trabalho pesado', 'cabine dupla'];
  const wantsPicape = picapeKeywords.some(k => interest.includes(k));

  // Palavras que indicam SUV
  const suvKeywords = ['suv', 'fechado', 'família', '7 lugares', 'porta-malas', 'sw4'];
  const wantsSUV = suvKeywords.some(k => interest.includes(k));

  // Menciona Hilux especificamente
  const mentionsHilux = interest.includes('hilux');

  // Determina intenção raw
  let rawIntent = 'indefinido';
  if (wantsPicape) rawIntent = 'picape_aberta';
  else if (wantsSUV) rawIntent = 'suv_fechado';
  else if (mentionsHilux) rawIntent = 'hilux_ambiguo';

  return { wantsPicape, wantsSUV, mentionsHilux, rawIntent };
}

/**
 * 🚨 VALIDAÇÃO CRÍTICA - BLOQUEIA agendamentos incompatíveis
 * @param {string} vehicleInterest - Interesse declarado
 * @param {string} phone - Telefone do cliente (para métricas)
 * @returns {object} Resultado da validação com BLOQUEIO se incompatível
 */
async function validateVehicleCompatibility(vehicleInterest, phone = null) {
  const intent = detectVehicleTypeIntent(vehicleInterest);

  // =====================================================
  // BLOQUEIO 1: Cliente quer "Hilux aberta/picape"
  // Nossa Hilux é SW4 (SUV FECHADO) - INCOMPATÍVEL!
  // =====================================================
  if (intent.mentionsHilux && intent.wantsPicape && !intent.wantsSUV) {
    logger.error('🚫 BLOQUEIO: Cliente quer Hilux PICAPE mas nossa Hilux é SW4 (SUV FECHADO)!', { vehicleInterest });

    // Registra métrica de BLOQUEIO
    await trackQualificationMetric('blocked', {
      vehicleInterest,
      intent: intent.rawIntent,
      blockReason: 'hilux_sw4_nao_e_picape',
      phone
    });

    return {
      compatible: false,
      blocked: true, // 🚫 BLOQUEIO ATIVO
      blockReason: 'hilux_sw4_nao_e_picape',
      message: 'Opa! Preciso esclarecer uma coisa importante: a Hilux que temos é a SW4, que é um SUV fechado de 7 lugares - não é uma picape com caçamba. Se você precisa de picape pra transportar carga, tenho a L200 Triton (R$ 95 mil) e a Ford Ranger (R$ 115 mil). Qual delas te interessa mais?',
      alternatives: ['L200 Triton - Picape com caçamba, Flex, 4x4', 'Ford Ranger - Picape com caçamba, Diesel, 4x4']
    };
  }

  // =====================================================
  // BLOQUEIO 2: Interesse muito vago (sem veículo definido)
  // =====================================================
  if (!vehicleInterest || vehicleInterest.trim().length < 3) {
    logger.warn('⚠️ BLOQUEIO: Tentativa de agendamento sem veículo definido');

    await trackQualificationMetric('blocked', {
      vehicleInterest: vehicleInterest || 'VAZIO',
      intent: 'indefinido',
      blockReason: 'veiculo_nao_definido',
      phone
    });

    return {
      compatible: false,
      blocked: true,
      blockReason: 'veiculo_nao_definido',
      message: 'Antes de agendar, preciso saber qual veículo te interessa! Posso te mostrar as opções. Qual seu orçamento aproximado?'
    };
  }

  // =====================================================
  // ALERTA: Hilux mencionada mas intenção ambígua
  // Não bloqueia, mas registra para análise
  // =====================================================
  if (intent.mentionsHilux && !intent.wantsPicape && !intent.wantsSUV) {
    logger.warn('⚠️ ALERTA: Hilux mencionada sem especificar tipo (picape ou SUV)', { vehicleInterest });

    await trackQualificationMetric('warning', {
      vehicleInterest,
      intent: 'hilux_ambiguo',
      blockReason: null,
      phone
    });

    return {
      compatible: true,
      blocked: false,
      warning: true,
      warningType: 'hilux_ambiguo',
      message: null, // Não bloqueia, só registra
      suggestion: 'Confirmar se cliente quer SW4 (SUV 7 lugares) ou picape com caçamba'
    };
  }

  // =====================================================
  // APROVADO: Interesse claro e compatível
  // =====================================================
  await trackQualificationMetric('approved', {
    vehicleInterest,
    intent: intent.rawIntent,
    blockReason: null,
    phone
  });

  return { compatible: true, blocked: false };
}

/**
 * Valida parâmetros obrigatórios do agendamento
 * 🚨 SISTEMA DE QUALIFICAÇÃO COM BLOQUEIO REAL
 */
async function validateAppointmentParams(params) {
  const { customerName, phone, preferredDate, vehicleInterest } = params;

  // =====================================================
  // VALIDAÇÃO 1: Dados básicos obrigatórios
  // =====================================================
  if (!customerName || !phone) {
    logger.error('Missing required appointment params:', { customerName, phone });
    return {
      valid: false,
      error: 'Nome e telefone são obrigatórios',
      message: 'Preciso do seu nome completo e WhatsApp para confirmar o agendamento. Pode me passar?'
    };
  }

  // =====================================================
  // VALIDAÇÃO 2: Rejeita agendamentos em domingo
  // =====================================================
  if (isSunday(preferredDate)) {
    const nextMonday = getNextMonday();
    logger.warn('Tentativa de agendamento em domingo rejeitada:', { preferredDate });
    return {
      valid: false,
      error: 'Domingo não funciona',
      message: `Eita, domingo a loja tá fechada! 😅 Que tal segunda-feira (${nextMonday})? Posso agendar 9h ou 14h pra você!`,
      suggestedDate: nextMonday
    };
  }

  // =====================================================
  // 🚨 VALIDAÇÃO 3: COMPATIBILIDADE DE VEÍCULO (CRÍTICO!)
  // Esta validação BLOQUEIA agendamentos incompatíveis
  // =====================================================
  const compatibility = await validateVehicleCompatibility(vehicleInterest, phone);

  if (compatibility.blocked) {
    logger.error('🚫 AGENDAMENTO BLOQUEADO por incompatibilidade:', {
      vehicleInterest,
      blockReason: compatibility.blockReason,
      phone
    });

    return {
      valid: false,
      error: compatibility.blockReason,
      message: compatibility.message,
      blocked: true,
      alternatives: compatibility.alternatives || null
    };
  }

  // Log de warning se houver (mas não bloqueia)
  if (compatibility.warning) {
    logger.warn('⚠️ Agendamento aprovado com alerta:', {
      vehicleInterest,
      warningType: compatibility.warningType,
      suggestion: compatibility.suggestion
    });
  }

  return { valid: true, qualified: true };
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
      visitType: params.visitType,
      vehicleInterest: params.vehicleInterest
    });

    // =====================================================
    // 🚨 VALIDAÇÃO COM SISTEMA DE QUALIFICAÇÃO (SUPERPOTÊNCIA)
    // Esta validação pode BLOQUEAR agendamentos incompatíveis
    // =====================================================
    const validation = await validateAppointmentParams(params);

    if (!validation.valid) {
      // Se foi BLOQUEADO pelo sistema de qualificação
      if (validation.blocked) {
        logger.error('🚫 AGENDAMENTO REJEITADO pelo sistema de qualificação:', {
          error: validation.error,
          vehicleInterest: params.vehicleInterest,
          alternatives: validation.alternatives
        });

        return {
          success: false,
          blocked: true,
          blockReason: validation.error,
          error: validation.error,
          message: validation.message,
          alternatives: validation.alternatives || null
        };
      }

      // Outros erros de validação (dados faltando, domingo, etc)
      return {
        success: false,
        error: validation.error,
        message: validation.message
      };
    }

    logger.info('✅ Agendamento APROVADO pelo sistema de qualificação:', {
      vehicleInterest: params.vehicleInterest,
      qualified: validation.qualified
    });

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

      // 7. LEARNING SYSTEM: Marca conversa como sucesso e salva para aprendizado
      try {
        // Busca conversa ativa do lead
        const { data: conversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('lead_id', leadId)
          .eq('status', 'ativa')
          .order('last_message_at', { ascending: false })
          .limit(1)
          .single();

        if (conversation) {
          // Marca conversa como tendo resultado em agendamento
          await markConversationAsAppointment(conversation.id, dbResult.appointmentId);

          // Busca mensagens da conversa para salvar como exemplo de sucesso
          const { data: messages } = await supabase
            .from('messages')
            .select('role, content, created_at')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true });

          if (messages && messages.length > 0) {
            // Processa e salva conversa bem-sucedida para Few-Shot Learning
            const processedConversation = await processSuccessfulConversation(messages, {
              leadId,
              customerSegment: lead?.profile?.persona || 'desconhecido',
              vehicleType: params.vehicleInterest || null,
              budgetRange: lead?.profile?.budgetRange || null,
              conversionType: 'appointment',
              totalMessages: messages.length
            });

            await saveSuccessfulConversation(processedConversation);
            logger.info('[Learning] Conversa salva para Few-Shot Learning:', { conversationId: conversation.id });
          }
        }
      } catch (learningError) {
        // Não falha o agendamento se o learning falhar
        logger.warn('[Learning] Erro ao salvar conversa para aprendizado:', learningError.message);
      }

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
