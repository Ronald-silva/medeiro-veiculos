# API Handlers — Lógica Compartilhada

Lógica de negócio compartilhada entre os endpoints da aplicação, seguindo o princípio DRY.

## Estrutura

```
src/api/
├── handlers/
│   ├── index.js        # Exportações centralizadas
│   ├── vehicles.js     # Recomendação de veículos (Supabase)
│   ├── appointments.js # Agendamento de visitas
│   ├── leads.js        # Qualificação e salvamento de leads
│   └── tools.js        # Processamento de function calls (Claude / OpenAI)
└── utils/
    ├── index.js        # Exportações centralizadas
    └── dateTime.js     # Data e hora em Fortaleza-CE
```

## Handlers

### vehicles.js

Busca e recomendação de veículos no Supabase.

**Funções:**
- `recommendVehicles({ budget, vehicleType, searchTerm, maxResults })` — recomenda veículos pelo perfil do lead
- `getVehicleById(vehicleId)` — busca veículo específico por ID

**Características:**
- Fonte única: Supabase (sem fallback local)
- Parse inteligente de orçamento em português ("até 150 mil", "100 a 150 mil")
- Filtro de tipo com `ilike` (case-insensitive) — suporta `Moto`, `SUV`, `Picape`, `Hatch`, `Sedan`
- Busca por nome/modelo com sinônimos (ex: "triton" → L200)

**Exemplo:**
```javascript
import { recommendVehicles } from '../../src/api/handlers/vehicles.js'

const result = await recommendVehicles({
  budget: 'até 80 mil',
  vehicleType: ['Moto'],
  maxResults: 2
})

console.log(result.vehicles) // [{ name: 'Kawasaki Ninja 400', price: 35000, ... }]
```

**Valores válidos para `vehicleType` (devem corresponder ao banco):**
```
'Hatch' | 'Sedan' | 'SUV' | 'Picape' | 'Moto'
```

---

### appointments.js

Agendamento de visitas presenciais.

**Funções:**
- `scheduleVisit(params)` — agenda visita/test drive
- `getAppointmentsByPhone(phone)` — lista agendamentos de um cliente
- `updateAppointmentStatus(appointmentId, status)` — atualiza status

**Características:**
- Validação de parâmetros obrigatórios
- Conversão automática de datas brasileiras (DD/MM/YYYY → ISO)
- Salva no Supabase com fallback gracioso
- Retorna sempre `success: true` para o usuário (UX)

**Exemplo:**
```javascript
import { scheduleVisit } from '../../src/api/handlers/appointments.js'

const result = await scheduleVisit({
  customerName: 'João Silva',
  phone: '85988887777',
  preferredDate: '25/02/2026',
  preferredTime: 'manhã',
  vehicleInterest: 'Honda HR-V'
})
```

---

### leads.js

Qualificação e salvamento de leads.

**Funções:**
- `saveLead(leadData)` — salva lead qualificado com score
- `getLeadByWhatsApp(whatsapp)` — busca lead por número
- `updateLeadScore(leadId, updateData)` — atualiza score
- `listLeads(filters)` — lista leads com filtros

**Características:**
- Cálculo automático de score de qualificação (0–100)
- Integração com Supabase
- Fallback gracioso em caso de erro

**Exemplo:**
```javascript
import { saveLead } from '../../src/api/handlers/leads.js'

const result = await saveLead({
  conversationId: 'conv_123',
  nome: 'Maria Santos',
  whatsapp: '85999998888',
  orcamento: '120 a 150 mil',
  tipoCarro: 'SUV',
  formaPagamento: 'financiamento',
  urgencia: 'alta'
})

console.log(result.score) // 0–100
```

---

### tools.js

Processamento de function calls da IA (Claude e OpenAI).

**Funções:**
- `convertToolsForClaude(tools)` — converte definições para formato Claude
- `processClaudeToolUses(toolUses, conversationId)` — processa tool uses do Claude
- `processOpenAIToolCalls(toolCalls, conversationId)` — processa tool calls do OpenAI

**Exemplo:**
```javascript
import { convertToolsForClaude, processClaudeToolUses } from '../../src/api/handlers/tools.js'

const claudeTools = convertToolsForClaude(TOOL_DEFINITIONS)

// Após resposta com stop_reason === 'tool_use':
const toolResults = await processClaudeToolUses(toolUses, convId)
```

---

## Utilitários

### dateTime.js

Data e hora no timezone de Fortaleza (`America/Fortaleza`).

**Funções:**
- `getCurrentFortalezaTime()` — data/hora atual em Fortaleza
- `formatDateForAgent(date)` — formata para texto (ex: "Terça-feira, 25/02/2026 às 14h00")
- `isBusinessHours(date)` — verifica horário comercial (seg–sex 8h–17h, sáb 8h–13h)
- `getNextBusinessDay(date)` — próximo dia útil em DD/MM/YYYY
- `convertBrazilianDateToISO(brazilianDate)` — DD/MM/YYYY → YYYY-MM-DD
- `getDateTimeContext()` — contexto de data/hora para injetar na mensagem do usuário

**Exemplo:**
```javascript
import { getDateTimeContext } from '../../src/api/utils/dateTime.js'

// Adicionado automaticamente a cada mensagem no route.js
userMessage += getDateTimeContext()
// → "\n[Data: Terça-feira, 25/02/2026 | Hora: 14h30 | Horário: comercial]"
```

---

## Padrão de Retorno

Todos os handlers retornam o mesmo formato:

```javascript
// Sucesso
{ success: true, data: ..., message: 'Mensagem para o usuário' }

// Erro
{ success: false, error: 'Descrição técnica', message: 'Mensagem amigável' }
```

## Logging

Todos os handlers usam Winston (`src/lib/logger.js`):

```javascript
import logger from '../../src/lib/logger.js'

logger.info('Lead salvo com sucesso')
logger.error('Erro ao buscar veículos:', error)
logger.debug('Parâmetros recebidos:', { budget, vehicleType })
```

## Uso no Route Principal

```javascript
// api/chat/route.js
import {
  convertToolsForClaude,
  processClaudeToolUses,
  processOpenAIToolCalls
} from '../../src/api/handlers/index.js'

import { getDateTimeContext } from '../../src/api/utils/index.js'
```
