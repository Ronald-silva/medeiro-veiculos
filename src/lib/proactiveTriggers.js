/**
 * Proactive Trigger System
 *
 * Sistema que permite a Camila iniciar conversas proativamente
 * quando detecta padrões de alta intenção de compra.
 *
 * Speed-to-Lead: Empresas que respondem em <1h têm 7x mais
 * chance de qualificar o lead (Harvard Business Review)
 */

import { getBehavioralFingerprint } from './behavioralIntelligence'
import { calculatePredictiveIntent } from './predictiveIntent'
import { supabase } from './supabase'

// Configuração de triggers
const TRIGGER_CONFIG = {
  // Cooldown entre triggers (evita spam)
  cooldownMinutes: 30,

  // Delay antes de mostrar mensagem (não parecer robótico)
  minDelaySeconds: 3,
  maxDelaySeconds: 8,

  // Hora de funcionamento para triggers
  businessHoursStart: 8,
  businessHoursEnd: 20,

  // Ativar/desativar tipos de trigger
  enabledTriggers: {
    highIntent: true,
    returnVisitor: true,
    vehicleInterest: true,
    abandonedBrowsing: true,
    pricePageDwell: true
  }
}

// Definição dos triggers
const TRIGGERS = [
  {
    id: 'high_intent_score',
    name: 'Intent Score Alto',
    description: 'Lead com score preditivo >= 60',
    priority: 1,
    condition: (context) => {
      const intent = calculatePredictiveIntent(context)
      return intent.score >= 60
    },
    messages: [
      'Oi! Vi que você está olhando nossos veículos. 😊 Posso te ajudar a encontrar o carro ideal?',
      'Olá! Notei seu interesse em nossos seminovos. Quer que eu te mostre algumas opções especiais?',
      'Oi! Temos ótimas condições essa semana. Posso te ajudar com alguma dúvida?'
    ],
    cooldownMinutes: 60
  },

  {
    id: 'return_visitor_vehicle',
    name: 'Retornou ao Mesmo Veículo',
    description: 'Visitante voltou a ver o mesmo veículo',
    priority: 2,
    condition: (context) => {
      return context.behavioral?.signals?.returnSameVehicle ||
        (context.vehicleViewCount?.[context.currentVehicleId] || 0) >= 2
    },
    messages: [
      'Oi! Vi que você voltou a olhar esse {vehicleName}. É um ótimo carro! Posso tirar alguma dúvida?',
      'Olá! Esse {vehicleName} está chamando sua atenção, né? Posso te contar mais sobre ele!',
      'Oi! O {vehicleName} realmente é uma excelente escolha. Quer agendar um test-drive?'
    ],
    cooldownMinutes: 120
  },

  {
    id: 'multiple_vehicles_compared',
    name: 'Comparando Veículos',
    description: 'Visitante viu 3+ veículos',
    priority: 3,
    condition: (context) => {
      return (context.behavioral?.vehiclesViewed || 0) >= 3
    },
    messages: [
      'Oi! Vi que você está comparando algumas opções. Posso te ajudar a escolher o melhor pra você?',
      'Olá! Está em dúvida entre alguns modelos? Me conta o que você precisa que eu te ajudo!',
      'Oi! Temos bastante variedade mesmo. 😄 Quer que eu te dê uma dica baseada no seu perfil?'
    ],
    cooldownMinutes: 45
  },

  {
    id: 'price_page_dwell',
    name: 'Tempo em Página de Preço',
    description: 'Passou mais de 2 minutos em página com preço',
    priority: 4,
    condition: (context) => {
      return context.pageType === 'vehicle_detail' &&
        (context.dwellTimeSeconds || 0) >= 120
    },
    messages: [
      'Oi! Vi que você está analisando esse veículo com atenção. Posso te passar mais detalhes?',
      'Olá! Esse modelo tem ótimo custo-benefício. Quer que eu te mostre as condições de financiamento?',
      'Oi! Está gostando desse carro? Posso te contar sobre a procedência e garantia dele!'
    ],
    cooldownMinutes: 30
  },

  {
    id: 'financing_page_view',
    name: 'Viu Página de Financiamento',
    description: 'Visitante acessou informações de financiamento',
    priority: 2,
    condition: (context) => {
      return context.pageType === 'financing' ||
        context.behavioral?.signals?.financingPageView
    },
    messages: [
      'Oi! Vi que você está interessado em financiamento. Temos condições especiais essa semana! Quer uma simulação?',
      'Olá! Trabalhamos com os melhores bancos do mercado. Posso fazer uma simulação personalizada pra você?',
      'Oi! Conseguimos taxas a partir de 1,49% ao mês. Quer que eu simule pro veículo que você está olhando?'
    ],
    cooldownMinutes: 60
  },

  {
    id: 'abandoned_browsing',
    name: 'Navegação Abandonada',
    description: 'Visitante parou de interagir por 3+ minutos',
    priority: 5,
    condition: (context) => {
      const idleTime = Date.now() - (context.lastActivityTime || Date.now())
      return idleTime >= 180000 && // 3 minutos
        (context.behavioral?.intentScore || 0) >= 30
    },
    messages: [
      'Oi! Ainda está por aí? 😊 Posso te ajudar com alguma informação?',
      'Olá! Se tiver alguma dúvida sobre nossos veículos, estou aqui pra ajudar!',
      'Oi! Vi que você estava olhando nosso catálogo. Quer que eu te mostre os destaques da semana?'
    ],
    cooldownMinutes: 60
  }
]

/**
 * Verifica se algum trigger deve ser ativado
 */
export function checkTriggers(context) {
  const now = new Date()
  const hour = now.getHours()

  // Verifica horário de funcionamento
  if (hour < TRIGGER_CONFIG.businessHoursStart ||
    hour >= TRIGGER_CONFIG.businessHoursEnd) {
    return null
  }

  // Verifica cooldown global
  if (context.lastTriggerTime) {
    const minutesSinceLastTrigger = (Date.now() - context.lastTriggerTime) / 60000
    if (minutesSinceLastTrigger < TRIGGER_CONFIG.cooldownMinutes) {
      return null
    }
  }

  // Enriquece contexto com dados comportamentais
  const enrichedContext = {
    ...context,
    behavioral: getBehavioralFingerprint()
  }

  // Ordena triggers por prioridade e verifica condições
  const sortedTriggers = [...TRIGGERS].sort((a, b) => a.priority - b.priority)

  for (const trigger of sortedTriggers) {
    // Verifica se trigger está habilitado
    if (!TRIGGER_CONFIG.enabledTriggers[trigger.id.split('_')[0]]) {
      continue
    }

    // Verifica cooldown específico do trigger
    const triggerLastFired = context.triggerHistory?.[trigger.id]
    if (triggerLastFired) {
      const minutesSince = (Date.now() - triggerLastFired) / 60000
      if (minutesSince < trigger.cooldownMinutes) {
        continue
      }
    }

    // Verifica condição
    try {
      if (trigger.condition(enrichedContext)) {
        // Seleciona mensagem aleatória
        const message = selectMessage(trigger.messages, enrichedContext)

        return {
          triggerId: trigger.id,
          triggerName: trigger.name,
          message,
          priority: trigger.priority,
          delay: randomDelay(),
          timestamp: new Date().toISOString()
        }
      }
    } catch (err) {
      console.error(`Erro ao verificar trigger ${trigger.id}:`, err)
    }
  }

  return null
}

/**
 * Seleciona mensagem e substitui variáveis
 */
function selectMessage(messages, context) {
  const randomIndex = Math.floor(Math.random() * messages.length)
  let message = messages[randomIndex]

  // Substitui variáveis
  if (context.currentVehicleName) {
    message = message.replace(/{vehicleName}/g, context.currentVehicleName)
  }

  if (context.userName) {
    message = message.replace(/{userName}/g, context.userName)
  }

  return message
}

/**
 * Gera delay aleatório para parecer natural
 */
function randomDelay() {
  const min = TRIGGER_CONFIG.minDelaySeconds * 1000
  const max = TRIGGER_CONFIG.maxDelaySeconds * 1000
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Registra disparo de trigger para analytics
 */
export async function logTriggerFired(trigger, sessionId, outcome = 'pending') {
  const { error } = await supabase
    .from('proactive_triggers_log')
    .insert({
      trigger_id: trigger.triggerId,
      trigger_name: trigger.triggerName,
      session_id: sessionId,
      message_sent: trigger.message,
      outcome, // 'engaged', 'ignored', 'converted'
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('Erro ao logar trigger:', error)
  }
}

/**
 * Atualiza outcome de trigger (para aprendizado)
 */
export async function updateTriggerOutcome(sessionId, triggerId, outcome) {
  const { error } = await supabase
    .from('proactive_triggers_log')
    .update({ outcome, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('trigger_id', triggerId)

  return { success: !error }
}

/**
 * Analisa performance dos triggers
 */
export async function analyzeTriggerPerformance() {
  const { data, error } = await supabase
    .from('proactive_triggers_log')
    .select('trigger_id, trigger_name, outcome')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error || !data?.length) {
    return { triggers: [] }
  }

  // Agrupa por trigger
  const triggerStats = {}

  for (const log of data) {
    if (!triggerStats[log.trigger_id]) {
      triggerStats[log.trigger_id] = {
        name: log.trigger_name,
        total: 0,
        engaged: 0,
        converted: 0,
        ignored: 0
      }
    }

    const stats = triggerStats[log.trigger_id]
    stats.total++

    if (log.outcome === 'engaged') stats.engaged++
    else if (log.outcome === 'converted') stats.converted++
    else if (log.outcome === 'ignored') stats.ignored++
  }

  // Calcula métricas
  const triggers = Object.entries(triggerStats).map(([id, stats]) => ({
    id,
    name: stats.name,
    total: stats.total,
    engagementRate: stats.total > 0 ? Math.round((stats.engaged / stats.total) * 100) : 0,
    conversionRate: stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0,
    ignoreRate: stats.total > 0 ? Math.round((stats.ignored / stats.total) * 100) : 0
  }))

  // Ordena por taxa de conversão
  triggers.sort((a, b) => b.conversionRate - a.conversionRate)

  return {
    triggers,
    bestTrigger: triggers[0],
    totalFired: data.length,
    avgEngagementRate: triggers.length > 0
      ? Math.round(triggers.reduce((sum, t) => sum + t.engagementRate, 0) / triggers.length)
      : 0
  }
}

/**
 * Mensagens proativas baseadas em contexto específico
 */
export const CONTEXTUAL_MESSAGES = {
  // Quando cliente vê SUV
  suvInterest: [
    'Oi! Os SUVs são ótimos pra família e pra quem gosta de conforto. Posso te mostrar as melhores opções?',
    'Olá! Temos SUVs com excelente espaço interno e economia. Qual característica é mais importante pra você?'
  ],

  // Quando cliente vê picape
  pickupInterest: [
    'Oi! As picapes são perfeitas pra trabalho e lazer. Você usa mais pra trabalho ou passeio?',
    'Olá! Nossas picapes têm ótima procedência. Procura algo mais robusto ou econômico?'
  ],

  // Quando cliente vê carro econômico
  economicInterest: [
    'Oi! Os carros econômicos são sucesso de venda! Posso te mostrar os que têm melhor custo-benefício?',
    'Olá! Temos opções que fazem mais de 14km/l! Quer conhecer os mais econômicos?'
  ],

  // Quando cliente vê carro de luxo
  luxuryInterest: [
    'Oi! Esse é um veículo premium! Posso te contar sobre os diferenciais e procedência?',
    'Olá! Carros dessa categoria têm manutenção especial. Quer saber mais sobre a garantia?'
  ],

  // Fim de semana
  weekendVisitor: [
    'Oi! Que bom te ver por aqui no fim de semana! 😊 Está pesquisando com calma pra tomar a melhor decisão?',
    'Olá! Final de semana é ótimo pra pesquisar sem pressa. Posso te ajudar a comparar algumas opções?'
  ],

  // Noite
  eveningVisitor: [
    'Oi! Pesquisando à noite? Fique à vontade pra tirar qualquer dúvida!',
    'Olá! Se precisar de alguma informação, estou aqui mesmo fora do horário comercial!'
  ]
}

/**
 * Seleciona mensagem contextual baseada no comportamento
 */
export function getContextualMessage(context) {
  const hour = new Date().getHours()
  const dayOfWeek = new Date().getDay()

  // Verifica contexto temporal primeiro
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return randomFromArray(CONTEXTUAL_MESSAGES.weekendVisitor)
  }

  if (hour >= 20 || hour < 8) {
    return randomFromArray(CONTEXTUAL_MESSAGES.eveningVisitor)
  }

  // Verifica interesse por tipo de veículo
  if (context.currentVehicleType === 'suv') {
    return randomFromArray(CONTEXTUAL_MESSAGES.suvInterest)
  }

  if (context.currentVehicleType === 'pickup') {
    return randomFromArray(CONTEXTUAL_MESSAGES.pickupInterest)
  }

  if (context.currentVehiclePrice && context.currentVehiclePrice < 60000) {
    return randomFromArray(CONTEXTUAL_MESSAGES.economicInterest)
  }

  if (context.currentVehiclePrice && context.currentVehiclePrice > 150000) {
    return randomFromArray(CONTEXTUAL_MESSAGES.luxuryInterest)
  }

  return null
}

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default {
  checkTriggers,
  logTriggerFired,
  updateTriggerOutcome,
  analyzeTriggerPerformance,
  getContextualMessage,
  TRIGGERS,
  TRIGGER_CONFIG,
  CONTEXTUAL_MESSAGES
}
