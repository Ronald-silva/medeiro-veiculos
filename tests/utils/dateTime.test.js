import { describe, it, expect } from 'vitest'
import {
  getCurrentFortalezaTime,
  formatDateForAgent,
  isBusinessHours,
  getNextBusinessDay,
  convertBrazilianDateToISO,
  getDateTimeContext
} from '../../src/api/utils/dateTime.js'

describe('dateTime utilities', () => {
  describe('getCurrentFortalezaTime', () => {
    it('should return a Date object', () => {
      const result = getCurrentFortalezaTime()
      expect(result).toBeInstanceOf(Date)
    })

    it('should return a valid date', () => {
      const result = getCurrentFortalezaTime()
      expect(result.toString()).not.toBe('Invalid Date')
    })
  })

  describe('formatDateForAgent', () => {
    it('should format date in Portuguese', () => {
      const date = new Date('2026-01-07T14:30:00-03:00')
      const result = formatDateForAgent(date)

      // Verifica formato básico
      expect(result).toContain('/')
      expect(result).toContain('h')
    })

    it('should capitalize weekday', () => {
      const date = new Date('2026-01-07T14:30:00-03:00')
      const result = formatDateForAgent(date)

      // Primeira letra deve ser maiúscula
      expect(result.charAt(0)).toBe(result.charAt(0).toUpperCase())
    })
  })

  describe('isBusinessHours', () => {
    it('should return true for weekday at 10am', () => {
      const tuesday10am = new Date('2026-01-06T10:00:00-03:00') // Terça
      const result = isBusinessHours(tuesday10am)
      expect(result).toBe(true)
    })

    it('should return false for Sunday', () => {
      const sunday = new Date('2026-01-04T10:00:00-03:00') // Domingo
      const result = isBusinessHours(sunday)
      expect(result).toBe(false)
    })

    it('should return false for late evening', () => {
      const tuesday8pm = new Date('2026-01-06T20:00:00-03:00')
      const result = isBusinessHours(tuesday8pm)
      expect(result).toBe(false)
    })

    it('should return true for Saturday morning', () => {
      const saturday10am = new Date('2026-01-03T10:00:00-03:00')
      const result = isBusinessHours(saturday10am)
      expect(result).toBe(true)
    })

    it('should return false for Saturday afternoon', () => {
      const saturday2pm = new Date('2026-01-03T14:00:00-03:00')
      const result = isBusinessHours(saturday2pm)
      expect(result).toBe(false)
    })
  })

  describe('getNextBusinessDay', () => {
    it('should return next weekday', () => {
      const friday = new Date('2026-01-02T10:00:00-03:00')
      const result = getNextBusinessDay(friday)

      // Deve retornar formato DD/MM/YYYY
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })

    it('should skip Sunday', () => {
      const saturday = new Date('2026-01-03T10:00:00-03:00')
      const result = getNextBusinessDay(saturday)

      // Próximo dia útil de sábado é segunda
      expect(result).toBe('05/01/2026')
    })
  })

  describe('convertBrazilianDateToISO', () => {
    it('should convert DD/MM/YYYY to YYYY-MM-DD', () => {
      const result = convertBrazilianDateToISO('07/01/2026')
      expect(result).toBe('2026-01-07')
    })

    it('should handle invalid format', () => {
      const result = convertBrazilianDateToISO('invalid-date')
      // Função retorna string original se não for DD/MM/YYYY
      expect(result).toBe('invalid-date')
    })
  })

  describe('getDateTimeContext', () => {
    it('should return formatted context string', () => {
      const result = getDateTimeContext()

      expect(result).toContain('[Data e horário em Fortaleza:')
      expect(result).toContain('às')
      expect(result).toContain('h')
    })
  })
})
