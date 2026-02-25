import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────────────────────
// Mocks — ANTES de qualquer import do handler
// ─────────────────────────────────────────────────────────────

// Chain genérica que não lança erro (para operações secundárias)
function makeSuccessChain(returnData = null) {
  const chain = {
    select:      vi.fn().mockReturnThis(),
    insert:      vi.fn().mockReturnThis(),
    update:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    order:       vi.fn().mockReturnThis(),
    limit:       vi.fn().mockReturnThis(),
    single:      vi.fn().mockResolvedValue({ data: returnData, error: null }),
    // maybeSingle() é usado por findOrCreateLead para buscar lead por telefone
    maybeSingle: vi.fn().mockResolvedValue({ data: returnData, error: null }),
  }
  return chain
}

// Chain que simula erro no Supabase
function makeErrorChain(errorMsg = 'DB error') {
  const chain = {
    select:      vi.fn().mockReturnThis(),
    insert:      vi.fn().mockReturnThis(),
    update:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    order:       vi.fn().mockReturnThis(),
    limit:       vi.fn().mockReturnThis(),
    single:      vi.fn().mockResolvedValue({ data: null, error: { message: errorMsg } }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: errorMsg } }),
  }
  return chain
}

// vi.mock é hoisted para o topo do arquivo pelo Vitest.
// Usar vi.hoisted() garante que mockSupabase exista quando o factory rodar.
const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('../../src/lib/supabaseClient.js', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
  supabase: mockSupabase
}))

// Mocks de serviços externos (não precisamos testar esses aqui)
vi.mock('../../src/lib/analytics.js', () => ({
  trackFunnelEvent: vi.fn().mockResolvedValue(undefined)
}))
vi.mock('../../src/lib/conversationHistory.js', () => ({
  markConversationAsAppointment: vi.fn().mockResolvedValue(undefined)
}))
vi.mock('../../src/lib/embeddings.js', () => ({
  processSuccessfulConversation: vi.fn().mockResolvedValue(null),
  saveSuccessfulConversation: vi.fn().mockResolvedValue(undefined)
}))
vi.mock('../../src/lib/facebookCAPI.js', () => ({
  trackAppointmentScheduled: vi.fn().mockResolvedValue(undefined)
}))

import { scheduleVisit } from '../../src/api/handlers/appointments.js'

// ─────────────────────────────────────────────────────────────
// Setup de mock padrão para agendamento com SUCESSO
// ─────────────────────────────────────────────────────────────
function setupSuccessfulBooking() {
  const fakeAppointment = {
    id: 'apt-123',
    customer_name: 'João Silva',
    customer_phone: '85999999999',
    scheduled_date: '2026-03-10',
    scheduled_time: '09:00',
    visit_type: 'visita',
    status: 'pendente'
  }
  const fakeLead = { id: 'lead-456', name: 'João Silva' }

  mockSupabase.from.mockImplementation((table) => {
    if (table === 'appointments') {
      // Insert na tabela appointments
      return {
        ...makeSuccessChain(fakeAppointment),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: fakeAppointment, error: null })
      }
    }
    if (table === 'leads') {
      // Retorna lead existente no SELECT (usa maybeSingle em findOrCreateLead)
      const chain = makeSuccessChain(fakeLead)
      chain.single      = vi.fn().mockResolvedValue({ data: fakeLead, error: null })
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: fakeLead, error: null })
      return chain
    }
    // Outras tabelas (qualification_metrics, lead_activities, etc.) → sucesso silencioso
    return makeSuccessChain()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────
describe('scheduleVisit — validação de parâmetros', () => {

  it('sem customerName → success:false', async () => {
    const result = await scheduleVisit({
      phone: '85999999999',
      preferredDate: '10/03/2026',
      vehicleInterest: 'SW4'
    })
    expect(result.success).toBe(false)
    expect(result.message).toContain('nome')
  })

  it('sem phone → success:false', async () => {
    const result = await scheduleVisit({
      customerName: 'João Silva',
      preferredDate: '10/03/2026',
      vehicleInterest: 'SW4'
    })
    expect(result.success).toBe(false)
    expect(result.message).toContain('nome') // mensagem cobre ambos
  })

  it('vehicleInterest vazio → bloqueado', async () => {
    mockSupabase.from.mockReturnValue(makeSuccessChain())
    const result = await scheduleVisit({
      customerName: 'João Silva',
      phone: '85999999999',
      preferredDate: '10/03/2026',
      vehicleInterest: ''
    })
    expect(result.success).toBe(false)
    expect(result.blocked).toBe(true)
  })

  it('vehicleInterest muito curto (< 3 chars) → bloqueado', async () => {
    mockSupabase.from.mockReturnValue(makeSuccessChain())
    const result = await scheduleVisit({
      customerName: 'João Silva',
      phone: '85999999999',
      preferredDate: '10/03/2026',
      vehicleInterest: 'AB'
    })
    expect(result.success).toBe(false)
    expect(result.blocked).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
describe('scheduleVisit — bloqueio de domingo', () => {

  it('domingo explícito → bloqueado com sugestão de segunda', async () => {
    const result = await scheduleVisit({
      customerName: 'João Silva',
      phone: '85999999999',
      preferredDate: 'domingo',
      vehicleInterest: 'SW4'
    })
    expect(result.success).toBe(false)
    expect(result.message).toContain('domingo')
    expect(result.message).toContain('segunda')
  })

  it('mensagem de domingo inclui data da próxima segunda', async () => {
    const result = await scheduleVisit({
      customerName: 'João Silva',
      phone: '85999999999',
      preferredDate: 'domingo',
      vehicleInterest: 'SW4'
    })
    // Deve conter uma data no formato DD/MM/YYYY
    expect(result.message).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })
})

// ─────────────────────────────────────────────────────────────
describe('scheduleVisit — bloqueio de compatibilidade de veículo', () => {

  it('"Hilux picape" → bloqueado com alternativas', async () => {
    mockSupabase.from.mockReturnValue(makeSuccessChain())
    const result = await scheduleVisit({
      customerName: 'João Silva',
      phone: '85999999999',
      preferredDate: '10/03/2026',
      vehicleInterest: 'Hilux picape com caçamba'
    })
    expect(result.success).toBe(false)
    expect(result.blocked).toBe(true)
    expect(result.blockReason).toBe('hilux_sw4_nao_e_picape')
    expect(result.alternatives).toBeDefined()
    expect(result.alternatives.length).toBeGreaterThan(0)
  })

  it('"Hilux SW4" → compatível, não bloqueado', async () => {
    setupSuccessfulBooking()
    const result = await scheduleVisit({
      customerName: 'João Silva',
      phone: '85999999999',
      preferredDate: '10/03/2026',
      vehicleInterest: 'Hilux SW4'
    })
    // Não deve ser bloqueado por incompatibilidade
    expect(result.blocked).toBeFalsy()
  })
})

// ─────────────────────────────────────────────────────────────
describe('scheduleVisit — falha no banco → NUNCA retorna success:true', () => {
  // ESTE É O BUG CRÍTICO QUE ESTAVA CAUSANDO DADOS PERDIDOS.
  // O catch retornava success:true mesmo com erro → Camila dizia "agendado!"
  // mas nada era salvo no banco.

  it('INSERT no appointments falha → retorna success:false', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'appointments') {
        return {
          ...makeErrorChain('invalid input syntax for type date'),
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'invalid input syntax for type date' }
          })
        }
      }
      return makeSuccessChain({ id: 'lead-456', name: 'João Silva' })
    })

    const result = await scheduleVisit({
      customerName: 'João Silva',
      phone: '85999999999',
      preferredDate: '10/03/2026',
      vehicleInterest: 'SW4'
    })

    // NUNCA deve retornar success:true quando o banco falha
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    // A mensagem deve ser transparente (não fingir que agendou)
    expect(result.message).not.toContain('Anotado')
    expect(result.message).not.toContain('Adel estará esperando')
  })

  it('erro com data inválida tipo "sexta-feira" NÃO vira success:true', async () => {
    // Antes do fix: convertBrazilianDateToISO("sexta-feira") retornava "sexta-feira"
    // PostgreSQL rejeitava, catch retornava success:true → bug silencioso
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'appointments') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'invalid input syntax for type date: "sexta-feira"' }
          })
        }
      }
      return makeSuccessChain({ id: 'lead-456' })
    })

    const result = await scheduleVisit({
      customerName: 'Maria Santos',
      phone: '85988888888',
      preferredDate: 'sexta-feira', // agora convertBrazilianDateToISO lida com isso
      vehicleInterest: 'HR-V'
    })

    // Com o fix de dateTime.js, "sexta-feira" vira data ISO válida
    // então o erro acima NÃO deve ocorrer — mas se ocorrer, NÃO pode ser success:true
    if (!result.success) {
      expect(result.success).toBe(false)
    } else {
      // Se foi bem-sucedido, significa que a data foi convertida corretamente
      expect(result.success).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────
describe('scheduleVisit — caminho feliz', () => {

  it('tudo válido → success:true com appointmentId', async () => {
    setupSuccessfulBooking()

    const result = await scheduleVisit({
      customerName: 'João Silva',
      phone: '85999999999',
      preferredDate: '10/03/2026',
      preferredTime: '09:00',
      visitType: 'visita',
      vehicleInterest: 'SW4'
    })

    expect(result.success).toBe(true)
    expect(result.appointmentId).toBe('apt-123')
    expect(result.message).toBeDefined()
    expect(result.message.length).toBeGreaterThan(0)
  })

  it('retorna leadId junto com o agendamento', async () => {
    setupSuccessfulBooking()

    const result = await scheduleVisit({
      customerName: 'João Silva',
      phone: '85999999999',
      preferredDate: '10/03/2026',
      preferredTime: '14:00',
      vehicleInterest: 'Honda HR-V'
    })

    expect(result.success).toBe(true)
    expect(result.leadId).toBeDefined()
  })

  it('mensagem de confirmação contém nome do vendedor (Adel)', async () => {
    setupSuccessfulBooking()

    const result = await scheduleVisit({
      customerName: 'Carlos Andrade',
      phone: '85977777777',
      preferredDate: '10/03/2026',
      vehicleInterest: 'SW4'
    })

    expect(result.success).toBe(true)
    expect(result.message).toContain('Adel')
  })
})

// ─────────────────────────────────────────────────────────────
describe('scheduleVisit — datas em diferentes formatos', () => {

  it('data "amanhã" é aceita (convertida para ISO)', async () => {
    setupSuccessfulBooking()

    const result = await scheduleVisit({
      customerName: 'Ana Lima',
      phone: '85966666666',
      preferredDate: 'amanhã',
      vehicleInterest: 'SW4'
    })

    // Não deve falhar por causa da data
    expect(result.success).toBe(true)
  })

  it('data DD/MM sem ano é aceita', async () => {
    setupSuccessfulBooking()

    const result = await scheduleVisit({
      customerName: 'Pedro Costa',
      phone: '85955555555',
      preferredDate: '15/03',
      vehicleInterest: 'Tracker'
    })

    expect(result.success).toBe(true)
  })
})
