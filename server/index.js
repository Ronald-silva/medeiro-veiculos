// Servidor Express para APIs - Medeiros Veículos
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateEnv } from '../src/config/env.js';
import { initSentry, captureException } from '../src/lib/sentry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Inicializa Sentry ANTES de qualquer outra coisa (captura erros de inicialização)
initSentry();

// Valida variáveis de ambiente ANTES de iniciar o servidor
const envValidation = validateEnv();
if (!envValidation.success) {
  console.error(envValidation.error);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Para Twilio webhooks

// Servir arquivos estáticos do frontend (Vite build)
const buildPath = path.join(__dirname, '..', 'dist');
app.use(express.static(buildPath));

// Importa dinamicamente o handler do chat
let chatHandler;
async function loadChatHandler() {
  const module = await import('../api/chat/route.js');
  chatHandler = module.POST;
  console.log('✅ Chat handler loaded');
}

// Importa dinamicamente o handler do WhatsApp (Evolution API)
let whatsappHandler;
async function loadWhatsAppHandler() {
  const module = await import('../api/whatsapp/process.js');
  whatsappHandler = module.default;
  console.log('✅ WhatsApp Evolution handler loaded');
}

// Importa dinamicamente o handler do Twilio
let twilioHandler;
async function loadTwilioHandler() {
  const module = await import('../api/whatsapp/twilio.js');
  twilioHandler = module.default;
  console.log('✅ WhatsApp Twilio handler loaded');
}

// Importa dinamicamente o handler de conversas
let conversationsHandler;
async function loadConversationsHandler() {
  const module = await import('../api/conversations/route.js');
  conversationsHandler = module.default;
  console.log('✅ Conversations handler loaded');
}

// Rota de chat
app.post('/api/chat/route', async (req, res) => {
  try {
    if (!chatHandler) {
      await loadChatHandler();
    }

    // Cria objeto Request compatível com Vercel/Next.js
    // Adiciona método .get() para headers (compatível com Web Fetch API)
    const headers = {
      get: (key) => req.headers[key.toLowerCase()],
      has: (key) => key.toLowerCase() in req.headers,
      ...req.headers
    };

    const request = {
      method: 'POST',
      headers,
      json: async () => req.body
    };

    // Chama o handler
    const response = await chatHandler(request);

    // Converte Response para JSON
    const data = await response.json();

    // Envia resposta
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Error in chat route:', error);
    captureException(error, { service: 'chat-route' });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Rota de WhatsApp (Evolution API - legado)
app.post('/api/whatsapp/process', async (req, res) => {
  try {
    if (!whatsappHandler) {
      await loadWhatsAppHandler();
    }

    // Chama o handler diretamente (já é compatível com Express)
    await whatsappHandler(req, res);
  } catch (error) {
    console.error('❌ Error in WhatsApp route:', error);
    captureException(error, { service: 'whatsapp-evolution' });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Rota de WhatsApp (Twilio)
app.post('/api/whatsapp/twilio', async (req, res) => {
  try {
    if (!twilioHandler) {
      await loadTwilioHandler();
    }

    // Chama o handler diretamente
    await twilioHandler(req, res);
  } catch (error) {
    console.error('❌ Error in Twilio route:', error);
    captureException(error, { service: 'whatsapp-twilio' });
    res.status(200).send('OK'); // Twilio espera 200 mesmo com erro
  }
});

// Rota de conversas (GET para listar conversas e mensagens)
app.get('/api/conversations', async (req, res) => {
  try {
    if (!conversationsHandler) {
      await loadConversationsHandler();
    }
    await conversationsHandler(req, res);
  } catch (error) {
    console.error('❌ Error in conversations route:', error);
    captureException(error, { service: 'conversations' });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// =====================================================
// 📊 ROTAS DE MÉTRICAS DE QUALIFICAÇÃO (SUPERPOTÊNCIA)
// =====================================================
let qualificationMetricsHandler;
async function loadQualificationMetricsHandler() {
  const module = await import('../src/api/handlers/qualificationMetrics.js');
  qualificationMetricsHandler = module;
  console.log('✅ Qualification Metrics handler loaded');
}

// GET /api/qualification-metrics - Resumo de métricas
app.get('/api/qualification-metrics', async (req, res) => {
  try {
    if (!qualificationMetricsHandler) {
      await loadQualificationMetricsHandler();
    }
    await qualificationMetricsHandler.handleGetQualificationMetrics(req, res);
  } catch (error) {
    console.error('❌ Error in qualification metrics route:', error);
    captureException(error, { service: 'qualification-metrics' });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/qualification-metrics/daily - Métricas por dia
app.get('/api/qualification-metrics/daily', async (req, res) => {
  try {
    if (!qualificationMetricsHandler) {
      await loadQualificationMetricsHandler();
    }
    await qualificationMetricsHandler.handleGetQualificationDaily(req, res);
  } catch (error) {
    console.error('❌ Error in daily metrics route:', error);
    captureException(error, { service: 'qualification-metrics-daily' });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Rota catch-all para servir o index.html do frontend para rotas do React Router
app.get(/^(?!\/api)/, (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Health check - verifica status real dos serviços
app.get('/api/health', async (_req, res) => {
  const startTime = Date.now();
  const checks = {};
  let overallStatus = 'healthy';

  // 1. Verifica variáveis de ambiente
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('your-');
  const hasOpenAI = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-');
  const hasSupabase = !!process.env.VITE_SUPABASE_URL && !!process.env.VITE_SUPABASE_ANON_KEY;
  const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

  checks.config = {
    status: hasAnthropic || hasOpenAI ? 'ok' : 'warning',
    anthropic: hasAnthropic,
    openai: hasOpenAI,
    supabase: hasSupabase,
    upstash: hasUpstash
  };

  // 2. Verifica Redis/Upstash (se configurado)
  if (hasUpstash) {
    try {
      const { isUpstashConfigured, redis } = await import('../src/lib/upstash.js');
      if (isUpstashConfigured() && redis) {
        await redis.ping();
        checks.redis = { status: 'ok', latency: Date.now() - startTime };
      } else {
        checks.redis = { status: 'not_configured' };
      }
    } catch (error) {
      checks.redis = { status: 'error', message: error.message };
      overallStatus = 'degraded';
    }
  } else {
    checks.redis = { status: 'not_configured' };
  }

  // 3. Verifica Circuit Breakers
  try {
    const { getCircuitsStatus } = await import('../src/lib/circuit-breaker.js');
    const circuitStatus = getCircuitsStatus();
    const openCircuits = Object.entries(circuitStatus).filter(([_, c]) => c.state === 'OPEN');

    checks.circuits = {
      status: openCircuits.length > 0 ? 'warning' : 'ok',
      total: Object.keys(circuitStatus).length,
      open: openCircuits.length,
      details: circuitStatus
    };

    if (openCircuits.length > 0) {
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
    }
  } catch {
    checks.circuits = { status: 'ok', total: 0 };
  }

  // 4. Verifica memória
  const memUsage = process.memoryUsage();
  const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  checks.memory = {
    status: memMB < 450 ? 'ok' : 'warning',
    heapUsedMB: memMB,
    heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024)
  };

  // 5. Uptime
  checks.uptime = {
    status: 'ok',
    seconds: Math.floor(process.uptime())
  };

  const responseTime = Date.now() - startTime;

  res.status(overallStatus === 'healthy' ? 200 : 503).json({
    status: overallStatus,
    service: 'medeiros-veiculos-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    responseTimeMs: responseTime,
    checks
  });
});

// Inicia servidor
(async () => {
  try {
    await loadChatHandler();
    await loadWhatsAppHandler();
    await loadTwilioHandler();
    await loadConversationsHandler();

    const server = app.listen(PORT, () => {
      console.log('');
      console.log('🚀 ========================================');
      console.log('   Medeiros Veículos - API Server');
      console.log('========================================');
      console.log(`✅ Server running: http://localhost:${PORT}`);
      console.log(`📊 Health check:   http://localhost:${PORT}/api/health`);
      console.log(`💬 Chat endpoint:  http://localhost:${PORT}/api/chat/route`);
      console.log(`📱 Twilio:         http://localhost:${PORT}/api/whatsapp/twilio`);
      console.log(`💬 Conversas:      http://localhost:${PORT}/api/conversations`);
      console.log('========================================');
      console.log('');
    });

    // Mantém o processo vivo
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, closing server...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, closing server...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();
