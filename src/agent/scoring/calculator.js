import { QUALIFICATION_SCORE_RULES } from './rules.js'

/**
 * Calcula a pontuação de qualificação de um lead
 * @param {object} leadData - Dados do lead
 * @returns {number} Pontuação de 0 a 100
 */
export function calculateLeadScore(leadData) {
  let score = 0

  if (leadData.orcamento) {
    const budgetKey = Object.keys(QUALIFICATION_SCORE_RULES.budget)
      .find(key => leadData.orcamento.toLowerCase().includes(key.replace('k', '')))
    if (budgetKey) score += QUALIFICATION_SCORE_RULES.budget[budgetKey] * 0.3  // era 0.4
  }

  if (leadData.urgencia) {
    score += QUALIFICATION_SCORE_RULES.urgency[leadData.urgencia] * 0.4  // era 0.3 — urgência vale mais
  }

  if (leadData.formaPagamento) {
    score += QUALIFICATION_SCORE_RULES.paymentMethod[leadData.formaPagamento] * 0.2
  }

  if (leadData.temTroca) score += QUALIFICATION_SCORE_RULES.hasTradeIn
  if (leadData.email) score += QUALIFICATION_SCORE_RULES.providedEmail
  if (leadData.agendamento) score += QUALIFICATION_SCORE_RULES.scheduledVisit
  if (leadData.veiculosInteresse && leadData.veiculosInteresse.length > 1) {
    score += QUALIFICATION_SCORE_RULES.interestInMultiple
  }

  return Math.min(Math.round(score), 100)
}
