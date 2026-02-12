import { z } from 'zod'

// Schema de validação para variáveis de ambiente
const envSchema = z.object({
  // --------------------------------------------
  // 🤖 AI APIs - Anthropic Claude
  // --------------------------------------------
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY é obrigatória'),

  // --------------------------------------------
  // 🤖 OpenAI (Opcional - apenas se usar GPT)
  // --------------------------------------------
  OPENAI_API_KEY: z.string().min(1).optional(),

  // --------------------------------------------
  // 🗄️ Supabase - Database PostgreSQL
  // --------------------------------------------
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL deve ser uma URL válida'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY é obrigatória'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // --------------------------------------------
  // 📦 Upstash Redis - Cache e Rate Limiting
  // --------------------------------------------
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL deve ser uma URL válida'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN é obrigatório'),

  // --------------------------------------------
  // 💬 Twilio - WhatsApp Business
  // --------------------------------------------
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().min(1).optional(),

  // --------------------------------------------
  // 🔐 CRM Authentication (Opcional)
  // --------------------------------------------
  VITE_CRM_PASSWORD: z.string().min(1).optional(),

  // --------------------------------------------
  // 🏪 Informações da Loja
  // --------------------------------------------
  VITE_STORE_PHONE: z.string().regex(/^\d+$/).optional(),
  VITE_STORE_WHATSAPP: z.string().regex(/^\d+$/).optional(),
  VITE_STORE_ADDRESS: z.string().min(1).optional(),
  VITE_STORE_CITY: z.string().min(1).optional(),
  VITE_STORE_STATE: z.string().length(2).optional(),

  // --------------------------------------------
  // ⚙️ Sistema
  // --------------------------------------------
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional()
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

      // OpenAI (string vazia → undefined para não falhar validação)
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,

      // Supabase
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

      // Upstash Redis
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

      // Twilio
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,

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
      const errors = result.error?.issues?.map(err =>
        `  ❌ ${err.path.join('.')}: ${err.message}`
      ).join('\n') || `Erro: ${JSON.stringify(result.error)}`

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
      error: `Erro ao validar variáveis de ambiente: ${error?.message || error}`
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
