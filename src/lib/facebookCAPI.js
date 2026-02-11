// ============================================
// FACEBOOK CONVERSIONS API (CAPI)
// ============================================
// Envia eventos verificados server-side para o Facebook
// Complementa o Pixel (client-side) com dados server-side
// ============================================

import crypto from 'crypto'
import logger from './logger.js'

const PIXEL_ID = process.env.FACEBOOK_PIXEL_ID || '1917571072465777'
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN
const TEST_EVENT_CODE = process.env.FACEBOOK_TEST_EVENT_CODE // Apenas para testes
const GRAPH_API_VERSION = 'v21.0'

/**
 * Verifica se a CAPI está configurada
 */
export function isCAPIConfigured() {
  return Boolean(ACCESS_TOKEN && ACCESS_TOKEN !== 'your-facebook-access-token-here')
}

/**
 * Hash SHA256 para dados PII (obrigatório pelo Facebook)
 */
function hashSHA256(value) {
  if (!value) return undefined
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

/**
 * Normaliza telefone para formato E.164 sem +
 */
function normalizePhone(phone) {
  if (!phone) return undefined
  const cleaned = phone.replace(/\D/g, '')
  // Garante prefixo 55 (Brasil)
  const withCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`
  return hashSHA256(withCountry)
}

/**
 * Extrai primeiro e último nome
 */
function splitName(fullName) {
  if (!fullName) return { fn: undefined, ln: undefined }
  const parts = fullName.trim().split(/\s+/)
  return {
    fn: hashSHA256(parts[0]),
    ln: parts.length > 1 ? hashSHA256(parts[parts.length - 1]) : undefined
  }
}

/**
 * Envia evento para Facebook Conversions API
 *
 * @param {object} params
 * @param {string} params.eventName - Nome do evento (Lead, Purchase, Schedule, etc)
 * @param {string} params.eventId - ID único para deduplicação com Pixel
 * @param {object} params.userData - Dados do usuário (phone, email, name)
 * @param {object} params.customData - Dados customizados (value, currency, etc)
 * @param {string} params.sourceUrl - URL de origem do evento
 * @param {string} params.actionSource - Fonte da ação (website, phone_call, etc)
 */
export async function sendCAPIEvent({
  eventName,
  eventId,
  userData = {},
  customData = {},
  sourceUrl = 'https://medeirosveiculos.online',
  actionSource = 'website'
}) {
  if (!isCAPIConfigured()) {
    logger.debug('[CAPI] Facebook Access Token não configurado, pulando evento')
    return { success: false, reason: 'not_configured' }
  }

  try {
    const { fn, ln } = splitName(userData.name)

    const payload = {
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId || `${eventName}_${Date.now()}`,
        event_source_url: sourceUrl,
        action_source: actionSource,
        user_data: {
          em: userData.email ? hashSHA256(userData.email) : undefined,
          ph: normalizePhone(userData.phone),
          fn,
          ln,
          ct: hashSHA256('fortaleza'),
          st: hashSHA256('ce'),
          country: hashSHA256('br')
        },
        custom_data: {
          value: customData.value || undefined,
          currency: customData.value ? 'BRL' : undefined,
          content_name: customData.contentName || undefined,
          content_category: customData.contentCategory || undefined,
          content_ids: customData.contentIds || undefined,
          content_type: customData.contentType || 'product',
          lead_id: customData.leadId || undefined,
          lead_score: customData.leadScore || undefined,
          status: customData.status || undefined
        }
      }]
    }

    // Adiciona test_event_code apenas em modo de teste
    if (TEST_EVENT_CODE) {
      payload.test_event_code = TEST_EVENT_CODE
    }

    // Remove campos undefined
    const cleanPayload = JSON.parse(JSON.stringify(payload))

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload)
      }
    )

    const result = await response.json()

    if (response.ok) {
      logger.info(`[CAPI] Evento '${eventName}' enviado com sucesso`, {
        eventId: payload.data[0].event_id,
        eventsReceived: result.events_received
      })
      return { success: true, result }
    } else {
      logger.error(`[CAPI] Erro ao enviar evento '${eventName}':`, result)
      return { success: false, error: result }
    }
  } catch (error) {
    logger.error('[CAPI] Erro na requisição:', error.message)
    return { success: false, error: error.message }
  }
}

// ============================================
// EVENTOS ESPECÍFICOS DO FUNIL
// ============================================

/**
 * Evento: Lead Qualificado (score >= 70)
 * Mapeado para: Lead no Facebook Ads
 */
export async function trackLeadQualified({ leadId, name, phone, email, score, budget, vehicleType }) {
  return sendCAPIEvent({
    eventName: 'Lead',
    eventId: `lead_qualified_${leadId}_${Date.now()}`,
    userData: { name, phone, email },
    customData: {
      value: budget || undefined,
      contentName: vehicleType || 'Veículo',
      contentCategory: 'Lead Qualificado',
      leadId,
      leadScore: score,
      status: 'qualified'
    }
  })
}

/**
 * Evento: Agendamento de Visita
 * Mapeado para: Schedule no Facebook Ads
 */
export async function trackAppointmentScheduled({ leadId, name, phone, email, vehicleInterest, appointmentId }) {
  return sendCAPIEvent({
    eventName: 'Schedule',
    eventId: `appointment_${appointmentId || leadId}_${Date.now()}`,
    userData: { name, phone, email },
    customData: {
      contentName: vehicleInterest || 'Visita à loja',
      contentCategory: 'Agendamento',
      leadId,
      status: 'scheduled'
    }
  })
}

/**
 * Evento: Venda Concluída
 * Mapeado para: Purchase no Facebook Ads
 */
export async function trackPurchase({ leadId, name, phone, email, vehicleName, vehicleId, salePrice }) {
  return sendCAPIEvent({
    eventName: 'Purchase',
    eventId: `purchase_${leadId}_${Date.now()}`,
    userData: { name, phone, email },
    customData: {
      value: salePrice,
      contentName: vehicleName,
      contentCategory: 'Venda',
      contentIds: vehicleId ? [vehicleId] : undefined,
      contentType: 'product',
      leadId,
      status: 'purchased'
    }
  })
}
