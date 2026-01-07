import { describe, it, expect } from 'vitest'
import { calculateLeadScore } from '../../src/agent/scoring/calculator.js'
import { QUALIFICATION_SCORE_RULES } from '../../src/agent/scoring/rules.js'

describe('Lead Scoring', () => {
  describe('calculateLeadScore', () => {
    it('should return 0 for empty lead data', () => {
      const score = calculateLeadScore({})
      expect(score).toBe(0)
    })

    it('should calculate score based on budget', () => {
      const lead = {
        orcamento: 'até 80 mil'
      }
      const score = calculateLeadScore(lead)

      // Budget "até 80 mil" = 50 pontos * 0.4 peso = 20
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('should calculate score based on urgency', () => {
      const lead = {
        orcamento: '80 a 120 mil',
        urgencia: 'alta'
      }
      const score = calculateLeadScore(lead)

      // Budget: 70 * 0.4 = 28
      // Urgency: 100 * 0.3 = 30
      // Total: ~58
      expect(score).toBeGreaterThan(50)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('should add bonus for trade-in', () => {
      const leadWithoutTrade = {
        orcamento: '80 a 120 mil',
        urgencia: 'media',
        temTroca: false
      }

      const leadWithTrade = {
        orcamento: '80 a 120 mil',
        urgencia: 'media',
        temTroca: true
      }

      const scoreWithout = calculateLeadScore(leadWithoutTrade)
      const scoreWith = calculateLeadScore(leadWithTrade)

      expect(scoreWith).toBeGreaterThan(scoreWithout)
      expect(scoreWith - scoreWithout).toBe(QUALIFICATION_SCORE_RULES.hasTradeIn)
    })

    it('should add bonus for email', () => {
      const leadWithoutEmail = {
        orcamento: '80 a 120 mil',
        urgencia: 'media'
      }

      const leadWithEmail = {
        orcamento: '80 a 120 mil',
        urgencia: 'media',
        email: 'cliente@example.com'
      }

      const scoreWithout = calculateLeadScore(leadWithoutEmail)
      const scoreWith = calculateLeadScore(leadWithEmail)

      expect(scoreWith).toBeGreaterThan(scoreWithout)
      expect(scoreWith - scoreWithout).toBe(QUALIFICATION_SCORE_RULES.providedEmail)
    })

    it('should add bonus for scheduled visit', () => {
      const leadWithoutVisit = {
        orcamento: '80 a 120 mil',
        urgencia: 'alta'
      }

      const leadWithVisit = {
        orcamento: '80 a 120 mil',
        urgencia: 'alta',
        agendamento: true
      }

      const scoreWithout = calculateLeadScore(leadWithoutVisit)
      const scoreWith = calculateLeadScore(leadWithVisit)

      expect(scoreWith).toBeGreaterThan(scoreWithout)
      expect(scoreWith - scoreWithout).toBe(QUALIFICATION_SCORE_RULES.scheduledVisit)
    })

    it('should add bonus for multiple vehicles of interest', () => {
      const leadWithOne = {
        orcamento: '120 a 150 mil',
        urgencia: 'alta',
        veiculosInteresse: ['HR-V']
      }

      const leadWithMultiple = {
        orcamento: '120 a 150 mil',
        urgencia: 'alta',
        veiculosInteresse: ['HR-V', 'Tracker', 'Compass']
      }

      const scoreWithOne = calculateLeadScore(leadWithOne)
      const scoreWithMultiple = calculateLeadScore(leadWithMultiple)

      expect(scoreWithMultiple).toBeGreaterThan(scoreWithOne)
    })

    it('should cap score at 100', () => {
      const perfectLead = {
        orcamento: 'acima de 200 mil',
        urgencia: 'alta',
        formaPagamento: 'à vista',
        temTroca: true,
        email: 'cliente@example.com',
        agendamento: true,
        veiculosInteresse: ['HR-V', 'Tracker']
      }

      const score = calculateLeadScore(perfectLead)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('should handle payment method scoring', () => {
      const cashLead = {
        orcamento: '80 a 120 mil',
        formaPagamento: 'à vista'
      }

      const financingLead = {
        orcamento: '80 a 120 mil',
        formaPagamento: 'financiamento'
      }

      const consortiumLead = {
        orcamento: '80 a 120 mil',
        formaPagamento: 'consórcio'
      }

      const cashScore = calculateLeadScore(cashLead)
      const financingScore = calculateLeadScore(financingLead)
      const consortiumScore = calculateLeadScore(consortiumLead)

      // À vista deve ter maior score
      expect(cashScore).toBeGreaterThan(financingScore)
      expect(financingScore).toBeGreaterThan(consortiumScore)
    })
  })

  describe('QUALIFICATION_SCORE_RULES', () => {
    it('should have all required rule categories', () => {
      expect(QUALIFICATION_SCORE_RULES).toHaveProperty('budget')
      expect(QUALIFICATION_SCORE_RULES).toHaveProperty('urgency')
      expect(QUALIFICATION_SCORE_RULES).toHaveProperty('paymentMethod')
      expect(QUALIFICATION_SCORE_RULES).toHaveProperty('hasTradeIn')
      expect(QUALIFICATION_SCORE_RULES).toHaveProperty('providedEmail')
      expect(QUALIFICATION_SCORE_RULES).toHaveProperty('scheduledVisit')
      expect(QUALIFICATION_SCORE_RULES).toHaveProperty('interestInMultiple')
    })

    it('should have valid budget ranges', () => {
      const budgetScores = Object.values(QUALIFICATION_SCORE_RULES.budget)
      budgetScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(100)
      })
    })

    it('should have valid urgency levels', () => {
      expect(QUALIFICATION_SCORE_RULES.urgency.alta).toBe(100)
      expect(QUALIFICATION_SCORE_RULES.urgency.media).toBe(70)
      expect(QUALIFICATION_SCORE_RULES.urgency.baixa).toBe(40)
    })
  })
})
