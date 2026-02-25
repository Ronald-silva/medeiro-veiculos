import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getCurrentFortalezaTime,
  formatDateForAgent,
  isBusinessHours,
  getNextBusinessDay,
  convertBrazilianDateToISO,
  getDateTimeContext
} from '../../src/api/utils/dateTime.js'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function offsetISO(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// Retorna nome do dia em pt-BR para um Date
function ptWeekday(date) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
    .format(date)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos para comparação
}

// ─────────────────────────────────────────────────────────────
describe('convertBrazilianDateToISO — casos críticos de produção', () => {

  describe('palavras-chave relativas', () => {
    it('"hoje" → data de hoje em ISO', () => {
      expect(convertBrazilianDateToISO('hoje')).toBe(todayISO())
    })

    it('"amanhã" → data de amanhã', () => {
      expect(convertBrazilianDateToISO('amanhã')).toBe(offsetISO(1))
    })

    it('"amanha" (sem acento) → data de amanhã', () => {
      expect(convertBrazilianDateToISO('amanha')).toBe(offsetISO(1))
    })
  })

  describe('nomes de dia da semana', () => {
    const weekdayMap = {
      'segunda':      1,
      'segunda-feira':1,
      'terça':        2,
      'terca':        2,
      'terça-feira':  2,
      'terca-feira':  2,
      'quarta':       3,
      'quarta-feira': 3,
      'quinta':       4,
      'quinta-feira': 4,
      'sexta':        5,
      'sexta-feira':  5,
      'sábado':       6,
      'sabado':       6,
    }

    for (const [input, targetDay] of Object.entries(weekdayMap)) {
      it(`"${input}" → próxima ocorrência (dia ${targetDay})`, () => {
        const result = convertBrazilianDateToISO(input)
        // Deve ser uma data ISO válida
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        // Deve ser no futuro (>= amanhã)
        expect(result >= offsetISO(1)).toBe(true)
        // O dia da semana do resultado deve bater
        const resultDate = new Date(result + 'T12:00:00')
        expect(resultDate.getDay()).toBe(targetDay)
      })
    }

    it('"próxima sexta" → próxima sexta', () => {
      const result = convertBrazilianDateToISO('próxima sexta')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      const d = new Date(result + 'T12:00:00')
      expect(d.getDay()).toBe(5) // 5 = sexta
    })

    it('"proxima sexta" (sem acento) → próxima sexta', () => {
      const result = convertBrazilianDateToISO('proxima sexta')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      const d = new Date(result + 'T12:00:00')
      expect(d.getDay()).toBe(5)
    })

    it('nunca retorna o dia de hoje como "próxima ocorrência"', () => {
      // Mesmo que hoje seja sexta, "sexta" deve retornar a próxima sexta (7 dias depois)
      const result = convertBrazilianDateToISO('sexta')
      expect(result > todayISO()).toBe(true)
    })
  })

  describe('formato DD/MM/YYYY', () => {
    it('converte corretamente 07/03/2026 → 2026-03-07', () => {
      expect(convertBrazilianDateToISO('07/03/2026')).toBe('2026-03-07')
    })

    it('converte com dia de um dígito 5/03/2026 → 2026-03-05', () => {
      expect(convertBrazilianDateToISO('5/03/2026')).toBe('2026-03-05')
    })

    it('converte com mês de um dígito 07/3/2026 → 2026-03-07', () => {
      expect(convertBrazilianDateToISO('07/3/2026')).toBe('2026-03-07')
    })
  })

  describe('formato DD/MM (ano atual implícito)', () => {
    it('converte 15/06 → YYYY-06-15 com ano atual', () => {
      const year = new Date().getFullYear()
      expect(convertBrazilianDateToISO('15/06')).toBe(`${year}-06-15`)
    })

    it('converte 01/01 → YYYY-01-01 com ano atual', () => {
      const year = new Date().getFullYear()
      expect(convertBrazilianDateToISO('01/01')).toBe(`${year}-01-01`)
    })
  })

  describe('formato ISO já formatado', () => {
    it('passa direto 2026-03-15 → 2026-03-15', () => {
      expect(convertBrazilianDateToISO('2026-03-15')).toBe('2026-03-15')
    })

    it('passa direto 2025-12-31 → 2025-12-31', () => {
      expect(convertBrazilianDateToISO('2025-12-31')).toBe('2025-12-31')
    })
  })

  describe('entradas inválidas — NUNCA devem quebrar o banco', () => {
    // Bug original: retornava a string inválida diretamente,
    // causando falha silenciosa no INSERT do PostgreSQL

    it('"invalid-date" → fallback para hoje (NÃO retorna a string inválida)', () => {
      const result = convertBrazilianDateToISO('invalid-date')
      // DEVE ser uma data ISO válida
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      // Deve ser hoje
      expect(result).toBe(todayISO())
    })

    it('"sexta-feira 2012" (com ano colado) → trata como sexta', () => {
      // Garante que a presença de números não quebra o parser de dias da semana
      const result = convertBrazilianDateToISO('sexta-feira')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('null → fallback para hoje', () => {
      const result = convertBrazilianDateToISO(null)
      expect(result).toBe(todayISO())
    })

    it('undefined → fallback para hoje', () => {
      const result = convertBrazilianDateToISO(undefined)
      expect(result).toBe(todayISO())
    })

    it('string vazia → fallback para hoje', () => {
      const result = convertBrazilianDateToISO('')
      expect(result).toBe(todayISO())
    })

    it('resultado NUNCA contém texto — sempre é YYYY-MM-DD', () => {
      const casos = [
        'semana que vem', 'logo', 'qualquer dia', 'tanto faz', '???'
      ]
      for (const caso of casos) {
        const result = convertBrazilianDateToISO(caso)
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    })
  })
})

// ─────────────────────────────────────────────────────────────
describe('isBusinessHours', () => {
  it('terça 10h → dentro do horário', () => {
    expect(isBusinessHours(new Date('2026-01-06T13:00:00Z'))).toBe(true) // 10h Fortaleza = 13h UTC
  })

  it('domingo → fora do horário', () => {
    expect(isBusinessHours(new Date('2026-01-04T13:00:00Z'))).toBe(false)
  })

  it('segunda 20h → fora do horário', () => {
    expect(isBusinessHours(new Date('2026-01-05T23:00:00Z'))).toBe(false)
  })

  it('sábado 10h → dentro do horário', () => {
    expect(isBusinessHours(new Date('2026-01-03T13:00:00Z'))).toBe(true)
  })

  it('sábado 14h → fora do horário (loja fecha 13h)', () => {
    expect(isBusinessHours(new Date('2026-01-03T17:00:00Z'))).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────
describe('getNextBusinessDay', () => {
  it('retorna formato DD/MM/YYYY', () => {
    expect(getNextBusinessDay(new Date('2026-01-02T12:00:00Z'))).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('sábado → próximo dia útil é segunda', () => {
    // Sábado 03/01/2026 → próximo dia útil = segunda 05/01/2026
    expect(getNextBusinessDay(new Date('2026-01-03T12:00:00Z'))).toBe('05/01/2026')
  })

  it('sexta → próximo dia útil é sábado', () => {
    // Sexta 02/01/2026 → próximo dia útil = sábado 03/01/2026
    expect(getNextBusinessDay(new Date('2026-01-02T12:00:00Z'))).toBe('03/01/2026')
  })
})

// ─────────────────────────────────────────────────────────────
describe('getDateTimeContext', () => {
  it('retorna string com marcação de contexto', () => {
    const result = getDateTimeContext()
    expect(result).toContain('[Data e horário em Fortaleza:')
    expect(result).toContain('às')
  })
})
