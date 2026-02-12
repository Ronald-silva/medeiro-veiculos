// Definições de ferramentas (tools) para o agente Camila
export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'recommend_vehicles',
      description: 'SEMPRE use esta função para buscar veículos REAIS do banco de dados. Use searchTerm para buscar modelo específico (ex: "Hilux", "HR-V", "Onix"). O sistema também envia fotos automaticamente no WhatsApp.',
      parameters: {
        type: 'object',
        properties: {
          budget: {
            type: 'string',
            description: 'Faixa de orçamento do cliente (ex: "até 100 mil", "80 a 120 mil"). Use "até 500 mil" se não souber o orçamento.'
          },
          vehicleType: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tipos de veículo de interesse (SUV, Sedan, Hatch, Picape, Moto)'
          },
          searchTerm: {
            type: 'string',
            description: 'Nome ou modelo específico para buscar (ex: "Hilux", "SW4", "HR-V", "Onix", "Ranger", "Pajero", "Ninja")'
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
  }
]

// Compatibilidade com código antigo
export const FUNCTION_DEFINITIONS = TOOL_DEFINITIONS
