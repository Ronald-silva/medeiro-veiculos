/**
 * Supervisor de IA - Validação de Respostas
 *
 * Valida respostas da Camila ANTES de enviar ao cliente.
 * Níveis de validação:
 * 1. Dados de estoque (veículo existe? preço correto?)
 * 2. Qualidade (resposta adequada?)
 * 3. Progresso de qualificação (BANT)
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import logger from './logger.js'

// Cache de veículos para evitar múltiplas queries
let vehiclesCache = null
let vehiclesCacheTime = 0
const CACHE_TTL = 60000 // 1 minuto

/**
 * Busca veículos do Supabase (com cache)
 */
async function getVehiclesFromDb() {
  const now = Date.now()

  // Usa cache se válido
  if (vehiclesCache && (now - vehiclesCacheTime) < CACHE_TTL) {
    return vehiclesCache
  }

  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, name, price, status, type, year')

    if (error) {
      logger.error('Supervisor: erro ao buscar veículos', error)
      return null
    }

    vehiclesCache = data
    vehiclesCacheTime = now
    return data
  } catch (error) {
    logger.error('Supervisor: erro ao buscar veículos', error)
    return null
  }
}

/**
 * Extrai menções de veículos do texto
 * Retorna array de {name, price} encontrados
 */
function extractVehicleMentions(text) {
  const mentions = []

  // Padrões comuns de menção de veículo
  // Ex: "Hilux SW4 por R$ 135.000", "L200 Triton de R$ 99.900"
  const patterns = [
    // Nome + preço com R$
    /(?:tenho|temos|tem)\s+(?:uma?|o|a)?\s*([A-Za-zÀ-ÿ0-9\-\s]+?)\s+(?:por|de|a partir de)?\s*R\$\s*([\d.,]+)/gi,
    // Preço + veículo
    /R\$\s*([\d.,]+)[^\d]*?([A-Za-zÀ-ÿ0-9\-\s]{3,30})/gi,
    // Veículo + ano + preço
    /([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ0-9]+)?)\s+(\d{4})\s*[-–]?\s*R\$\s*([\d.,]+)/gi
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      // Limpa o nome do veículo
      const name = match[1]?.trim().replace(/\s+/g, ' ')
      // Parse do preço
      const priceStr = match[2] || match[3]
      const price = parsePrice(priceStr)

      if (name && name.length > 2 && price > 0) {
        mentions.push({ name, price })
      }
    }
  }

  return mentions
}

/**
 * Parse de preço em string para número
 */
function parsePrice(priceStr) {
  if (!priceStr) return 0

  // Remove pontos de milhar e converte vírgula para ponto
  const cleaned = priceStr
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '')

  const price = parseFloat(cleaned)

  // Se o número for pequeno (< 1000), provavelmente é em milhares
  if (price > 0 && price < 1000) {
    return price * 1000
  }

  return price || 0
}

/**
 * Verifica se um veículo mencionado existe no estoque
 */
function findVehicleInInventory(mentionedName, vehicles) {
  if (!vehicles || !mentionedName) return null

  const searchTerm = mentionedName.toLowerCase()

  // Busca exata primeiro
  let match = vehicles.find(v =>
    v.name.toLowerCase().includes(searchTerm) ||
    searchTerm.includes(v.name.toLowerCase().split(' ')[0])
  )

  if (match) return match

  // Busca por palavras-chave
  const keywords = searchTerm.split(' ').filter(w => w.length > 2)

  for (const vehicle of vehicles) {
    const vehicleName = vehicle.name.toLowerCase()
    const matchCount = keywords.filter(k => vehicleName.includes(k)).length

    if (matchCount >= Math.ceil(keywords.length / 2)) {
      return vehicle
    }
  }

  return null
}

/**
 * Resultado da validação
 */
class ValidationResult {
  constructor() {
    this.isValid = true
    this.errors = []
    this.warnings = []
    this.suggestions = []
    this.corrections = []
  }

  addError(error) {
    this.isValid = false
    this.errors.push(error)
  }

  addWarning(warning) {
    this.warnings.push(warning)
  }

  addSuggestion(suggestion) {
    this.suggestions.push(suggestion)
  }

  addCorrection(original, corrected, reason) {
    this.corrections.push({ original, corrected, reason })
  }
}

/**
 * NÍVEL 1: Validação de Dados de Estoque
 * - Veículo mencionado existe?
 * - Preço está correto?
 * - Status é "available"?
 */
async function validateInventoryData(responseText, toolResults = null) {
  const result = new ValidationResult()

  const vehicles = await getVehiclesFromDb()
  if (!vehicles) {
    // Sem acesso ao DB, não pode validar
    result.addWarning('Não foi possível validar estoque (DB indisponível)')
    return result
  }

  // Se teve resultado de recommend_vehicles, usa como referência
  let recommendedVehicles = []
  if (toolResults) {
    try {
      const toolData = Array.isArray(toolResults) ? toolResults : [toolResults]
      for (const tr of toolData) {
        if (tr.content && typeof tr.content === 'string') {
          const parsed = JSON.parse(tr.content)
          if (parsed.vehicles) {
            recommendedVehicles = parsed.vehicles
          }
        }
      }
    } catch (e) {
      // Ignora erro de parse
    }
  }

  // Extrai menções de veículos da resposta
  const mentions = extractVehicleMentions(responseText)

  for (const mention of mentions) {
    const vehicle = findVehicleInInventory(mention.name, vehicles)

    if (!vehicle) {
      // Veículo não encontrado no estoque
      result.addWarning(`Veículo "${mention.name}" não encontrado no estoque atual`)
      continue
    }

    // Verifica status
    if (vehicle.status !== 'available') {
      result.addError(`Veículo "${vehicle.name}" não está disponível (status: ${vehicle.status})`)
    }

    // Verifica preço (tolerância de 5%)
    const priceDiff = Math.abs(vehicle.price - mention.price)
    const tolerance = vehicle.price * 0.05

    if (priceDiff > tolerance && mention.price > 0) {
      result.addError(
        `Preço incorreto para ${vehicle.name}: mencionado R$ ${mention.price.toLocaleString('pt-BR')}, ` +
        `correto é R$ ${vehicle.price.toLocaleString('pt-BR')}`
      )
      result.addCorrection(
        `R$ ${mention.price.toLocaleString('pt-BR')}`,
        `R$ ${vehicle.price.toLocaleString('pt-BR')}`,
        'Preço corrigido conforme estoque'
      )
    }
  }

  return result
}

/**
 * NÍVEL 2: Validação de Qualidade da Resposta
 * - Resposta muito longa?
 * - Tom adequado?
 * - Múltiplas perguntas?
 */
function validateResponseQuality(responseText) {
  const result = new ValidationResult()

  // Verifica tamanho (máx 500 caracteres para respostas curtas)
  if (responseText.length > 600) {
    result.addWarning('Resposta muito longa (>600 caracteres)')
  }

  // Verifica múltiplas perguntas
  const questionMarks = (responseText.match(/\?/g) || []).length
  if (questionMarks > 2) {
    result.addWarning(`Muitas perguntas na resposta (${questionMarks}). Ideal é 1 por vez.`)
  }

  // Verifica se está listando opções numeradas (proibido pelo tom)
  if (/[1-3]\)|\d\.\s+\w+/g.test(responseText)) {
    result.addWarning('Evitar listar opções numeradas (1, 2, 3)')
  }

  // Verifica "não entendi" (proibido)
  if (/não entendi|não compreendi|pode repetir/i.test(responseText)) {
    result.addError('Resposta contém "não entendi" - PROIBIDO')
  }

  return result
}

/**
 * NÍVEL 3: Validação de Progresso de Qualificação (BANT)
 */
function validateQualificationProgress(responseText, conversationHistory = []) {
  const result = new ValidationResult()

  // Analisa se está avançando na qualificação
  // (implementação simplificada - pode ser expandida)

  const fullConversation = conversationHistory.map(m => m.content).join(' ')

  // Verifica BANT
  const bant = {
    budget: /orçamento|quanto|valor|entrada|financia/i.test(fullConversation),
    authority: /você decide|sozinho|família|esposa|marido|decisor/i.test(fullConversation),
    need: /precisa|uso|família|trabalho|lazer/i.test(fullConversation),
    timeline: /quando|prazo|urgente|esta semana|hoje/i.test(fullConversation)
  }

  const bantScore = Object.values(bant).filter(Boolean).length

  if (bantScore < 2 && conversationHistory.length > 4) {
    result.addSuggestion('Considere avançar na qualificação BANT (orçamento, decisor, necessidade, prazo)')
  }

  return result
}

/**
 * Função principal: Valida resposta completa
 *
 * @param {string} responseText - Texto da resposta da IA
 * @param {object} options - Opções de validação
 * @param {array} options.toolResults - Resultados de tools chamadas
 * @param {array} options.conversationHistory - Histórico da conversa
 * @param {boolean} options.autoCorrect - Se deve tentar auto-corrigir
 * @returns {ValidationResult} Resultado da validação
 */
export async function validateResponse(responseText, options = {}) {
  const {
    toolResults = null,
    conversationHistory = [],
    autoCorrect = false
  } = options

  logger.debug('Supervisor: validando resposta', {
    textLength: responseText.length,
    hasToolResults: !!toolResults
  })

  // Executa todas as validações
  const inventoryResult = await validateInventoryData(responseText, toolResults)
  const qualityResult = validateResponseQuality(responseText)
  const bantResult = validateQualificationProgress(responseText, conversationHistory)

  // Combina resultados
  const finalResult = new ValidationResult()

  // Merge errors
  for (const r of [inventoryResult, qualityResult, bantResult]) {
    finalResult.errors.push(...r.errors)
    finalResult.warnings.push(...r.warnings)
    finalResult.suggestions.push(...r.suggestions)
    finalResult.corrections.push(...r.corrections)
  }

  finalResult.isValid = finalResult.errors.length === 0

  // Log resultado
  if (!finalResult.isValid) {
    logger.warn('Supervisor: resposta com erros', {
      errors: finalResult.errors,
      warnings: finalResult.warnings
    })
  } else if (finalResult.warnings.length > 0) {
    logger.info('Supervisor: resposta OK com avisos', {
      warnings: finalResult.warnings
    })
  } else {
    logger.debug('Supervisor: resposta validada OK')
  }

  return finalResult
}

/**
 * Aplica correções automáticas no texto
 */
export function applyCorrections(text, corrections) {
  let correctedText = text

  for (const correction of corrections) {
    correctedText = correctedText.replace(correction.original, correction.corrected)
  }

  return correctedText
}

/**
 * Salva log de validação para análise posterior
 */
export async function logValidation(conversationId, validationResult, responseText) {
  if (!isSupabaseConfigured()) return

  try {
    await supabase.from('supervision_logs').insert({
      conversation_id: conversationId,
      response_text: responseText.substring(0, 500),
      is_valid: validationResult.isValid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      suggestions: validationResult.suggestions,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    // Não falha se não conseguir logar
    logger.debug('Supervisor: falha ao salvar log', error.message)
  }
}

export default {
  validateResponse,
  applyCorrections,
  logValidation
}
