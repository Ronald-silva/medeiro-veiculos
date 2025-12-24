import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { supabase, isSupabaseConfigured, saveLead as saveLeadToSupabase, saveAppointment as saveAppointmentToSupabase } from '../../src/lib/supabaseClient.js';
import { AGENT_SYSTEM_PROMPT, TOOL_DEFINITIONS, calculateLeadScore } from '../../src/constants/agentPrompts.js';

// Detecta qual API usar (Anthropic preferido, OpenAI como fallback)
const USE_ANTHROPIC = process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('your-');
const USE_OPENAI = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-');

// Debug logs
console.log('🔍 API Detection:');
console.log('  ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? `${process.env.ANTHROPIC_API_KEY.substring(0, 10)}...` : 'NOT SET');
console.log('  USE_ANTHROPIC:', USE_ANTHROPIC);
console.log('  USE_OPENAI:', USE_OPENAI);
console.log('  Selected:', USE_ANTHROPIC ? 'CLAUDE' : (USE_OPENAI ? 'OPENAI' : 'NONE'));

// Inicializa clients
const anthropic = USE_ANTHROPIC ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
}) : null;

const openai = USE_OPENAI ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

// Configuração
const CONFIG = {
  anthropic: {
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 512,
    temperature: 0.7
  },
  openai: {
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 800,
    temperature: 0.7
  }
};

// Cache em memória para conversas
const conversationCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// Estoque de veículos (fallback - posteriormente virá do Supabase)
const VEHICLES_INVENTORY = [
  {
    id: 1,
    name: 'Honda HR-V EXL 2022',
    price: 145900,
    type: 'SUV',
    year: 2022,
    km: 35000,
    features: ['Automático', 'Flex', 'Completo'],
    description: 'SUV premium com excelente custo-benefício'
  },
  {
    id: 2,
    name: 'Toyota Corolla XEI 2023',
    price: 139900,
    type: 'Sedan',
    year: 2023,
    km: 28000,
    features: ['Automático', 'Flex', 'Couro'],
    description: 'Sedan confortável e econômico'
  },
  {
    id: 3,
    name: 'Jeep Compass Limited 2022',
    price: 169900,
    type: 'SUV',
    year: 2022,
    km: 42000,
    features: ['Automático', 'Diesel', '4x4'],
    description: 'SUV robusto para aventuras'
  }
];

// Converte tools para formato Claude (Claude usa input_schema em vez de parameters)
function convertToolsForClaude(tools) {
  return tools.map(tool => ({
    name: tool.function.name,
    description: tool.function.description,
    input_schema: tool.function.parameters
  }));
}

// Function handlers
async function recommendVehicles({ budget, vehicleType, maxResults = 2 }) {
  try {
    // Parse do orçamento
    let maxBudget = 200000;
    if (budget.includes('até')) {
      maxBudget = parseInt(budget.match(/\d+/)?.[0]) * 1000 || 150000;
    } else if (budget.includes('-')) {
      const matches = budget.match(/\d+/g);
      maxBudget = parseInt(matches?.[1]) * 1000 || 200000;
    }

    // Tenta buscar do Supabase primeiro
    if (isSupabaseConfigured()) {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'available')
        .lte('price', maxBudget)
        .order('price', { ascending: false })
        .limit(3);

      if (vehicles && vehicles.length > 0) {
        return {
          success: true,
          vehicles: vehicles.slice(0, maxResults),
          message: `Encontrei ${vehicles.length} veículo(is) no seu orçamento`
        };
      }
    }

    // Fallback para inventário hardcoded
    let recommendations = VEHICLES_INVENTORY.filter(v => v.price <= maxBudget);

    if (vehicleType && vehicleType.length > 0) {
      recommendations = recommendations.filter(v =>
        vehicleType.some(type => type.toLowerCase() === v.type.toLowerCase())
      );
    }

    recommendations.sort((a, b) => b.price - a.price);

    return {
      success: true,
      vehicles: recommendations.slice(0, maxResults),
      message: `Encontrei ${recommendations.length} veículo(is) no seu orçamento`
    };
  } catch (error) {
    console.error('Error recommending vehicles:', error);
    return { success: false, error: error.message };
  }
}

async function scheduleVisit(params) {
  try {
    const { customerName, phone, preferredDate, preferredTime, visitType, vehicleInterest } = params;

    // Validação de parâmetros obrigatórios
    if (!customerName || !phone) {
      console.error('❌ scheduleVisit: missing required params', { customerName, phone });
      return {
        success: false,
        error: 'Nome e telefone são obrigatórios',
        message: 'Preciso do seu nome completo e WhatsApp para confirmar o agendamento. Pode me passar?'
      };
    }

    const appointmentData = {
      customer_name: customerName,
      phone: phone,
      preferred_date: preferredDate || null,
      preferred_time: preferredTime || 'a confirmar',
      visit_type: visitType || 'visit',
      vehicle_interest: vehicleInterest || '',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    console.log('📅 Agendando visita:', { customerName, phone, visitType });

    if (isSupabaseConfigured()) {
      const result = await saveAppointmentToSupabase(appointmentData);

      if (result.success) {
        console.log('✅ Agendamento salvo no Supabase:', result.data.id);
        return {
          success: true,
          appointmentId: result.data.id,
          message: `Agendamento confirmado! Em breve entraremos em contato via WhatsApp (${phone}).`
        };
      } else {
        console.warn('⚠️ Falha ao salvar no Supabase:', result.error);
      }
    }

    // Fallback se não tiver Supabase
    console.log('📝 Agendamento (sem Supabase):', appointmentData);
    return {
      success: true,
      message: `Anotado! Vou repassar para nossa equipe entrar em contato no WhatsApp ${phone}.`
    };
  } catch (error) {
    console.error('❌ Error in scheduleVisit:', error);
    return {
      success: true, // Mesmo com erro, confirma pro usuário
      message: `Anotado! Vou repassar para nossa equipe entrar em contato no WhatsApp ${params.phone || 'fornecido'}.`
    };
  }
}

async function saveLead(leadData) {
  try {
    // Validação de parâmetros obrigatórios
    if (!leadData.nome || !leadData.whatsapp || !leadData.orcamento) {
      console.error('❌ saveLead: missing required params', {
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

    console.log(`💾 Salvando lead: ${leadData.nome} (Score: ${score})`);

    if (isSupabaseConfigured()) {
      const result = await saveLeadToSupabase(lead);

      if (result.success) {
        console.log(`✅ Lead salvo no Supabase: ${leadData.nome} (ID: ${result.data.id})`);

        return {
          success: true,
          leadId: result.data.id,
          score,
          message: 'Lead salvo com sucesso!'
        };
      } else {
        console.warn('⚠️ Falha ao salvar lead no Supabase:', result.error);
      }
    }

    // Fallback se não tiver Supabase
    console.log(`📝 Lead (sem Supabase): ${leadData.nome} (Score: ${score})`);

    return {
      success: true,
      score,
      message: 'Dados anotados!'
    };
  } catch (error) {
    console.error('❌ Error in saveLead:', error);
    return {
      success: true, // Mesmo com erro, confirma pro usuário
      score: 50,
      message: 'Dados anotados!'
    };
  }
}

// Handler das function calls
async function handleFunctionCall(functionName, functionArgs) {
  console.log(`🔧 Function called: ${functionName}`, JSON.stringify(functionArgs, null, 2));

  try {
    let result;

    switch (functionName) {
      case 'recommend_vehicles':
        result = await recommendVehicles(functionArgs);
        break;
      case 'schedule_visit':
        result = await scheduleVisit(functionArgs);
        break;
      case 'save_lead':
        result = await saveLead(functionArgs);
        break;
      default:
        result = { success: false, error: 'Função desconhecida' };
    }

    console.log(`✅ Function result: ${functionName}`, result.success ? 'SUCCESS' : 'FAILED');
    return result;
  } catch (error) {
    console.error(`❌ Error in function ${functionName}:`, error);
    return {
      success: false,
      error: error.message,
      message: 'Desculpe, tive um problema. Pode repetir?'
    };
  }
}

// Gerenciamento de conversas
function getConversationHistory(conversationId) {
  const cached = conversationCache.get(conversationId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.messages;
  }
  return [];
}

function saveMessage(conversationId, role, content) {
  const history = getConversationHistory(conversationId);

  // Se content não é string, não salvar no cache (evita problemas com tool_use)
  if (typeof content !== 'string') {
    console.log('⚠️ Skipping non-string message from cache');
    return history;
  }

  history.push({ role, content, timestamp: new Date().toISOString() });

  // Limitar histórico a apenas 6 mensagens para evitar timeout no Vercel
  // Isso mantém 3 trocas (user + assistant) - otimizado para serverless
  const limitedHistory = history.slice(-6);

  conversationCache.set(conversationId, {
    messages: limitedHistory,
    timestamp: Date.now()
  });

  return limitedHistory;
}

function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of conversationCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      conversationCache.delete(key);
    }
  }
}

// Helper para timeout
function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
}

// Chat usando Anthropic Claude
async function chatWithClaude(messages, convId) {
  const claudeTools = convertToolsForClaude(TOOL_DEFINITIONS);

  // Filtrar e garantir que apenas mensagens com conteúdo string sejam enviadas
  const cleanMessages = messages
    .filter(m => typeof m.content === 'string' && m.content.trim().length > 0)
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

  console.log(`📨 Sending ${cleanMessages.length} messages to Claude`);

  // Claude precisa do system message separado
  // Timeout de 8s (antes do limite de 10s do Vercel)
  const response = await withTimeout(
    anthropic.messages.create({
      model: CONFIG.anthropic.model,
      max_tokens: CONFIG.anthropic.maxTokens,
      temperature: CONFIG.anthropic.temperature,
      system: AGENT_SYSTEM_PROMPT,
      messages: cleanMessages,
      tools: claudeTools
    }),
    8000
  );

  // Se Claude quis usar tool(s)
  if (response.stop_reason === 'tool_use') {
    // Encontrar TODAS as tools que Claude quer usar (pode ser múltiplas!)
    const toolUses = response.content.filter(block => block.type === 'tool_use');

    if (toolUses.length > 0) {
      console.log(`🔧 Claude tool use: ${toolUses.length} tool(s) requested`);

      // Executar TODAS as funções
      const toolResults = [];
      for (const toolUse of toolUses) {
        const functionName = toolUse.name;
        const functionArgs = toolUse.input;

        console.log(`  ├─ Executing: ${functionName}`);

        // Adiciona conversationId ao saveLead
        if (functionName === 'save_lead') {
          functionArgs.conversationId = convId;
        }

        // Executa função
        const functionResult = await handleFunctionCall(functionName, functionArgs);

        // Adiciona ao array de resultados
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(functionResult)
        });
      }

      // Chama Claude novamente com TODOS os resultados
      // IMPORTANTE: Filtrar apenas mensagens string (evita tool_use sem tool_result)
      const cleanMessagesForToolResult = messages
        .filter(m => typeof m.content === 'string' && m.content.trim().length > 0)
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }));

      // IMPORTANTE: Incluir histórico limpo + tool_use + TODOS tool_results
      const messagesWithToolResult = [
        ...cleanMessagesForToolResult,
        {
          role: 'assistant',
          content: response.content  // Inclui TODOS os tool_use blocks
        },
        {
          role: 'user',
          content: toolResults  // Array com TODOS os tool_results
        }
      ];

      console.log(`🔍 DEBUG: Sending ${messagesWithToolResult.length} messages to Claude after tool execution`);
      console.log(`🔍 DEBUG: Processed ${toolResults.length} tool results`);

      const finalResponse = await withTimeout(
        anthropic.messages.create({
          model: CONFIG.anthropic.model,
          max_tokens: CONFIG.anthropic.maxTokens,
          temperature: CONFIG.anthropic.temperature,
          system: AGENT_SYSTEM_PROMPT,
          messages: messagesWithToolResult,
          tools: claudeTools
        }),
        8000
      );

      const textBlock = finalResponse.content.find(block => block.type === 'text');
      const responseMessage = textBlock?.text || 'Desculpe, não entendi.';

      return {
        message: responseMessage,
        toolCalled: toolUses.map(t => t.name).join(', '),
        toolResult: toolResults,
        shouldSaveToHistory: true
      };
    }
  }

  // Resposta normal
  const textBlock = response.content.find(block => block.type === 'text');
  return {
    message: textBlock?.text || 'Desculpe, não entendi.',
    shouldSaveToHistory: true // Sinaliza que é seguro salvar no histórico
  };
}

// Chat usando OpenAI (fallback)
async function chatWithOpenAI(messages, convId) {
  const completion = await openai.chat.completions.create({
    model: CONFIG.openai.model,
    messages: [
      { role: 'system', content: AGENT_SYSTEM_PROMPT },
      ...messages.map(h => ({ role: h.role, content: h.content }))
    ],
    tools: TOOL_DEFINITIONS,
    tool_choice: 'auto',
    temperature: CONFIG.openai.temperature,
    max_tokens: CONFIG.openai.maxTokens
  });

  const responseMessage = completion.choices[0].message;

  // Se IA quis chamar uma tool
  if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
    const toolCall = responseMessage.tool_calls[0];
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);

    console.log(`🔧 OpenAI tool call: ${functionName}`);

    if (functionName === 'save_lead') {
      functionArgs.conversationId = convId;
    }

    const functionResult = await handleFunctionCall(functionName, functionArgs);

    const secondCompletion = await openai.chat.completions.create({
      model: CONFIG.openai.model,
      messages: [
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
        ...messages.map(h => ({ role: h.role, content: h.content })),
        responseMessage,
        {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult)
        }
      ],
      temperature: CONFIG.openai.temperature,
      max_tokens: CONFIG.openai.maxTokens
    });

    return {
      message: secondCompletion.choices[0].message.content,
      toolCalled: functionName,
      toolResult: functionResult
    };
  }

  return {
    message: responseMessage.content
  };
}

// Endpoint principal
export async function POST(request) {
  try {
    cleanupCache();

    const { message, conversationId, context } = await request.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verifica se alguma API está configurada
    if (!USE_ANTHROPIC && !USE_OPENAI) {
      return new Response(
        JSON.stringify({
          error: 'No AI API configured',
          message: 'Configure ANTHROPIC_API_KEY ou OPENAI_API_KEY no arquivo .env.local'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const convId = conversationId || crypto.randomUUID();
    const history = getConversationHistory(convId);

    // Adiciona contexto se houver
    let userMessage = message;

    // Adiciona data e horário atual de Fortaleza
    const now = new Date();

    // Extrair componentes de forma segura usando Intl
    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Fortaleza',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      weekday: 'long'
    }).formatToParts(now);

    const weekDay = parts.find(p => p.type === 'weekday')?.value || 'Terça-feira';
    const day = parts.find(p => p.type === 'day')?.value || '24';
    const month = parts.find(p => p.type === 'month')?.value || '12';
    const year = parts.find(p => p.type === 'year')?.value || '2024';
    const hour = parts.find(p => p.type === 'hour')?.value || '14';
    const minutes = parts.find(p => p.type === 'minute')?.value || '00';

    // Capitalize primeira letra do dia da semana
    const weekDayCapitalized = weekDay.charAt(0).toUpperCase() + weekDay.slice(1);

    const dateTimeContext = `\n[Data e horário em Fortaleza: ${weekDayCapitalized}, ${day}/${month}/${year} às ${hour}h${minutes}]`;

    if (context?.carName) {
      userMessage += `\n[Contexto: Cliente está vendo o ${context.carName}]`;
    }

    userMessage += dateTimeContext;

    // Monta histórico de mensagens
    const messages = [
      ...history,
      { role: 'user', content: userMessage }
    ];

    console.log(`💬 Chat request - Conversation: ${convId.substring(0, 8)}... - Using: ${USE_ANTHROPIC ? 'Claude' : 'OpenAI'}`);

    // Chama a API apropriada
    let result;
    if (USE_ANTHROPIC) {
      result = await chatWithClaude(messages, convId);
    } else {
      result = await chatWithOpenAI(messages, convId);
    }

    // Salva no histórico
    saveMessage(convId, 'user', message);
    saveMessage(convId, 'assistant', result.message);

    return new Response(
      JSON.stringify({
        message: result.message,
        conversationId: convId,
        aiProvider: USE_ANTHROPIC ? 'claude' : 'openai',
        ...(result.toolCalled && { toolCalled: result.toolCalled }),
        ...(result.toolResult && { toolResult: result.toolResult })
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in chat API:', error);

    return new Response(
      JSON.stringify({
        error: 'Desculpe, ocorreu um erro. Tente novamente.',
        details: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Endpoint GET para health check
export async function GET() {
  const supabaseStatus = isSupabaseConfigured() ? 'configured' : 'not configured';
  const aiProvider = USE_ANTHROPIC ? 'claude-3.5-sonnet' : (USE_OPENAI ? 'gpt-4o' : 'none');

  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'chat-api',
      supabase: supabaseStatus,
      aiProvider,
      conversationsInCache: conversationCache.size,
      timestamp: new Date().toISOString()
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
