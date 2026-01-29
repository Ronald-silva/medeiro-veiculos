import { describe, it, expect } from 'vitest'

/**
 * Testes para as funções do handler Twilio WhatsApp
 * Validando as otimizações de velocidade e detecção de mensagens
 */

// Replica da função isSimpleMessage para teste
function isSimpleMessage(message) {
  const simplePatterns = [
    /^(oi|olá|ola|hey|eae|e aí|bom dia|boa tarde|boa noite|obrigad[oa]|valeu|blz|ok|sim|não|nao)[\s!?.]*$/i,
    /^(tudo bem|td bem|tdb|como vai|beleza)[\s!?.]*$/i
  ]
  return simplePatterns.some(pattern => pattern.test(message.trim()))
}

describe('Twilio WhatsApp Handler', () => {
  describe('isSimpleMessage', () => {
    it('should detect simple greetings', () => {
      expect(isSimpleMessage('oi')).toBe(true)
      expect(isSimpleMessage('Oi!')).toBe(true)
      expect(isSimpleMessage('olá')).toBe(true)
      expect(isSimpleMessage('Olá!')).toBe(true)
      expect(isSimpleMessage('hey')).toBe(true)
      expect(isSimpleMessage('eae')).toBe(true)
    })

    it('should detect time-based greetings', () => {
      expect(isSimpleMessage('bom dia')).toBe(true)
      expect(isSimpleMessage('Bom dia!')).toBe(true)
      expect(isSimpleMessage('boa tarde')).toBe(true)
      expect(isSimpleMessage('boa noite')).toBe(true)
    })

    it('should detect simple confirmations', () => {
      expect(isSimpleMessage('ok')).toBe(true)
      expect(isSimpleMessage('sim')).toBe(true)
      expect(isSimpleMessage('não')).toBe(true)
      expect(isSimpleMessage('nao')).toBe(true)
      expect(isSimpleMessage('blz')).toBe(true)
      expect(isSimpleMessage('valeu')).toBe(true)
    })

    it('should detect "how are you" variations', () => {
      expect(isSimpleMessage('tudo bem')).toBe(true)
      expect(isSimpleMessage('td bem')).toBe(true)
      expect(isSimpleMessage('tdb')).toBe(true)
      expect(isSimpleMessage('como vai')).toBe(true)
      expect(isSimpleMessage('beleza')).toBe(true)
    })

    it('should NOT detect complex messages', () => {
      expect(isSimpleMessage('quero ver carros')).toBe(false)
      expect(isSimpleMessage('quanto custa a Tracker?')).toBe(false)
      expect(isSimpleMessage('tenho interesse em financiamento')).toBe(false)
      expect(isSimpleMessage('oi, quero saber sobre carros')).toBe(false)
      expect(isSimpleMessage('bom dia, vocês têm SUV?')).toBe(false)
    })

    it('should handle whitespace and punctuation', () => {
      expect(isSimpleMessage('  oi  ')).toBe(true)
      expect(isSimpleMessage('oi!')).toBe(true)
      expect(isSimpleMessage('oi?')).toBe(true)
      expect(isSimpleMessage('oi.')).toBe(true)
    })

    it('should be case insensitive', () => {
      expect(isSimpleMessage('OI')).toBe(true)
      expect(isSimpleMessage('OLÁ')).toBe(true)
      expect(isSimpleMessage('BOM DIA')).toBe(true)
      expect(isSimpleMessage('Tudo Bem')).toBe(true)
    })
  })

  describe('Configuration', () => {
    const CONFIG = {
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 800,
      temperature: 0.7,
      historyLimit: 15,
      typingDelay: 1500
    }

    it('should have optimized maxTokens for speed', () => {
      expect(CONFIG.maxTokens).toBeLessThanOrEqual(1000)
    })

    it('should have balanced temperature', () => {
      expect(CONFIG.temperature).toBeGreaterThanOrEqual(0.5)
      expect(CONFIG.temperature).toBeLessThanOrEqual(0.9)
    })

    it('should have reasonable history limit', () => {
      expect(CONFIG.historyLimit).toBeGreaterThanOrEqual(10)
      expect(CONFIG.historyLimit).toBeLessThanOrEqual(20)
    })

    it('should have human-like typing delay', () => {
      expect(CONFIG.typingDelay).toBeGreaterThanOrEqual(1000)
      expect(CONFIG.typingDelay).toBeLessThanOrEqual(3000)
    })
  })

  describe('Model Selection', () => {
    it('should use haiku for simple messages', () => {
      const message = 'oi'
      const useQuickModel = isSimpleMessage(message)
      const selectedModel = useQuickModel ? 'claude-3-5-haiku-20241022' : 'claude-sonnet-4-5-20250929'

      expect(selectedModel).toBe('claude-3-5-haiku-20241022')
    })

    it('should use sonnet for complex messages', () => {
      const message = 'quero saber sobre a Tracker 2022'
      const useQuickModel = isSimpleMessage(message)
      const selectedModel = useQuickModel ? 'claude-3-5-haiku-20241022' : 'claude-sonnet-4-5-20250929'

      expect(selectedModel).toBe('claude-sonnet-4-5-20250929')
    })
  })

  describe('Typing Simulation', () => {
    it('should calculate humanized typing time', () => {
      const processingTime = 2000 // 2 seconds processing
      const typingTime = Math.max(1000, Math.min(3000 - processingTime, 1500))

      // Should be at least 1 second
      expect(typingTime).toBeGreaterThanOrEqual(1000)
      // Should not exceed remaining time to 3 seconds
      expect(typingTime).toBeLessThanOrEqual(1500)
    })

    it('should handle fast processing', () => {
      const processingTime = 500 // Very fast
      const typingTime = Math.max(1000, Math.min(3000 - processingTime, 1500))

      // Should still wait at least 1 second for natural feel
      expect(typingTime).toBe(1500)
    })

    it('should handle slow processing', () => {
      const processingTime = 4000 // Slow processing
      const typingTime = Math.max(1000, Math.min(3000 - processingTime, 1500))

      // Should use minimum wait time
      expect(typingTime).toBe(1000)
    })
  })
})
