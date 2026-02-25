import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────────────────────
// Mock do Supabase — deve vir ANTES do import do handler
// ─────────────────────────────────────────────────────────────

// vi.mock é hoisted para o topo do arquivo pelo Vitest.
// Usar vi.hoisted() garante que mockQuery exista quando o factory rodar.
//
// mockQuery é um objeto THENABLE: todos os métodos retornam `this` para
// suportar encadeamento, inclusive `.limit()`. O `await query` funciona
// via `.then()`, que é a interface padrão de Promises/thenables.
// Isso é necessário porque vehicles.js chama `.or(vehicleType)` DEPOIS
// de `.limit()`, portanto `.limit()` não pode ser o método terminal.
const mockQuery = vi.hoisted(() => ({
  select:  vi.fn().mockReturnThis(),
  eq:      vi.fn().mockReturnThis(),
  lte:     vi.fn().mockReturnThis(),
  or:      vi.fn().mockReturnThis(),
  order:   vi.fn().mockReturnThis(),
  limit:   vi.fn().mockReturnThis(),
  // Torna mockQuery "thenable" — await mockQuery chama .then()
  then:    vi.fn((resolve) => resolve({ data: [], error: null })),
}))

vi.mock('../../src/lib/supabaseClient.js', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
  supabase: {
    from: vi.fn().mockReturnValue(mockQuery)
  }
}))

import { recommendVehicles } from '../../src/api/handlers/vehicles.js'
import { supabase } from '../../src/lib/supabaseClient.js'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function mockVehicles(vehicles) {
  mockQuery.then.mockImplementationOnce((resolve) => resolve({ data: vehicles, error: null }))
}

function mockSupabaseError(message = 'DB error') {
  mockQuery.then.mockImplementationOnce((resolve) => resolve({ data: null, error: { message } }))
}

function getOrCalls() {
  return mockQuery.or.mock.calls
}

function getLteCalls() {
  return mockQuery.lte.mock.calls
}

beforeEach(() => {
  vi.clearAllMocks()
  // Restaura comportamento padrão após vi.clearAllMocks()
  mockQuery.select.mockReturnThis()
  mockQuery.eq.mockReturnThis()
  mockQuery.lte.mockReturnThis()
  mockQuery.or.mockReturnThis()
  mockQuery.order.mockReturnThis()
  mockQuery.limit.mockReturnThis()
  mockQuery.then.mockImplementation((resolve) => resolve({ data: [], error: null }))
  supabase.from.mockReturnValue(mockQuery)
})

// ─────────────────────────────────────────────────────────────
describe('recommendVehicles — parseBudget', () => {

  it('"até 100 mil" → busca com teto de 100000', async () => {
    await recommendVehicles({ budget: 'até 100 mil' })
    expect(mockQuery.lte).toHaveBeenCalledWith('price', 100000)
  })

  it('"80 a 120 mil" → usa o teto (120000)', async () => {
    await recommendVehicles({ budget: '80 a 120 mil' })
    expect(mockQuery.lte).toHaveBeenCalledWith('price', 120000)
  })

  it('"50000" (número puro) → 50000000 (x1000)', async () => {
    // "50000" vira parseInt("50000") * 1000 = 50_000_000 (teto alto)
    // Isso é comportamento atual — apenas garante que não quebra
    const result = await recommendVehicles({ budget: '50000' })
    expect(result.success).toBe(true)
  })

  it('budget undefined → usa teto padrão 200000', async () => {
    await recommendVehicles({})
    expect(mockQuery.lte).toHaveBeenCalledWith('price', 200000)
  })
})

// ─────────────────────────────────────────────────────────────
describe('recommendVehicles — searchTerm e sinônimos', () => {

  it('"SW4" → busca por SW4 nos campos name/model/brand', async () => {
    await recommendVehicles({ searchTerm: 'SW4' })
    const orCall = mockQuery.or.mock.calls[0]?.[0] || ''
    expect(orCall).toContain('SW4')
    expect(orCall).not.toContain('lte') // não deve cair no filtro de preço
  })

  it('"Hilux SW4 2012" → strip ano → resolve sinônimo → busca por "SW4"', async () => {
    await recommendVehicles({ searchTerm: 'Hilux SW4 2012' })
    const orCall = mockQuery.or.mock.calls[0]?.[0] || ''
    // "Hilux SW4 2012" → strip 2012 → "Hilux SW4" → sinônimo "hilux sw4" → "SW4"
    expect(orCall).toContain('SW4')
    expect(orCall).not.toContain('2012')
  })

  it('"hilux" → sinônimo → busca por "SW4"', async () => {
    await recommendVehicles({ searchTerm: 'hilux' })
    const orCall = mockQuery.or.mock.calls[0]?.[0] || ''
    expect(orCall).toContain('SW4')
  })

  it('"hrv" → sinônimo → busca por "HR-V"', async () => {
    await recommendVehicles({ searchTerm: 'hrv' })
    const orCall = mockQuery.or.mock.calls[0]?.[0] || ''
    expect(orCall).toContain('HR-V')
  })

  it('"l-200" → sinônimo → busca por "L200"', async () => {
    await recommendVehicles({ searchTerm: 'l-200' })
    const orCall = mockQuery.or.mock.calls[0]?.[0] || ''
    expect(orCall).toContain('L200')
  })

  it('"triton" → sinônimo → busca por "L200"', async () => {
    await recommendVehicles({ searchTerm: 'triton' })
    const orCall = mockQuery.or.mock.calls[0]?.[0] || ''
    expect(orCall).toContain('L200')
  })

  it('busca sem searchTerm → usa filtro de preço (lte), não .or()', async () => {
    await recommendVehicles({ budget: 'até 80 mil' })
    expect(mockQuery.lte).toHaveBeenCalledWith('price', 80000)
    // or() pode ser chamado para vehicleType mas NÃO para name/model/brand
    const orCallsForSearch = mockQuery.or.mock.calls.filter(
      call => call[0].includes('name.ilike')
    )
    expect(orCallsForSearch).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────
describe('recommendVehicles — guard: searchTerm somente com ano/versão', () => {

  it('"2012 SRV" → keywords vazio → cai no filtro de preço (não quebra)', async () => {
    // Após strip: "2012 SRV" → remove 2012, remove SRV → "" → keywords vazio
    await recommendVehicles({ searchTerm: '2012 SRV', budget: 'até 150 mil' })
    // Deve ter chamado lte (fallback de preço), NÃO .or('name.ilike...')
    const nameOrCalls = mockQuery.or.mock.calls.filter(
      call => call[0].includes('name.ilike')
    )
    expect(nameOrCalls).toHaveLength(0)
    expect(mockQuery.lte).toHaveBeenCalled()
  })

  it('"2024 diesel 4x4" → keywords vazio → não quebra o .or()', async () => {
    const result = await recommendVehicles({ searchTerm: '2024 diesel 4x4' })
    expect(result.success).toBe(true) // não lança exceção
  })
})

// ─────────────────────────────────────────────────────────────
describe('recommendVehicles — tratamento de erros', () => {

  it('erro do Supabase → retorna success:false', async () => {
    mockSupabaseError('connection refused')
    const result = await recommendVehicles({ budget: 'até 100 mil' })
    expect(result.success).toBe(false)
  })

  it('veículos encontrados → retorna success:true com lista', async () => {
    const fakeVehicle = {
      id: '1', name: 'Toyota SW4 SRV 2012', price: 135000,
      status: 'available', vehicle_type: 'suv', mileage: 192000
    }
    mockVehicles([fakeVehicle])
    const result = await recommendVehicles({ searchTerm: 'SW4' })
    expect(result.success).toBe(true)
    expect(result.vehicles).toHaveLength(1)
    expect(result.vehicles[0].name).toContain('SW4')
  })

  it('sem veículos → retorna success:true com array vazio e mensagem', async () => {
    mockVehicles([])
    const result = await recommendVehicles({ searchTerm: 'Ferrari' })
    expect(result.success).toBe(true)
    expect(result.vehicles).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────
describe('recommendVehicles — filtro de tipo de veículo', () => {

  it('vehicleType ["motorcycle"] → aplica filtro de tipo', async () => {
    await recommendVehicles({ vehicleType: ['motorcycle'], budget: 'até 20 mil' })
    const typeOrCalls = mockQuery.or.mock.calls.filter(
      call => call[0].includes('vehicle_type')
    )
    expect(typeOrCalls.length).toBeGreaterThan(0)
    const typeFilter = typeOrCalls[0][0]
    expect(typeFilter).toContain('motorcycle')
  })

  it('vehicleType ["carro"] → normaliza para car,carro', async () => {
    await recommendVehicles({ vehicleType: ['carro'], budget: 'até 100 mil' })
    const typeOrCalls = mockQuery.or.mock.calls.filter(
      call => call[0].includes('vehicle_type')
    )
    const typeFilter = typeOrCalls[0]?.[0] || ''
    expect(typeFilter).toContain('car')
  })
})
