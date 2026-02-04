/**
 * Behavioral Intelligence System
 *
 * Rastreia e analisa comportamento do usuário para detectar
 * padrões de intenção de compra em tempo real.
 *
 * Baseado em pesquisas de Harvard Business Review e Forrester
 * sobre predictive intent e behavioral fingerprinting.
 */

import { supabase } from './supabase'

// Pesos dos sinais comportamentais (calibrados para veículos)
const SIGNAL_WEIGHTS = {
  // Engajamento com página
  pageView: 1,
  vehicleView: 5,
  pricePageView: 10,
  financingPageView: 15,

  // Tempo de permanência
  dwellTime30s: 3,
  dwellTime60s: 5,
  dwellTime180s: 10,
  dwellTime300s: 15,

  // Padrões de retorno
  returnVisit24h: 20,
  returnSameVehicle: 25,
  multipleVehicleCompare: 15,

  // Interações
  chatInitiated: 10,
  chatEngaged5Messages: 15,
  chatEngaged10Messages: 20,
  priceAsked: 15,
  financingAsked: 20,
  visitAsked: 30,

  // Sinais de urgência
  offHoursVisit: 5,  // Noite/fim de semana = decisor pesquisando
  mobileToDesktop: 10, // Mudou de dispositivo = pesquisa séria
  rapidPageNavigation: -5, // Navegação muito rápida = apenas olhando

  // Sinais negativos
  bounceQuick: -10,
  noInteraction: -5
}

// Padrões de "fingerprint" de compradores quentes
const HOT_BUYER_PATTERNS = [
  {
    name: 'researcher_to_buyer',
    description: 'Pesquisador se tornando comprador',
    signals: ['vehicleView', 'returnVisit24h', 'returnSameVehicle', 'priceAsked'],
    minScore: 60,
    confidence: 0.85
  },
  {
    name: 'urgent_buyer',
    description: 'Comprador com urgência',
    signals: ['visitAsked', 'financingAsked', 'dwellTime180s'],
    minScore: 50,
    confidence: 0.90
  },
  {
    name: 'comparison_shopper',
    description: 'Comparando opções (próximo de decidir)',
    signals: ['multipleVehicleCompare', 'pricePageView', 'returnVisit24h'],
    minScore: 45,
    confidence: 0.75
  },
  {
    name: 'serious_researcher',
    description: 'Pesquisador sério',
    signals: ['dwellTime300s', 'offHoursVisit', 'mobileToDesktop'],
    minScore: 40,
    confidence: 0.70
  }
]

/**
 * Classe principal de Behavioral Intelligence
 */
export class BehavioralIntelligence {
  constructor(sessionId) {
    this.sessionId = sessionId
    this.signals = []
    this.startTime = Date.now()
    this.vehiclesViewed = new Set()
    this.pagesViewed = new Set()
    this.lastActivity = Date.now()
  }

  /**
   * Registra um sinal comportamental
   */
  trackSignal(signalType, metadata = {}) {
    const signal = {
      type: signalType,
      timestamp: Date.now(),
      weight: SIGNAL_WEIGHTS[signalType] || 0,
      metadata
    }

    this.signals.push(signal)
    this.lastActivity = Date.now()

    // Atualiza tracking específico
    if (signalType === 'vehicleView' && metadata.vehicleId) {
      this.vehiclesViewed.add(metadata.vehicleId)
    }
    if (metadata.page) {
      this.pagesViewed.add(metadata.page)
    }

    return signal
  }

  /**
   * Calcula o Intent Score atual
   */
  calculateIntentScore() {
    let score = 0
    const signalCounts = {}

    // Soma pesos dos sinais
    for (const signal of this.signals) {
      score += signal.weight
      signalCounts[signal.type] = (signalCounts[signal.type] || 0) + 1
    }

    // Bonus por padrões específicos
    if (this.vehiclesViewed.size > 1) {
      score += SIGNAL_WEIGHTS.multipleVehicleCompare
    }

    // Tempo total de sessão
    const sessionDuration = (Date.now() - this.startTime) / 1000
    if (sessionDuration > 300) score += SIGNAL_WEIGHTS.dwellTime300s
    else if (sessionDuration > 180) score += SIGNAL_WEIGHTS.dwellTime180s
    else if (sessionDuration > 60) score += SIGNAL_WEIGHTS.dwellTime60s
    else if (sessionDuration > 30) score += SIGNAL_WEIGHTS.dwellTime30s

    // Normaliza para 0-100
    score = Math.max(0, Math.min(100, score))

    return {
      score: Math.round(score),
      signals: signalCounts,
      sessionDuration,
      vehiclesViewed: this.vehiclesViewed.size,
      pagesViewed: this.pagesViewed.size
    }
  }

  /**
   * Detecta padrões de comprador quente
   */
  detectBuyerPattern() {
    const intentData = this.calculateIntentScore()
    const signalTypes = new Set(this.signals.map(s => s.type))

    for (const pattern of HOT_BUYER_PATTERNS) {
      const matchedSignals = pattern.signals.filter(s => signalTypes.has(s))
      const matchRatio = matchedSignals.length / pattern.signals.length

      if (matchRatio >= 0.6 && intentData.score >= pattern.minScore) {
        return {
          pattern: pattern.name,
          description: pattern.description,
          confidence: pattern.confidence * matchRatio,
          matchedSignals,
          intentScore: intentData.score
        }
      }
    }

    return null
  }

  /**
   * Gera fingerprint comportamental único
   */
  generateFingerprint() {
    const intentData = this.calculateIntentScore()
    const pattern = this.detectBuyerPattern()

    return {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      intentScore: intentData.score,
      pattern: pattern?.pattern || 'browsing',
      confidence: pattern?.confidence || 0,
      metrics: {
        sessionDuration: intentData.sessionDuration,
        vehiclesViewed: intentData.vehiclesViewed,
        pagesViewed: intentData.pagesViewed,
        totalSignals: this.signals.length
      },
      signals: intentData.signals,
      isHotLead: intentData.score >= 60,
      shouldTriggerProactive: this.shouldTriggerProactiveMessage()
    }
  }

  /**
   * Determina se deve disparar mensagem proativa
   */
  shouldTriggerProactiveMessage() {
    const fingerprint = this.calculateIntentScore()

    // Triggers para mensagem proativa
    const triggers = [
      // Score alto + tempo significativo
      fingerprint.score >= 50 && fingerprint.sessionDuration > 120,

      // Visualizou múltiplos veículos
      fingerprint.vehiclesViewed >= 3,

      // Retornou ao mesmo veículo
      this.signals.some(s => s.type === 'returnSameVehicle'),

      // Viu página de financiamento
      this.signals.some(s => s.type === 'financingPageView'),

      // Tempo longo em página específica
      fingerprint.sessionDuration > 300 && fingerprint.pagesViewed <= 3
    ]

    return triggers.some(t => t)
  }
}

/**
 * Analisa histórico de conversas para identificar padrões de sucesso
 */
export async function analyzeSuccessPatterns() {
  const { data: successfulConversations, error } = await supabase
    .from('successful_conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error || !successfulConversations?.length) {
    return { patterns: [], insights: [] }
  }

  // Agrupa por segmento de cliente
  const segmentPatterns = {}

  for (const conv of successfulConversations) {
    const segment = conv.customer_segment || 'unknown'
    if (!segmentPatterns[segment]) {
      segmentPatterns[segment] = {
        count: 0,
        strategies: {},
        avgMessages: 0,
        vehicleTypes: {}
      }
    }

    const sp = segmentPatterns[segment]
    sp.count++
    sp.avgMessages += conv.total_messages || 0

    if (conv.winning_strategy) {
      sp.strategies[conv.winning_strategy] = (sp.strategies[conv.winning_strategy] || 0) + 1
    }

    if (conv.vehicle_type) {
      sp.vehicleTypes[conv.vehicle_type] = (sp.vehicleTypes[conv.vehicle_type] || 0) + 1
    }
  }

  // Calcula médias e identifica melhores estratégias
  const insights = []

  for (const [segment, data] of Object.entries(segmentPatterns)) {
    data.avgMessages = Math.round(data.avgMessages / data.count)

    // Encontra estratégia mais efetiva
    const bestStrategy = Object.entries(data.strategies)
      .sort((a, b) => b[1] - a[1])[0]

    if (bestStrategy) {
      insights.push({
        segment,
        bestStrategy: bestStrategy[0],
        successCount: data.count,
        avgMessages: data.avgMessages,
        recommendation: `Para ${segment}, use ${bestStrategy[0]} (${bestStrategy[1]} sucessos)`
      })
    }
  }

  return {
    patterns: segmentPatterns,
    insights,
    totalAnalyzed: successfulConversations.length
  }
}

/**
 * Salva fingerprint no banco para análise posterior
 */
export async function saveBehavioralFingerprint(fingerprint, leadId = null) {
  const { data, error } = await supabase
    .from('behavioral_fingerprints')
    .insert({
      session_id: fingerprint.sessionId,
      lead_id: leadId,
      intent_score: fingerprint.intentScore,
      pattern: fingerprint.pattern,
      confidence: fingerprint.confidence,
      metrics: fingerprint.metrics,
      signals: fingerprint.signals,
      is_hot_lead: fingerprint.isHotLead,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao salvar fingerprint:', error)
    return null
  }

  return data
}

/**
 * Busca fingerprint de sessão existente
 */
export async function getSessionFingerprint(sessionId) {
  const { data, error } = await supabase
    .from('behavioral_fingerprints')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data
}

// Exporta singleton para uso no frontend
let currentSession = null

export function initBehavioralTracking(sessionId) {
  currentSession = new BehavioralIntelligence(sessionId)
  return currentSession
}

export function trackBehavior(signalType, metadata = {}) {
  if (!currentSession) return null
  return currentSession.trackSignal(signalType, metadata)
}

export function getBehavioralFingerprint() {
  if (!currentSession) return null
  return currentSession.generateFingerprint()
}

export default {
  BehavioralIntelligence,
  initBehavioralTracking,
  trackBehavior,
  getBehavioralFingerprint,
  analyzeSuccessPatterns,
  saveBehavioralFingerprint,
  SIGNAL_WEIGHTS,
  HOT_BUYER_PATTERNS
}
