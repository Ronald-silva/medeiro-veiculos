// Servidor Express para APIs - Medeiros Veículos
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateEnv } from '../src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

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

// Importa dinamicamente o handler do WhatsApp
let whatsappHandler;
async function loadWhatsAppHandler() {
  const module = await import('../api/whatsapp/process.js');
  whatsappHandler = module.default;
  console.log('✅ WhatsApp handler loaded');
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
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Rota de WhatsApp
app.post('/api/whatsapp/process', async (req, res) => {
  try {
    if (!whatsappHandler) {
      await loadWhatsAppHandler();
    }

    // Chama o handler diretamente (já é compatível com Express)
    await whatsappHandler(req, res);
  } catch (error) {
    console.error('❌ Error in WhatsApp route:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Rota catch-all para servir o index.html do frontend para rotas do React Router
app.get(/^(?!\/api)/, (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Health check
app.get('/api/health', (_req, res) => {
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('your-');
  const hasOpenAI = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-');

  res.json({
    status: 'ok',
    service: 'medeiros-veiculos-api',
    aiProvider: hasAnthropic ? 'claude-3.5-sonnet' : (hasOpenAI ? 'gpt-4o' : 'none'),
    timestamp: new Date().toISOString(),
    env: {
      anthropic: hasAnthropic,
      openai: hasOpenAI,
      supabase: !!process.env.VITE_SUPABASE_URL
    }
  });
});

// Inicia servidor
(async () => {
  try {
    await loadChatHandler();
    await loadWhatsAppHandler();

    const server = app.listen(PORT, () => {
      console.log('');
      console.log('🚀 ========================================');
      console.log('   Medeiros Veículos - API Server');
      console.log('========================================');
      console.log(`✅ Server running: http://localhost:${PORT}`);
      console.log(`📊 Health check:   http://localhost:${PORT}/api/health`);
      console.log(`💬 Chat endpoint:  http://localhost:${PORT}/api/chat/route`);
      console.log(`📱 WhatsApp:       http://localhost:${PORT}/api/whatsapp/process`);
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
