import fetch from 'node-fetch';
import { AGENT_SYSTEM_PROMPT } from '../../src/constants/agentPrompts.js';
import Anthropic from '@anthropic-ai/sdk';
import { saveConversation, getConversation } from '../../src/lib/upstash.js';

// Configuração Evolution API
const EVOLUTION_CONFIG = {
  baseUrl: process.env.EVOLUTION_API_URL || 'https://evolution-api-production-b80b.up.railway.app',
  apiKey: process.env.EVOLUTION_API_KEY,
  instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'Medeiros veículos',
  instanceToken: process.env.EVOLUTION_INSTANCE_TOKEN || '35B5967CBC09-4849-96B6-5527F4D40F4B'
};

// Cliente Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const CONFIG = {
  model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
  maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 256,
  temperature: 0.7
};

console.log('📱 WhatsApp Webhook Configuration:');
console.log('  Evolution URL:', EVOLUTION_CONFIG.baseUrl);
console.log('  Instance:', EVOLUTION_CONFIG.instanceName);
console.log('  API Key:', EVOLUTION_CONFIG.apiKey ? '✅ Configured' : '❌ Missing');

/**
 * Envia mensagem pro WhatsApp via Evolution API
 */
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    const url = `${EVOLUTION_CONFIG.baseUrl}/message/sendText/${encodeURIComponent(EVOLUTION_CONFIG.instanceName)}`;

    console.log('📤 Sending WhatsApp message:', {
      url,
      to: phoneNumber,
      messageLength: message.length
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_CONFIG.apiKey
      },
      body: JSON.stringify({
        number: phoneNumber,
        text: message
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ WhatsApp message sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    throw error;
  }
}

/**
 * Processa mensagem com a Camila (reutiliza lógica do chat)
 */
async function processCamilaMessage(userMessage, conversationId) {
  try {
    // Busca histórico da conversa
    const history = await getConversation(conversationId);

    // Adiciona data/horário de Fortaleza
    const now = new Date();
    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Fortaleza',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      weekday: 'long'
    }).formatToParts(now);

    const weekDay = parts.find(p => p.type === 'weekday')?.value || 'Segunda-feira';
    const day = parts.find(p => p.type === 'day')?.value || '01';
    const month = parts.find(p => p.type === 'month')?.value || '01';
    const year = parts.find(p => p.type === 'year')?.value || '2025';
    const hour = parts.find(p => p.type === 'hour')?.value || '12';
    const minutes = parts.find(p => p.type === 'minute')?.value || '00';

    const weekDayCapitalized = weekDay.charAt(0).toUpperCase() + weekDay.slice(1);
    const dateTimeContext = `\n[Data e horário em Fortaleza: ${weekDayCapitalized}, ${day}/${month}/${year} às ${hour}h${minutes}]`;

    // Monta mensagens para Claude
    const messages = [
      ...history,
      { role: 'user', content: userMessage + dateTimeContext }
    ];

    console.log('🤖 Processing with Camila:', {
      conversationId,
      historyLength: history.length,
      userMessage: userMessage.substring(0, 100)
    });

    // Chama Claude
    const response = await anthropic.messages.create({
      model: CONFIG.model,
      max_tokens: CONFIG.maxTokens,
      temperature: CONFIG.temperature,
      system: AGENT_SYSTEM_PROMPT,
      messages: messages
    });

    const assistantMessage = response.content[0].text;

    // Salva no histórico
    const updatedHistory = [
      ...history,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() }
    ];

    await saveConversation(conversationId, updatedHistory.slice(-10), 86400);

    console.log('✅ Camila response generated:', assistantMessage.substring(0, 100));
    return assistantMessage;
  } catch (error) {
    console.error('❌ Error processing with Camila:', error);
    throw error;
  }
}

/**
 * Webhook POST handler
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const webhookData = req.body;

    console.log('📨 WhatsApp Webhook received:', JSON.stringify(webhookData, null, 2));

    // Verifica se é mensagem recebida (não enviada por nós)
    const event = webhookData.event;
    const data = webhookData.data;

    if (event !== 'messages.upsert') {
      console.log('ℹ️ Ignoring event:', event);
      return res.status(200).json({ status: 'ignored', event });
    }

    // Ignora mensagens enviadas pela própria Camila
    if (data.key?.fromMe) {
      console.log('ℹ️ Ignoring message from me');
      return res.status(200).json({ status: 'ignored', reason: 'fromMe' });
    }

    // Extrai dados da mensagem
    const phoneNumber = data.key?.remoteJid?.replace('@s.whatsapp.net', '');
    const messageText = data.message?.conversation ||
                       data.message?.extendedTextMessage?.text ||
                       '';

    if (!phoneNumber || !messageText) {
      console.log('⚠️ Missing phone or message');
      return res.status(200).json({ status: 'ignored', reason: 'missing_data' });
    }

    console.log('💬 Processing message from:', phoneNumber);

    // ID da conversa = número do WhatsApp
    const conversationId = `whatsapp_${phoneNumber}`;

    // Processa com Camila
    const camilaResponse = await processCamilaMessage(messageText, conversationId);

    // Envia resposta pro WhatsApp
    await sendWhatsAppMessage(phoneNumber, camilaResponse);

    return res.status(200).json({
      status: 'success',
      conversationId,
      phoneNumber,
      userMessage: messageText.substring(0, 100),
      response: camilaResponse.substring(0, 100)
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
