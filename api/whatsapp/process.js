import { AGENT_SYSTEM_PROMPT, TOOL_DEFINITIONS, calculateLeadScore } from '../../src/constants/agentPrompts.js';
import Anthropic from '@anthropic-ai/sdk';
import { saveConversation, getConversation } from '../../src/lib/upstash.js';
import { isSupabaseConfigured, saveLead as saveLeadToSupabase, saveAppointment as saveAppointmentToSupabase } from '../../src/lib/supabaseClient.js';

// Cliente Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const CONFIG = {
  model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
  maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 256,
  temperature: 0.7
};

// Converte tools para formato Claude
function convertToolsForClaude(tools) {
  return tools.map(tool => ({
    name: tool.function.name,
    description: tool.function.description,
    input_schema: tool.function.parameters
  }));
}

// Function handlers
async function scheduleVisit(params) {
  try {
    const { customerName, phone, preferredDate, preferredTime, visitType, vehicleInterest } = params;

    if (!customerName || !phone) {
      console.error('❌ scheduleVisit: missing required params', { customerName, phone });
      return {
        success: false,
        error: 'Nome e telefone são obrigatórios',
        message: 'Preciso do seu nome completo e WhatsApp para confirmar o agendamento. Pode me passar?'
      };
    }

    // Converter data do formato brasileiro (DD/MM/YYYY) para ISO (YYYY-MM-DD)
    let scheduledDate = null;
    if (preferredDate) {
      const dateParts = preferredDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dateParts) {
        scheduledDate = `${dateParts[3]}-${dateParts[2]}-${dateParts[1]}`;
      } else {
        scheduledDate = preferredDate;
      }
    }

    const appointmentData = {
      customer_name: customerName,
      phone: phone,
      scheduled_date: scheduledDate,
      scheduled_time: preferredTime || 'a confirmar',
      visit_type: visitType || 'visit',
      vehicle_interest: vehicleInterest || '',
      status: 'confirmado',
      created_at: new Date().toISOString()
    };

    console.log('📅 [WhatsApp] Agendando visita:', { customerName, phone, visitType });

    if (isSupabaseConfigured()) {
      const result = await saveAppointmentToSupabase(appointmentData);

      if (result.success) {
        console.log('✅ [WhatsApp] Agendamento salvo no Supabase:', result.data.id);
        return {
          success: true,
          appointmentId: result.data.id,
          message: `Agendamento confirmado! Em breve entraremos em contato via WhatsApp (${phone}).`
        };
      } else {
        console.warn('⚠️ [WhatsApp] Falha ao salvar no Supabase:', result.error);
      }
    }

    console.log('📝 [WhatsApp] Agendamento (sem Supabase):', appointmentData);
    return {
      success: true,
      message: `Anotado! Vou repassar para nossa equipe entrar em contato no WhatsApp ${phone}.`
    };
  } catch (error) {
    console.error('❌ [WhatsApp] Error in scheduleVisit:', error);
    return {
      success: true,
      message: `Anotado! Vou repassar para nossa equipe entrar em contato no WhatsApp ${params.phone || 'fornecido'}.`
    };
  }
}

async function saveLead(leadData) {
  try {
    if (!leadData.nome || !leadData.whatsapp || !leadData.orcamento) {
      console.error('❌ [WhatsApp] saveLead: missing required params', {
        nome: leadData.nome,
        whatsapp: leadData.whatsapp,
        orcamento: leadData.orcamento
      });
      return {
        success: false,
        error: 'Nome, WhatsApp e orçamento são obrigatórios',
        message: 'Preciso do seu nome, WhatsApp e orçamento para seguir. Pode me passar essas informações?'
      };
    }

    const score = calculateLeadScore(leadData);

    const lead = {
      conversation_id: leadData.conversationId || crypto.randomUUID(),
      nome: leadData.nome,
      whatsapp: leadData.whatsapp,
      email: leadData.email || null,
      orcamento: leadData.orcamento,
      tipo_carro: leadData.tipoCarro || '',
      forma_pagamento: leadData.formaPagamento || '',
      urgencia: leadData.urgencia || 'media',
      tem_troca: leadData.temTroca || false,
      veiculos_interesse: leadData.veiculosInteresse || [],
      observacoes: leadData.observacoes || '',
      score: score,
      status: 'novo',
      created_at: new Date().toISOString()
    };

    console.log(`💾 [WhatsApp] Salvando lead: ${leadData.nome} (Score: ${score})`);

    if (isSupabaseConfigured()) {
      const result = await saveLeadToSupabase(lead);

      if (result.success) {
        console.log(`✅ [WhatsApp] Lead salvo no Supabase: ${leadData.nome} (ID: ${result.data.id})`);
        return {
          success: true,
          leadId: result.data.id,
          score,
          message: 'Lead salvo com sucesso!'
        };
      } else {
        console.warn('⚠️ [WhatsApp] Falha ao salvar lead no Supabase:', result.error);
      }
    }

    console.log(`📝 [WhatsApp] Lead (sem Supabase): ${leadData.nome} (Score: ${score})`);
    return {
      success: true,
      score,
      message: 'Dados anotados!'
    };
  } catch (error) {
    console.error('❌ [WhatsApp] Error in saveLead:', error);
    return {
      success: true,
      score: 50,
      message: 'Dados anotados!'
    };
  }
}

async function handleFunctionCall(functionName, functionArgs, conversationId) {
  console.log(`🔧 [WhatsApp] Function called: ${functionName}`, JSON.stringify(functionArgs, null, 2));

  try {
    let result;

    switch (functionName) {
      case 'schedule_visit':
        result = await scheduleVisit(functionArgs);
        break;
      case 'save_lead':
        // Adiciona conversationId ao saveLead
        functionArgs.conversationId = conversationId;
        result = await saveLead(functionArgs);
        break;
      default:
        result = { success: false, error: 'Função desconhecida' };
    }

    console.log(`✅ [WhatsApp] Function result: ${functionName}`, result.success ? 'SUCCESS' : 'FAILED');
    return result;
  } catch (error) {
    console.error(`❌ [WhatsApp] Error in function ${functionName}:`, error);
    return {
      success: false,
      error: error.message,
      message: 'Desculpe, tive um problema. Pode repetir?'
    };
  }
}

/**
 * Processa mensagem com a Camila
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

    // Monta mensagens para Claude (remove timestamp que não é aceito pela API)
    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage + dateTimeContext }
    ];

    console.log('🤖 Processing with Camila:', {
      conversationId,
      historyLength: history.length,
      userMessage: userMessage.substring(0, 100)
    });

    // Converte tools para formato Claude
    const claudeTools = convertToolsForClaude(TOOL_DEFINITIONS);

    // Chama Claude com tools
    const response = await anthropic.messages.create({
      model: CONFIG.model,
      max_tokens: CONFIG.maxTokens,
      temperature: CONFIG.temperature,
      system: AGENT_SYSTEM_PROMPT,
      messages: messages,
      tools: claudeTools
    });

    let assistantMessage;
    let toolCalled = null;

    // Se Claude quis usar tool(s)
    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter(block => block.type === 'tool_use');

      if (toolUses.length > 0) {
        console.log(`🔧 [WhatsApp] Claude tool use: ${toolUses.length} tool(s) requested`);

        // Executar TODAS as funções
        const toolResults = [];
        for (const toolUse of toolUses) {
          const functionName = toolUse.name;
          const functionArgs = toolUse.input;

          console.log(`  ├─ Executing: ${functionName}`);

          const functionResult = await handleFunctionCall(functionName, functionArgs, conversationId);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(functionResult)
          });
        }

        // Chama Claude novamente com TODOS os resultados
        const messagesWithToolResult = [
          ...messages,
          {
            role: 'assistant',
            content: response.content
          },
          {
            role: 'user',
            content: toolResults
          }
        ];

        console.log(`🔍 [WhatsApp] Sending ${messagesWithToolResult.length} messages to Claude after tool execution`);

        const finalResponse = await anthropic.messages.create({
          model: CONFIG.model,
          max_tokens: CONFIG.maxTokens,
          temperature: CONFIG.temperature,
          system: AGENT_SYSTEM_PROMPT,
          messages: messagesWithToolResult,
          tools: claudeTools
        });

        const textBlock = finalResponse.content.find(block => block.type === 'text');
        assistantMessage = textBlock?.text || 'Desculpe, não entendi.';
        toolCalled = toolUses.map(t => t.name).join(', ');
      }
    } else {
      // Resposta normal sem tool use
      const textBlock = response.content.find(block => block.type === 'text');
      assistantMessage = textBlock?.text || response.content[0].text;
    }

    // Salva no histórico
    const updatedHistory = [
      ...history,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() }
    ];

    await saveConversation(conversationId, updatedHistory.slice(-10), 86400);

    if (toolCalled) {
      console.log(`✅ Camila response with tool: ${toolCalled} - ${assistantMessage.substring(0, 100)}`);
    } else {
      console.log('✅ Camila response generated:', assistantMessage.substring(0, 100));
    }

    return assistantMessage;
  } catch (error) {
    console.error('❌ Error processing with Camila:', error);
    throw error;
  }
}

/**
 * Endpoint POST para processar mensagens (sem enviar de volta)
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
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'phoneNumber and message are required' });
    }

    console.log('💬 Processing message from:', phoneNumber);

    // ID da conversa = número do WhatsApp
    const conversationId = `whatsapp_${phoneNumber}`;

    // Processa com Camila
    const camilaResponse = await processCamilaMessage(message, conversationId);

    return res.status(200).json({
      status: 'success',
      response: camilaResponse
    });

  } catch (error) {
    console.error('❌ Process error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
