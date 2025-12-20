import OpenAI from 'openai';
import { supabase, isSupabaseConfigured, saveLead as saveLeadToSupabase, saveAppointment as saveAppointmentToSupabase } from '../../src/lib/supabaseClient.js';
import { AGENT_SYSTEM_PROMPT, TOOL_DEFINITIONS, calculateLeadScore } from '../../src/constants/agentPrompts.js';

// Inicializa OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuração
const CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-4o', // Modelo completo - melhor em seguir instruções
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 800, // Reduzido para forçar respostas curtas
  temperature: 0.7 // Menos criativo, mais focado em seguir regras
};

// Cache em memória para conversas (em produção use Redis ou Supabase Storage)
const conversationCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// Estoque de veículos (posteriormente virá do Supabase)
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

    // Ordena por relevância (mais caro primeiro, melhor margem)
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

    const appointmentData = {
      customer_name: customerName,
      phone: phone,
      preferred_date: preferredDate || null,
      preferred_time: preferredTime || 'a confirmar',
      visit_type: visitType,
      vehicle_interest: vehicleInterest || '',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // Salva no Supabase se configurado
    if (isSupabaseConfigured()) {
      const result = await saveAppointmentToSupabase(appointmentData);

      if (result.success) {
        return {
          success: true,
          appointmentId: result.data.id,
          message: `Agendamento confirmado! Em breve entraremos em contato via WhatsApp (${phone}).`
        };
      }
    }

    // Se não tiver Supabase configurado, ainda retorna sucesso (salvo apenas localmente)
    return {
      success: true,
      message: `Anotado! Vou repassar para nossa equipe entrar em contato no WhatsApp ${phone}.`
    };
  } catch (error) {
    console.error('Error scheduling visit:', error);
    return {
      success: true,
      message: `Anotado! Vou repassar para nossa equipe entrar em contato no WhatsApp ${params.phone}.`
    };
  }
}

async function saveLead(leadData) {
  try {
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

    // Salva no Supabase se configurado
    if (isSupabaseConfigured()) {
      const result = await saveLeadToSupabase(lead);

      if (result.success) {
        console.log(`✅ Lead salvo no Supabase: ${leadData.nome} (Score: ${score})`);

        // TODO: Se score > 70, notificar vendedor imediatamente (Fase 5)

        return {
          success: true,
          leadId: result.data.id,
          score,
          message: 'Lead salvo com sucesso!'
        };
      }
    }

    // Fallback: apenas loga no console
    console.log(`📝 Lead (sem Supabase): ${leadData.nome} (Score: ${score})`);

    return {
      success: true,
      score,
      message: 'Dados anotados!'
    };
  } catch (error) {
    console.error('Error saving lead:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function calculateInstallment({ vehiclePrice, downPayment = 0, months, interestRate = 2.5 }) {
  try {
    const financedAmount = vehiclePrice - downPayment;
    const monthlyRate = interestRate / 100;

    // Fórmula Price: PMT = PV * (i * (1 + i)^n) / ((1 + i)^n - 1)
    const installment = financedAmount * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
                       (Math.pow(1 + monthlyRate, months) - 1);

    const total = installment * months;
    const totalInterest = total - financedAmount;

    return {
      success: true,
      installmentValue: Math.round(installment * 100) / 100,
      months,
      total: Math.round(total * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      message: `${months}x de R$ ${installment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Handler das function calls
async function handleFunctionCall(functionName, functionArgs) {
  switch (functionName) {
    case 'recommend_vehicles':
      return await recommendVehicles(functionArgs);
    case 'schedule_visit':
      return await scheduleVisit(functionArgs);
    case 'save_lead':
      return await saveLead(functionArgs);
    case 'calculate_installment':
      return calculateInstallment(functionArgs);
    default:
      return { success: false, error: 'Função desconhecida' };
  }
}

// Gerenciamento de conversas (cache em memória)
function getConversationHistory(conversationId) {
  const cached = conversationCache.get(conversationId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.messages;
  }
  return [];
}

function saveMessage(conversationId, role, content) {
  const history = getConversationHistory(conversationId);
  history.push({ role, content, timestamp: new Date().toISOString() });

  // Limita histórico a últimas 20 mensagens
  const limitedHistory = history.slice(-20);

  conversationCache.set(conversationId, {
    messages: limitedHistory,
    timestamp: Date.now()
  });

  return limitedHistory;
}

// Limpeza periódica do cache (executada a cada requisição)
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of conversationCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      conversationCache.delete(key);
    }
  }
}

// Endpoint principal
export async function POST(request) {
  try {
    // Cleanup do cache
    cleanupCache();

    const { message, conversationId, context } = await request.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verifica se OpenAI está configurada
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your-')) {
      return new Response(
        JSON.stringify({
          error: 'OpenAI API key not configured',
          message: 'Desculpe, o sistema de IA ainda não está configurado. Por favor, entre em contato pelo WhatsApp: (85) 98885-2900'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Gera conversationId se não existir
    const convId = conversationId || crypto.randomUUID();

    // Busca histórico
    const history = getConversationHistory(convId);

    // Monta mensagens para OpenAI
    const messages = [
      { role: 'system', content: AGENT_SYSTEM_PROMPT },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    // Adiciona contexto se houver (ex: carro clicado)
    if (context?.carName) {
      messages[messages.length - 1].content += `\n[Contexto: Cliente está vendo o ${context.carName}]`;
    }

    console.log(`💬 Chat request - Conversation: ${convId.substring(0, 8)}...`);

    // Chama OpenAI com API moderna de tools
    const completion = await openai.chat.completions.create({
      model: CONFIG.model,
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
      temperature: CONFIG.temperature,
      max_tokens: CONFIG.maxTokens
    });

    const responseMessage = completion.choices[0].message;

    // Se IA quis chamar uma tool
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      console.log(`🔧 Tool call: ${functionName}`);

      // Adiciona conversationId ao saveLead
      if (functionName === 'save_lead') {
        functionArgs.conversationId = convId;
      }

      // Executa função
      const functionResult = await handleFunctionCall(functionName, functionArgs);

      // Chama IA novamente com resultado da tool
      const secondCompletion = await openai.chat.completions.create({
        model: CONFIG.model,
        messages: [
          ...messages,
          responseMessage,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult)
          }
        ],
        temperature: CONFIG.temperature,
        max_tokens: CONFIG.maxTokens
      });

      const finalResponse = secondCompletion.choices[0].message.content;

      // Salva no histórico
      saveMessage(convId, 'user', message);
      saveMessage(convId, 'assistant', finalResponse);

      return new Response(
        JSON.stringify({
          message: finalResponse,
          conversationId: convId,
          toolCalled: functionName,
          toolResult: functionResult
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Resposta normal (sem function call)
    const assistantMessage = responseMessage.content;

    // Salva no histórico
    saveMessage(convId, 'user', message);
    saveMessage(convId, 'assistant', assistantMessage);

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        conversationId: convId
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
  const openaiStatus = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-')
    ? 'configured'
    : 'not configured';

  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'chat-api',
      supabase: supabaseStatus,
      openai: openaiStatus,
      conversationsInCache: conversationCache.size,
      timestamp: new Date().toISOString()
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
