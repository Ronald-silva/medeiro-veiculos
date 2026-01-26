// ============================================
// CAMILA 2.0 - SISTEMA DE PROMPTS CENTRAL
// ============================================

import { IDENTITY } from './identity.js'
import { DATETIME } from './datetime.js'
import { TRANSPARENCY } from './transparency.js'
import { SPIN } from './spin.js'
import { BANT } from './bant.js'
import { RAPPORT } from './rapport.js'
import { STORYTELLING } from './storytelling.js'
import { EMOTIONAL_TRIGGERS } from './emotional-triggers.js'
import { CHALLENGER_SALE } from './challenger-sale.js'
import { SANDLER } from './sandler.js'
import { RULES } from './rules.js'
import { FUNNEL } from './funnel.js'
import { OBJECTIONS } from './objections.js'
import { FINANCING } from './financing.js'
import { SCHEDULING } from './scheduling.js'
import { STORE_LOCATION } from './store-location.js'
import { INVENTORY } from './inventory.js'
import { EXAMPLES } from './examples.js'
import { CLOSING } from './closing.js'
import { PSYCHOLOGY, OBJECTION_HANDLERS } from './psychology.js'
import { PERSONALIZATION, getPersonaPrompt, getTemperaturePrompt } from './personalization.js'

// ============================================
// PROMPT ESTATICO (compatibilidade)
// ============================================

export const AGENT_SYSTEM_PROMPT = `${IDENTITY}

---

${DATETIME}

---

${TRANSPARENCY}

---

${SPIN}

---

${BANT}

---

${RAPPORT}

---

${STORYTELLING}

---

${EMOTIONAL_TRIGGERS}

---

${CHALLENGER_SALE}

---

${SANDLER}

---

${RULES}

---

${FUNNEL}

---

${OBJECTIONS}

---

${FINANCING}

---

${SCHEDULING}

---

${STORE_LOCATION}

---

${INVENTORY}

---

${EXAMPLES}

---

${CLOSING}`

// ============================================
// BUILDER DE PROMPT DINAMICO (CAMILA 2.0)
// ============================================

/**
 * Formata contexto do cliente para incluir no prompt
 */
function formatContextForPrompt(context) {
  if (!context) return '';

  let contextText = '';

  if (context.customer) {
    contextText += `\n📋 PERFIL DO CLIENTE:`;
    if (context.customer.name) contextText += `\n- Nome: ${context.customer.name}`;
    if (context.customer.persona && context.customer.persona !== 'desconhecido') {
      contextText += `\n- Perfil: ${context.customer.persona}`;
    }
    if (context.customer.budget) {
      contextText += `\n- Orcamento: R$ ${context.customer.budget.toLocaleString('pt-BR')}`;
    }
    if (context.customer.preferences?.length) {
      contextText += `\n- Preferencias: ${context.customer.preferences.join(', ')}`;
    }
    if (context.customer.painPoints?.length) {
      contextText += `\n- Dores identificadas: ${context.customer.painPoints.join(', ')}`;
    }
  }

  if (context.previousContext) {
    contextText += `\n\n📝 CONTEXTO ANTERIOR:\n${context.previousContext}`;
  }

  if (context.keyFacts && Object.keys(context.keyFacts).length > 0) {
    contextText += `\n\n🔑 FATOS IMPORTANTES:`;
    for (const [key, value] of Object.entries(context.keyFacts)) {
      contextText += `\n- ${key}: ${value}`;
    }
  }

  return contextText;
}

/**
 * Constroi o system prompt dinamico e personalizado
 * @param {Object} options - Opcoes de personalizacao
 * @param {Object} options.context - Contexto da memoria (cliente, fatos, resumo)
 * @param {string} options.persona - Persona do cliente (decisor_rapido, analitico, etc)
 * @param {string} options.temperature - Temperatura do lead (frio, morno, quente, muito_quente)
 * @param {string} options.currentDate - Data atual
 * @param {string} options.currentTime - Hora atual
 * @returns {string} System prompt completo e personalizado
 */
export function buildDynamicPrompt(options = {}) {
  const {
    context = null,
    persona = 'desconhecido',
    temperature = 'morno',
    currentDate = new Date().toLocaleDateString('pt-BR'),
    currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } = options;

  const sections = [];

  // 1. Identidade
  sections.push(IDENTITY);

  // 2. Data/hora e localizacao
  sections.push(`📅 Data: ${currentDate} | 🕐 Hora: ${currentTime}`);
  sections.push(STORE_LOCATION);

  // 3. Contexto do cliente (se disponivel)
  if (context) {
    const contextText = formatContextForPrompt(context);
    if (contextText) {
      sections.push(`
═══════════════════════════════════════════════
🧠 MEMORIA DO CLIENTE
═══════════════════════════════════════════════
${contextText}`);
    }
  }

  // 4. Personalizacao por persona
  if (persona && persona !== 'desconhecido') {
    sections.push(`
═══════════════════════════════════════════════
🎭 PERSONALIZACAO ATIVA
═══════════════════════════════════════════════
${getPersonaPrompt(persona)}`);
  }

  // 5. Personalizacao por temperatura
  if (temperature) {
    sections.push(getTemperaturePrompt(temperature));
  }

  // 6. Regras absolutas (CRITICO)
  sections.push(`
═══════════════════════════════════════════════
🚨 REGRAS ABSOLUTAS
═══════════════════════════════════════════════
${RULES}`);

  // 7. Inventario
  sections.push(INVENTORY);

  // 8. Tecnicas de vendas (resumidas)
  sections.push(`
═══════════════════════════════════════════════
💼 TECNICAS DE VENDAS
═══════════════════════════════════════════════
${SPIN}

---

${BANT}`);

  // 9. Exemplos
  sections.push(EXAMPLES);

  // 10. Objecoes comuns
  sections.push(`
═══════════════════════════════════════════════
🛡️ OBJECOES RAPIDAS
═══════════════════════════════════════════════
"Ta caro" → "Entendo! Qual valor voce tinha em mente?"
"Vou pensar" → "Claro! O que voce quer pensar? Posso ajudar"
"Preciso falar com marido/esposa" → "Perfeito! Traz junto. Qual dia bom?"
"Nao tenho entrada" → "Tranquilo! Financia 100%. Quer simular?"
"To so pesquisando" → "Otimo! O que voce ja viu? Te ajudo a comparar"`);

  return sections.join('\n\n---\n\n');
}

/**
 * Constroi prompt compacto para contexto limitado
 */
export function buildCompactPrompt(options = {}) {
  const {
    currentDate = new Date().toLocaleDateString('pt-BR'),
    currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } = options;

  return `${IDENTITY}

📅 ${currentDate} | 🕐 ${currentTime}

${STORE_LOCATION}

${RULES}

${INVENTORY}

LEMBRE-SE:
- Mensagens CURTAS (2-3 linhas max)
- UMA pergunta por vez
- NUNCA invente veiculos - use recommend_vehicles
- NUNCA diga "nao entendi" - interprete o contexto
- Seja HUMANA, calorosa, direta`;
}

// ============================================
// EXPORTS
// ============================================

export {
  IDENTITY,
  DATETIME,
  TRANSPARENCY,
  SPIN,
  BANT,
  RAPPORT,
  STORYTELLING,
  EMOTIONAL_TRIGGERS,
  CHALLENGER_SALE,
  SANDLER,
  RULES,
  FUNNEL,
  OBJECTIONS,
  FINANCING,
  SCHEDULING,
  STORE_LOCATION,
  INVENTORY,
  EXAMPLES,
  CLOSING,
  PSYCHOLOGY,
  OBJECTION_HANDLERS,
  PERSONALIZATION,
  getPersonaPrompt,
  getTemperaturePrompt,
  formatContextForPrompt
}

export default {
  AGENT_SYSTEM_PROMPT,
  buildDynamicPrompt,
  buildCompactPrompt,
  getPersonaPrompt,
  getTemperaturePrompt
}
