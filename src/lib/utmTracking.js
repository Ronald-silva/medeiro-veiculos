// ============================================
// UTM TRACKING - Captura parâmetros da campanha
// ============================================
// Extrai UTM + fbclid da URL quando lead vem do Facebook Ads
// Armazena em sessionStorage para usar durante toda a sessão
// ============================================

/**
 * Extrai parâmetros UTM e click IDs da URL
 * @returns {object} Parâmetros capturados
 */
export function extractUTMParams() {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)

  return {
    utm_source: params.get('utm_source') || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null,
    utm_content: params.get('utm_content') || null,
    utm_term: params.get('utm_term') || null,
    fbclid: params.get('fbclid') || null,
    gclid: params.get('gclid') || null
  }
}

/**
 * Inicializa tracking de UTM
 * Deve ser chamado uma vez no carregamento da página
 */
export function initUTMTracking() {
  if (typeof window === 'undefined') return null

  const utm = extractUTMParams()
  const hasParams = Object.values(utm).some(v => v !== null)

  if (hasParams) {
    sessionStorage.setItem('utm_tracking', JSON.stringify(utm))
  }

  return utm
}

/**
 * Retorna os parâmetros UTM salvos na sessão
 * @returns {object} Parâmetros UTM ou objeto vazio
 */
export function getUTMParams() {
  if (typeof window === 'undefined') return {}

  try {
    const stored = sessionStorage.getItem('utm_tracking')
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Detecta veículo de interesse a partir de parâmetros de campanha
 * Lê ?vehicle= na URL ou infere via utm_campaign/utm_content
 * Exemplo de link: medeirosveiculos.online/?vehicle=hilux-sw4&utm_source=facebook
 * @returns {string|null} Nome do veículo ou null
 */
export function getCampaignVehicle() {
  if (typeof window === 'undefined') return null

  // Prioridade 1: parâmetro ?vehicle= na URL (mais explícito)
  const params = new URLSearchParams(window.location.search)
  const vehicleParam = params.get('vehicle')
  if (vehicleParam) {
    const vehicleNames = {
      'hilux-sw4': 'Hilux SW4',
      'hilux': 'Hilux',
      'hr-v': 'HR-V',
      'hrv': 'HR-V',
      'l200': 'L200 Triton',
      'pajero': 'Pajero Full',
      'ranger': 'Ranger',
      's10': 'S10',
      'tracker': 'Tracker',
      'compass': 'Compass',
      'creta': 'Creta'
    }
    return vehicleNames[vehicleParam.toLowerCase()] || vehicleParam
  }

  // Prioridade 2: infere pelo nome da campanha UTM
  const utm = getUTMParams()
  const campaign = (utm.utm_campaign || utm.utm_content || '').toLowerCase()
  if (campaign.includes('hilux') || campaign.includes('sw4')) return 'Hilux SW4'
  if (campaign.includes('hr-v') || campaign.includes('hrv')) return 'HR-V'
  if (campaign.includes('l200') || campaign.includes('triton')) return 'L200 Triton'
  if (campaign.includes('ranger')) return 'Ranger'
  if (campaign.includes('pajero')) return 'Pajero Full'

  return null
}

/**
 * Retorna dados de contexto para eventos do Facebook Pixel
 * Combina UTM + informações do veículo
 * @param {object} context - Contexto adicional (vehicle, category)
 * @returns {object} Dados formatados para fbq()
 */
export function getPixelEventData(context = {}) {
  const utm = getUTMParams()

  return {
    content_name: context.vehicle || context.contentName || 'Chat Geral',
    content_category: context.category || 'Lead',
    ...(utm.utm_source && { utm_source: utm.utm_source }),
    ...(utm.utm_campaign && { utm_campaign: utm.utm_campaign }),
    ...(utm.utm_content && { utm_content: utm.utm_content }),
    ...(utm.fbclid && { fbclid: utm.fbclid })
  }
}
