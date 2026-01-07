/**
 * Shared API Handlers - DRY Architecture
 *
 * Este módulo centraliza toda a lógica de negócio compartilhada
 * entre diferentes APIs (chat, whatsapp, etc).
 *
 * Benefícios:
 * - DRY (Don't Repeat Yourself)
 * - Fácil manutenção
 * - Testável
 * - Consistência entre APIs
 */

// Vehicle handlers
export {
  recommendVehicles,
  getVehicleById
} from './vehicles.js';

// Appointment handlers
export {
  scheduleVisit,
  getAppointmentsByPhone,
  updateAppointmentStatus
} from './appointments.js';

// Lead handlers
export {
  saveLead,
  getLeadByWhatsApp,
  updateLeadScore,
  listLeads
} from './leads.js';

// Tool handlers (function calling)
export {
  handleFunctionCall,
  handleMultipleFunctionCalls,
  convertToolsForClaude,
  convertToolsForOpenAI,
  formatToolResultForClaude,
  formatToolResultForOpenAI,
  processClaudeToolUses,
  processOpenAIToolCalls,
  extractTextFromAIResponse,
  hasToolUse,
  extractToolUses
} from './tools.js';
