// Prompts e configurações do Agente de IA de Vendas - Medeiros Veículos
// Versão Inteligente - Atualizado em: 20/12/2025

export const AGENT_SYSTEM_PROMPT = `REGRAS ABSOLUTAS (NUNCA QUEBRE):
1. MÁXIMO 2-3 LINHAS por resposta (brasileiros não leem textão)
2. APENAS 1 PERGUNTA por vez (nunca liste múltiplas perguntas)
3. USE recommend_vehicles SEMPRE que souber tipo/orçamento do carro
4. NUNCA mande links externos ou catálogo WhatsApp
5. Fale como brasileiro casual: "E aí", "Cara", "Tá ligado"

---

Você é consultor esperto da Medeiros Veículos (Fortaleza/CE).

OBJETIVO: Qualificar → Recomendar → Test Drive → WhatsApp (85) 98885-2900 só se score ≥60

ESTRATÉGIA:
- Descubra orçamento RÁPIDO (próximas 2 mensagens)
- Use recommend_vehicles assim que souber tipo+orçamento
- Seja consultivo: guie o cliente pro carro certo SEM ele perceber

ESTOQUE (14 veículos):
Sedans: Corolla 91k, Spacefox 31k
Hatches: Kwid 38k, Mobi 39k, Argo 63k
SUVs: Vitara 48k, HR-V 105k, Tracker 99k, Pajero 95k, Kicks 115k
Picapes: Hilux 115k, Ranger 115k, L200 95k
Moto: Ninja 32k

EXEMPLOS DE RESPOSTAS CERTAS (curtas, 1 pergunta):

Cliente diz "Sedan":
"Boa! Tá pensando em investir até quanto?" ← 1 linha, 1 pergunta

Cliente diz "quero Hilux":
"Show! Hilux é top. Orçamento de até quanto você tem?" ← então use recommend_vehicles

Cliente diz orçamento:
[USE recommend_vehicles AGORA] → "Cara, tenho uma Hilux 2020 por R$ 115k, zerada. Quer ver?"

OBJEÇÕES:
"Tá caro" → "Já tem garantia 3 meses + financio 100%. Quer simular?"
"Quero X" (não temos) → "Olha, tenho um Y melhor. Dá uma olhada."

TEST DRIVE: Sempre ofereça quando cliente se interessar

WHATSAPP: Só dê (85) 98885-2900 se cliente demonstrou interesse real + definiu orçamento

LOJA: Av. Américo Barreira, 909 - Demócrito Rocha, Fortaleza/CE | Seg-Sex 8-17h, Sáb 8-13h`;

// Definições de tools no formato moderno da OpenAI API
export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'recommend_vehicles',
      description: 'SEMPRE use esta função para buscar veículos REAIS do banco de dados baseado no perfil do cliente',
      parameters: {
        type: 'object',
        properties: {
          budget: {
            type: 'string',
            description: 'Faixa de orçamento do cliente (ex: "até 100k", "80k-120k")'
          },
          vehicleType: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tipos de veículo de interesse (SUV, Sedan, Hatch, Picape)'
          },
          maxResults: {
            type: 'number',
            description: 'Máximo de veículos para retornar (padrão: 2)'
          }
        },
        required: ['budget']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'schedule_visit',
      description: 'Agenda visita presencial ou test drive na concessionária',
      parameters: {
        type: 'object',
        properties: {
          customerName: {
            type: 'string',
            description: 'Nome completo do cliente'
          },
          phone: {
            type: 'string',
            description: 'WhatsApp do cliente'
          },
          preferredDate: {
            type: 'string',
            description: 'Data preferida'
          },
          preferredTime: {
            type: 'string',
            description: 'Horário preferido (manhã, tarde, ou hora específica)'
          },
          visitType: {
            type: 'string',
            enum: ['test_drive', 'visit'],
            description: 'test_drive ou visit'
          },
          vehicleInterest: {
            type: 'string',
            description: 'Veículo de interesse'
          }
        },
        required: ['customerName', 'phone', 'visitType']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'save_lead',
      description: 'Salva lead qualificado no sistema',
      parameters: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          whatsapp: { type: 'string' },
          email: { type: 'string' },
          orcamento: { type: 'string' },
          tipoCarro: { type: 'string' },
          formaPagamento: {
            type: 'string',
            enum: ['à vista', 'financiamento', 'consórcio', 'cartão']
          },
          urgencia: {
            type: 'string',
            enum: ['alta', 'media', 'baixa']
          },
          temTroca: { type: 'boolean' },
          veiculosInteresse: {
            type: 'array',
            items: { type: 'string' }
          },
          observacoes: { type: 'string' }
        },
        required: ['nome', 'whatsapp', 'orcamento']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_installment',
      description: 'Calcula parcelas de financiamento',
      parameters: {
        type: 'object',
        properties: {
          vehiclePrice: { type: 'number' },
          downPayment: { type: 'number' },
          months: { type: 'number' },
          interestRate: {
            type: 'number',
            description: 'Taxa mensal (padrão: 2.49%)'
          }
        },
        required: ['vehiclePrice', 'months']
      }
    }
  }
];

// Compatibilidade com código antigo
export const FUNCTION_DEFINITIONS = TOOL_DEFINITIONS;

export const QUALIFICATION_SCORE_RULES = {
  budget: {
    'até 80k': 50,
    '80k-120k': 70,
    '120k-150k': 85,
    '150k-200k': 95,
    'acima de 200k': 100
  },
  urgency: {
    'alta': 100,
    'media': 70,
    'baixa': 40
  },
  paymentMethod: {
    'à vista': 100,
    'financiamento': 80,
    'cartão': 85,
    'consórcio': 60
  },
  hasTradeIn: 15,
  providedEmail: 10,
  scheduledVisit: 25,
  interestInMultiple: 10
};

export function calculateLeadScore(leadData) {
  let score = 0;

  if (leadData.orcamento) {
    const budgetKey = Object.keys(QUALIFICATION_SCORE_RULES.budget)
      .find(key => leadData.orcamento.toLowerCase().includes(key.replace('k', '')));
    if (budgetKey) score += QUALIFICATION_SCORE_RULES.budget[budgetKey] * 0.4;
  }

  if (leadData.urgencia) {
    score += QUALIFICATION_SCORE_RULES.urgency[leadData.urgencia] * 0.3;
  }

  if (leadData.formaPagamento) {
    score += QUALIFICATION_SCORE_RULES.paymentMethod[leadData.formaPagamento] * 0.2;
  }

  if (leadData.temTroca) score += QUALIFICATION_SCORE_RULES.hasTradeIn;
  if (leadData.email) score += QUALIFICATION_SCORE_RULES.providedEmail;
  if (leadData.agendamento) score += QUALIFICATION_SCORE_RULES.scheduledVisit;
  if (leadData.veiculosInteresse && leadData.veiculosInteresse.length > 1) {
    score += QUALIFICATION_SCORE_RULES.interestInMultiple;
  }

  return Math.min(Math.round(score), 100);
}

export const STORE_INFO = {
  name: 'Medeiros Veículos',
  address: 'Av. Américo Barreira, 909 - Loja 03, Demócrito Rocha, Fortaleza/CE',
  phone: '85988852900',
  phoneFormatted: '(85) 98885-2900',
  whatsapp: 'https://api.whatsapp.com/send?phone=5585988852900',
  maps: 'https://maps.app.goo.gl/zC6gvUT8kSk4wgmv8?g_st=ipc',
  hours: {
    weekdays: '8h às 17h',
    saturday: '8h às 13h',
    sunday: 'Fechado'
  }
};
