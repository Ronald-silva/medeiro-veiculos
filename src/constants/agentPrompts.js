// Prompts e configurações do Agente de IA de Vendas - Medeiros Veículos
// ✨ REFATORADO: Agora usa arquitetura modular
// Atualizado em: 07/01/2026

// Importa prompt modular do agente
export { AGENT_SYSTEM_PROMPT } from '../agent/prompts/index.js'

// Importa definições de ferramentas
export { TOOL_DEFINITIONS, FUNCTION_DEFINITIONS } from '../agent/tools/definitions.js'

// Importa scoring
export { QUALIFICATION_SCORE_RULES } from '../agent/scoring/rules.js'
export { calculateLeadScore } from '../agent/scoring/calculator.js'

// Importa configurações da loja
export { STORE_INFO } from '../agent/config/store-info.js'
