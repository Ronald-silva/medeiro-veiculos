// Regras de pontuação para qualificação de leads
export const QUALIFICATION_SCORE_RULES = {
  budget: {
    'até 80 mil': 50,
    '80 a 120 mil': 70,
    '120 a 150 mil': 85,
    '150 a 200 mil': 95,
    'acima de 200 mil': 100
  },
  urgency: {
    'alta': 100,
    'media': 70,
    'baixa': 40
  },
  paymentMethod: {
    'à vista': 100,
    'financiamento': 80,
    'cartão': 85,
    'consórcio': 60
  },
  hasTradeIn: 15,
  providedEmail: 10,
  scheduledVisit: 25,
  interestInMultiple: 10
}
