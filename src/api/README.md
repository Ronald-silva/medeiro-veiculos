# API Handlers - Shared Logic

Este diretório contém a lógica de negócio compartilhada entre diferentes APIs (chat, whatsapp, etc), seguindo o princípio DRY (Don't Repeat Yourself).

## Estrutura

```
src/api/
├── handlers/          # Lógica de negócio compartilhada
│   ├── index.js       # Exportações centralizadas
│   ├── vehicles.js    # Recomendação de veículos
│   ├── appointments.js # Agendamentos
│   ├── leads.js       # Gestão de leads
│   └── tools.js       # Processamento de function calls
└── utils/             # Utilitários compartilhados
    ├── index.js       # Exportações centralizadas
    └── dateTime.js    # Funções de data/hora
```

## Handlers

### 1. vehicles.js

Gerencia recomendações de veículos e consultas ao inventário.

**Funções:**
- `recommendVehicles({ budget, vehicleType, maxResults })` - Recomenda veículos baseado no perfil
- `getVehicleById(vehicleId)` - Busca veículo específico

**Características:**
- Tenta buscar do Supabase primeiro
- Fallback para inventário local
- Parse inteligente de orçamento
- Filtragem por tipo de veículo
- Logging estruturado

**Exemplo:**
```javascript
import { recommendVehicles } from '@api/handlers/vehicles.js';

const result = await recommendVehicles({
  budget: 'até 150 mil',
  vehicleType: ['SUV', 'Sedan'],
  maxResults: 2
});

console.log(result.vehicles); // Array de veículos recomendados
```

### 2. appointments.js

Gerencia agendamentos de visitas e test drives.

**Funções:**
- `scheduleVisit(params)` - Agenda visita/test drive
- `getAppointmentsByPhone(phone)` - Lista agendamentos de um cliente
- `updateAppointmentStatus(appointmentId, status)` - Atualiza status

**Características:**
- Validação de parâmetros obrigatórios
- Conversão automática de datas brasileiras (DD/MM/YYYY) para ISO
- Salva no Supabase com fallback gracioso
- Logging detalhado
- Retorna sempre sucesso ao usuário (UX)

**Exemplo:**
```javascript
import { scheduleVisit } from '@api/handlers/appointments.js';

const result = await scheduleVisit({
  customerName: 'João Silva',
  phone: '85988887777',
  preferredDate: '15/01/2026',
  preferredTime: 'manhã',
  visitType: 'test_drive',
  vehicleInterest: 'Honda HR-V'
});

console.log(result.appointmentId); // ID do agendamento
```

### 3. leads.js

Gerencia qualificação e salvamento de leads.

**Funções:**
- `saveLead(leadData)` - Salva lead qualificado
- `getLeadByWhatsApp(whatsapp)` - Busca lead por WhatsApp
- `updateLeadScore(leadId, updateData)` - Atualiza score
- `listLeads(filters)` - Lista leads com filtros

**Características:**
- Cálculo automático de score de qualificação
- Validação de dados obrigatórios
- Integração com Supabase
- Fallback gracioso
- Tracking de conversão

**Exemplo:**
```javascript
import { saveLead } from '@api/handlers/leads.js';

const result = await saveLead({
  conversationId: 'conv_123',
  nome: 'Maria Santos',
  whatsapp: '85999998888',
  email: 'maria@email.com',
  orcamento: '120 a 150 mil',
  tipoCarro: 'SUV',
  formaPagamento: 'financiamento',
  urgencia: 'alta',
  temTroca: true,
  veiculosInteresse: ['Honda HR-V', 'Toyota Corolla Cross']
});

console.log(result.score); // Score de 0 a 100
```

### 4. tools.js

Gerencia processamento de function calls da IA (Anthropic e OpenAI).

**Funções:**
- `handleFunctionCall(functionName, functionArgs, conversationId)` - Processa uma function call
- `handleMultipleFunctionCalls(toolCalls, conversationId)` - Processa múltiplas calls em paralelo
- `convertToolsForClaude(tools)` - Converte tools para formato Claude
- `convertToolsForOpenAI(tools)` - Converte tools para formato OpenAI
- `processClaudeToolUses(toolUses, conversationId)` - Processa tool uses do Claude
- `processOpenAIToolCalls(toolCalls, conversationId)` - Processa tool calls do OpenAI
- `extractTextFromAIResponse(response, provider)` - Extrai texto da resposta
- `hasToolUse(response, provider)` - Verifica se há tool use
- `extractToolUses(response, provider)` - Extrai tool uses/calls

**Características:**
- Suporta Anthropic Claude e OpenAI
- Conversão entre formatos de tools
- Processamento paralelo de múltiplas funções
- Error handling robusto
- Logging detalhado

**Exemplo (Claude):**
```javascript
import {
  processClaudeToolUses,
  extractTextFromAIResponse
} from '@api/handlers/tools.js';

// Processa tool uses do Claude
const toolResults = await processClaudeToolUses(
  response.content.filter(b => b.type === 'tool_use'),
  conversationId
);

// Extrai texto da resposta
const message = extractTextFromAIResponse(response, 'claude');
```

**Exemplo (OpenAI):**
```javascript
import {
  processOpenAIToolCalls,
  extractTextFromAIResponse
} from '@api/handlers/tools.js';

// Processa tool calls do OpenAI
const toolMessages = await processOpenAIToolCalls(
  response.choices[0].message.tool_calls,
  conversationId
);

// Extrai texto da resposta
const message = extractTextFromAIResponse(response, 'openai');
```

## Utilities

### dateTime.js

Funções utilitárias para manipulação de data/hora em Fortaleza.

**Funções:**
- `getCurrentFortalezaTime()` - Retorna data/hora atual em Fortaleza
- `formatDateForAgent(date)` - Formata data para o agente (ex: "Terça-feira, 24/12/2024 às 14h00")
- `isBusinessHours(date)` - Verifica se está em horário comercial
- `getNextBusinessDay(date)` - Retorna próximo dia útil (DD/MM/YYYY)
- `convertBrazilianDateToISO(brazilianDate)` - Converte DD/MM/YYYY para YYYY-MM-DD
- `getDateTimeContext()` - Gera contexto de data/hora para mensagens

**Características:**
- Timezone-aware (America/Fortaleza)
- Formatos brasileiros (DD/MM/YYYY, dia da semana em português)
- Validação de horário comercial
- Error handling

**Exemplo:**
```javascript
import {
  formatDateForAgent,
  isBusinessHours,
  getDateTimeContext
} from '@api/utils/dateTime.js';

// Formata data
const formatted = formatDateForAgent();
console.log(formatted); // "Terça-feira, 07/01/2026 às 14h30"

// Verifica horário comercial
if (isBusinessHours()) {
  console.log('Loja aberta!');
}

// Adiciona contexto à mensagem do usuário
const userMessage = message + getDateTimeContext();
```

## Path Aliases

Todos os módulos usam path aliases para imports limpos:

```javascript
// ✅ CORRETO - Usando path aliases
import { recommendVehicles } from '@api/handlers/vehicles.js';
import { saveLead } from '@api/handlers/leads.js';
import logger from '@lib/logger.js';
import { calculateLeadScore } from '@agent/scoring/calculator.js';

// ❌ INCORRETO - Caminhos relativos
import { recommendVehicles } from '../../api/handlers/vehicles.js';
```

**Aliases disponíveis:**
- `@api/*` → `src/api/*`
- `@lib/*` → `src/lib/*`
- `@agent/*` → `src/agent/*`
- `@config/*` → `src/config/*`
- `@constants/*` → `src/constants/*`

## Logging

Todos os handlers usam o logger Winston ao invés de `console.log`:

```javascript
import logger from '@lib/logger.js';

// ✅ CORRETO
logger.info('Lead saved successfully');
logger.error('Error saving lead:', error);
logger.debug('Processing request:', { id, data });

// ❌ INCORRETO
console.log('Lead saved successfully');
console.error('Error:', error);
```

**Níveis de log:**
- `logger.error()` - Erros críticos
- `logger.warn()` - Avisos
- `logger.info()` - Informações importantes
- `logger.debug()` - Debug (apenas em desenvolvimento)

## Error Handling

Todos os handlers seguem o padrão:

```javascript
try {
  // Tenta executar
  const result = await operation();

  logger.info('Operation succeeded');

  return {
    success: true,
    data: result,
    message: 'Success message for user'
  };
} catch (error) {
  logger.error('Operation failed:', error);

  // Retorna erro gracioso pro usuário
  return {
    success: false,
    error: error.message,
    message: 'User-friendly error message'
  };
}
```

**Princípios:**
- Sempre retornar objeto com `success` boolean
- Sempre logar erros com contexto
- Mensagens user-friendly (não técnicas)
- Fallback gracioso quando possível
- Em casos críticos de UX (agendamentos, leads), retorna success=true mesmo com erro

## Uso nos APIs

### Chat API (api/chat/route.js)

```javascript
import { handleFunctionCall, convertToolsForClaude } from '@api/handlers';
import { getDateTimeContext } from '@api/utils';

// Usa handlers compartilhados
const result = await handleFunctionCall('recommend_vehicles', args, convId);
```

### WhatsApp API (api/whatsapp/process.js)

```javascript
import {
  processClaudeToolUses,
  extractTextFromAIResponse
} from '@api/handlers';
import { getDateTimeContext } from '@api/utils';

// Usa mesmos handlers
const toolResults = await processClaudeToolUses(toolUses, conversationId);
```

## Testes

Estrutura de testes (a ser implementada):

```
src/api/__tests__/
├── handlers/
│   ├── vehicles.test.js
│   ├── appointments.test.js
│   ├── leads.test.js
│   └── tools.test.js
└── utils/
    └── dateTime.test.js
```

## Migration Guide

Para migrar código existente para usar os handlers:

**Antes:**
```javascript
// api/chat/route.js
async function recommendVehicles({ budget, vehicleType }) {
  // ... código duplicado ...
}

async function scheduleVisit(params) {
  // ... código duplicado ...
}
```

**Depois:**
```javascript
// api/chat/route.js
import { recommendVehicles, scheduleVisit } from '@api/handlers';

// Usa handlers compartilhados diretamente
const vehiclesResult = await recommendVehicles({ budget, vehicleType });
const appointmentResult = await scheduleVisit(params);
```

## Benefícios

1. **DRY** - Zero duplicação de código entre APIs
2. **Manutenibilidade** - Uma mudança afeta todas as APIs
3. **Testabilidade** - Funções puras, fáceis de testar
4. **Consistência** - Comportamento idêntico em todas as APIs
5. **Logging** - Logging estruturado com Winston
6. **Type Safety** - JSDoc para autocomplete
7. **Error Handling** - Tratamento de erro padronizado
8. **Extensibilidade** - Fácil adicionar novos handlers

## Próximos Passos

1. ✅ Criar handlers compartilhados
2. ✅ Criar utilitários de data/hora
3. ⏳ Migrar api/chat/route.js para usar handlers
4. ⏳ Migrar api/whatsapp/process.js para usar handlers
5. ⏳ Adicionar testes unitários
6. ⏳ Adicionar validação de schemas (Zod)
7. ⏳ Adicionar cache de recomendações
8. ⏳ Adicionar métricas e analytics

## Contribuindo

Ao adicionar novos handlers:

1. Crie arquivo em `src/api/handlers/`
2. Use logger ao invés de console.log
3. Use path aliases (@api, @lib, etc)
4. Siga padrão de error handling
5. Adicione JSDoc
6. Exporte no index.js
7. Atualize este README

## Suporte

Para dúvidas sobre os handlers, consulte o código-fonte ou abra uma issue.
