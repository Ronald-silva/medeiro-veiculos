import { z } from 'zod'

// Schema de validação para variáveis de ambiente
const envSchema = z.object({
  // --------------------------------------------
  // 🤖 AI APIs - Anthropic Claude
  // --------------------------------------------
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY é obrigatória'),

  // --------------------------------------------
  // 🤖 OpenAI (Embeddings para RAG)
  // --------------------------------------------
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY é obrigatória'),

  // --------------------------------------------
  // 🗄️ Supabase - Database PostgreSQL
  // --------------------------------------------
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL deve ser uma URL válida'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY é obrigatória'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY é obrigatória'),

  // --------------------------------------------
  // 📦 Upstash Redis - Cache e Rate Limiting
  // --------------------------------------------
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL deve ser uma URL válida'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN é obrigatório'),

  // --------------------------------------------
  // 💬 Evolution API v2 - WhatsApp Business
  // --------------------------------------------
  EVOLUTION_API_URL: z.string().url('EVOLUTION_API_URL deve ser uma URL válida'),
  EVOLUTION_API_KEY: z.string().min(1, 'EVOLUTION_API_KEY é obrigatória'),
  EVOLUTION_INSTANCE_NAME: z.string().min(1, 'EVOLUTION_INSTANCE_NAME é obrigatório'),

  // --------------------------------------------
  // 🔐 CRM Authentication
  // --------------------------------------------
  VITE_CRM_PASSWORD: z.string().min(1, 'VITE_CRM_PASSWORD é obrigatória'),

  // --------------------------------------------
  // 🏪 Informações da Loja
  // --------------------------------------------
  VITE_STORE_PHONE: z.string().regex(/^\d+$/, 'VITE_STORE_PHONE deve conter apenas números'),
  VITE_STORE_WHATSAPP: z.string().regex(/^\d+$/, 'VITE_STORE_WHATSAPP deve conter apenas números'),
  VITE_STORE_ADDRESS: z.string().min(1, 'VITE_STORE_ADDRESS é obrigatório'),
  VITE_STORE_CITY: z.string().min(1, 'VITE_STORE_CITY é obrigatório'),
  VITE_STORE_STATE: z.string().length(2, 'VITE_STORE_STATE deve ter 2 letras (ex: CE)'),

  // --------------------------------------------
  // ⚙️ Sistema
  // --------------------------------------------
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  PORT: z.string().regex(/^\d+$/).optional().default('3001')
})

/**
 * Valida as variáveis de ambiente usando Zod
 * @returns {{success: boolean, data?: object, error?: string}}
 */
export function validateEnv() {
  try {
    const env = {
      // Anthropic
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,

      // OpenAI
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,

      // Supabase
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

      // Upstash Redis
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

      // Evolution API
      EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
      EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
      EVOLUTION_INSTANCE_NAME: process.env.EVOLUTION_INSTANCE_NAME,

      // CRM
      VITE_CRM_PASSWORD: process.env.VITE_CRM_PASSWORD,

      // Store Info
      VITE_STORE_PHONE: process.env.VITE_STORE_PHONE,
      VITE_STORE_WHATSAPP: process.env.VITE_STORE_WHATSAPP,
      VITE_STORE_ADDRESS: process.env.VITE_STORE_ADDRESS,
      VITE_STORE_CITY: process.env.VITE_STORE_CITY,
      VITE_STORE_STATE: process.env.VITE_STORE_STATE,

      // System
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT
    }

    const result = envSchema.safeParse(env)

    if (!result.success) {
      const errors = result.error.errors.map(err =>
        `  ❌ ${err.path.join('.')}: ${err.message}`
      ).join('\n')

      return {
        success: false,
        error: `\n⚠️  ERRO: Variáveis de ambiente inválidas:\n\n${errors}\n\n📝 Verifique seu arquivo .env.local\n`
      }
    }

    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    return {
      success: false,
      error: `Erro ao validar variáveis de ambiente: ${error.message}`
    }
  }
}

/**
 * Obtém as variáveis de ambiente validadas ou lança erro
 * @returns {object} Variáveis de ambiente validadas
 * @throws {Error} Se a validação falhar
 */
export function getValidatedEnv() {
  const result = validateEnv()

  if (!result.success) {
    throw new Error(result.error)
  }

  return result.data
}

export default getValidatedEnv
