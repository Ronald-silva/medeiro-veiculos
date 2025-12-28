// Upstash Redis Configuration - Medeiros Veículos
// Cache persistente de alta performance para conversas e dados da IA
import { Redis } from '@upstash/redis';

// Verifica se Upstash está configurado
export const isUpstashConfigured = () => {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    !process.env.UPSTASH_REDIS_REST_URL.includes('your-') &&
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    !process.env.UPSTASH_REDIS_REST_TOKEN.includes('your-')
  );
};

// Cliente Redis (somente se configurado)
let redisClient = null;

if (isUpstashConfigured()) {
  try {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    });
    console.log('✅ Upstash Redis connected');
  } catch (error) {
    console.error('❌ Failed to connect to Upstash Redis:', error.message);
  }
} else {
  console.log('⚠️ Upstash Redis not configured - using in-memory fallback');
}

// Cache em memória como fallback (se Upstash não estiver configurado)
const memoryCache = new Map();
const MEMORY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// Funções de cache unificadas (Upstash ou memória)

/**
 * Salva conversa no cache (Redis ou memória)
 * @param {string} conversationId - ID único da conversa
 * @param {Array} messages - Array de mensagens
 * @param {number} ttlSeconds - Tempo de vida em segundos (padrão: 24h)
 */
export async function saveConversation(conversationId, messages, ttlSeconds = 86400) {
  if (redisClient) {
    // Upstash Redis (persistente)
    await redisClient.setex(
      `conv:${conversationId}`,
      ttlSeconds,
      JSON.stringify({
        messages,
        timestamp: Date.now()
      })
    );
  } else {
    // Fallback: memória (volátil)
    memoryCache.set(conversationId, {
      messages,
      timestamp: Date.now()
    });
  }
}

/**
 * Busca conversa do cache
 * @param {string} conversationId - ID único da conversa
 * @returns {Array} Array de mensagens ou []
 */
export async function getConversation(conversationId) {
  if (redisClient) {
    // Upstash Redis
    const data = await redisClient.get(`conv:${conversationId}`);
    if (data) {
      return typeof data === 'string' ? JSON.parse(data).messages : data.messages;
    }
    return [];
  } else {
    // Fallback: memória
    const cached = memoryCache.get(conversationId);
    if (!cached) return [];

    // Verifica TTL
    if (Date.now() - cached.timestamp > MEMORY_CACHE_TTL) {
      memoryCache.delete(conversationId);
      return [];
    }

    return cached.messages;
  }
}

/**
 * Deleta conversa do cache
 * @param {string} conversationId - ID único da conversa
 */
export async function deleteConversation(conversationId) {
  if (redisClient) {
    await redisClient.del(`conv:${conversationId}`);
  } else {
    memoryCache.delete(conversationId);
  }
}

/**
 * Rate limiting - verifica se usuário excedeu limite
 * @param {string} userId - ID do usuário (WhatsApp, email, etc)
 * @param {number} maxRequests - Máximo de requisições permitidas
 * @param {number} windowSeconds - Janela de tempo em segundos
 * @returns {Object} { allowed: boolean, remaining: number }
 */
export async function checkRateLimit(userId, maxRequests = 5, windowSeconds = 60) {
  if (!redisClient) {
    // Sem rate limiting se não tiver Redis
    return { allowed: true, remaining: maxRequests };
  }

  const key = `ratelimit:${userId}`;
  const current = await redisClient.incr(key);

  // Define expiração apenas na primeira requisição
  if (current === 1) {
    await redisClient.expire(key, windowSeconds);
  }

  const allowed = current <= maxRequests;
  const remaining = Math.max(0, maxRequests - current);

  return { allowed, remaining };
}

/**
 * Adquire lock distribuído (evita processamento duplicado)
 * @param {string} lockKey - Chave única do lock
 * @param {number} ttlSeconds - Tempo máximo do lock (padrão: 30s)
 * @returns {boolean} true se adquiriu lock, false se já está locked
 */
export async function acquireLock(lockKey, ttlSeconds = 30) {
  if (!redisClient) {
    // Sem locks se não tiver Redis
    return true;
  }

  const result = await redisClient.set(
    `lock:${lockKey}`,
    'locked',
    { nx: true, ex: ttlSeconds }
  );

  return result === 'OK';
}

/**
 * Libera lock distribuído
 * @param {string} lockKey - Chave única do lock
 */
export async function releaseLock(lockKey) {
  if (redisClient) {
    await redisClient.del(`lock:${lockKey}`);
  }
}

/**
 * Limpa cache antigo (apenas em memória, Redis auto-expira)
 */
export function cleanupMemoryCache() {
  if (!redisClient) {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
      if (now - value.timestamp > MEMORY_CACHE_TTL) {
        memoryCache.delete(key);
      }
    }
  }
}

// Limpa cache em memória a cada 1 hora
if (!redisClient) {
  setInterval(cleanupMemoryCache, 60 * 60 * 1000);
}

// Exporta o cliente para uso avançado
export const redis = redisClient;

// Configuração para multi-tenant (futuramente)
export function getStoreKey(storeId, key) {
  return `store:${storeId}:${key}`;
}

export default {
  saveConversation,
  getConversation,
  deleteConversation,
  checkRateLimit,
  acquireLock,
  releaseLock,
  redis,
  isUpstashConfigured
};
