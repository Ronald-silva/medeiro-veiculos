# Sistema de Prompts — Camila | Medeiros Veículos

Diretório com o sistema de prompt da agente de IA de vendas **Camila**.

## Arquitetura Atual

O prompt é **estático e centralizado** — um único `AGENT_SYSTEM_PROMPT` exportado pelo `index.js`, com o inventário dinâmico injetado via `${INVENTORY}`.

```
src/agent/prompts/
├── index.js          # Exporta AGENT_SYSTEM_PROMPT (único consumidor: api/chat/route.js)
├── inventory.js      # Inventário dinâmico do Supabase
├── identity.js       # Perfil e valores da Camila (referência)
├── rules.js          # Regras absolutas de comportamento (referência)
├── store-location.js # Endereço, horários e contato da loja (referência)
├── examples.js       # Exemplos de conversas bem-sucedidas (referência)
└── README.md
```

## Como Funciona

```javascript
// index.js
import { INVENTORY } from './inventory.js'

export const AGENT_SYSTEM_PROMPT = `
  ... prompt completo da Camila ...
  ${INVENTORY}   ← único conteúdo dinâmico
`
```

```javascript
// api/chat/route.js
import { AGENT_SYSTEM_PROMPT } from '../../src/constants/agentPrompts.js'

// Passado diretamente como system message para Claude
anthropic.messages.create({
  system: AGENT_SYSTEM_PROMPT,
  ...
})
```

## O Prompt Inclui

| Seção | Descrição |
|-------|-----------|
| IDENTIDADE | Camila é IA, vendedora da Medeiros Veículos, Fortaleza-CE |
| OBJETIVO PRINCIPAL | Qualificar leads e agendar visitas com o Adel |
| FORMATO DAS RESPOSTAS | Máx. 3 linhas, 1 pergunta por mensagem, sem textão |
| REGRAS INVIOLÁVEIS | Sem invenção de dados, sem promessas, sem negociação de preço |
| FLUXO DE QUALIFICAÇÃO | Lead Quente / Morno / Frio / Não é Lead |
| SITUAÇÕES ESPECÍFICAS | Nome sujo, comparação com concorrente, lead agressivo |
| AGENDAMENTO | Quando e como oferecer horários com o Adel |
| TOM DE VOZ | Natural, direto, empático, sem excessos |
| INFORMAÇÕES DA LOJA | WhatsApp, horários, localização, vendedor |
| CHECKLIST | Verificação antes de cada resposta |
| INVENTORY | Estoque atual puxado do Supabase |

## Atualização

Para atualizar o comportamento da Camila, edite diretamente o template em `index.js`.

Para atualizar o estoque, os dados vêm automaticamente do Supabase via `inventory.js` — não é necessário editar manualmente.

## Histórico

| Data | Mudança |
|------|---------|
| 2026-01-07 | Arquitetura modular criada (19 módulos) |
| 2026-02-23 | Refatoração: prompt único estático, 17 módulos obsoletos removidos |
