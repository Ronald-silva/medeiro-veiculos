// Setup global para testes com Vitest
import { vi } from 'vitest'

// Mock de variáveis de ambiente para testes
process.env.NODE_ENV = 'test'
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
process.env.EVOLUTION_API_URL = 'https://test-evolution.com'
process.env.EVOLUTION_API_KEY = 'test-evolution-key'
process.env.EVOLUTION_INSTANCE_NAME = 'test-instance'
process.env.VITE_CRM_PASSWORD = 'test-password'
process.env.VITE_STORE_PHONE = '85988852900'
process.env.VITE_STORE_WHATSAPP = '85988852900'
process.env.VITE_STORE_ADDRESS = 'Av. Test, 123'
process.env.VITE_STORE_CITY = 'Fortaleza'
process.env.VITE_STORE_STATE = 'CE'

// Silencia logs durante testes
vi.mock('../../src/lib/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))
