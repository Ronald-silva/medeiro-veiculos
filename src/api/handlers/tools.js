import { recommendVehicles } from './vehicles.js';
import { scheduleVisit } from './appointments.js';
import { saveLead } from './leads.js';
import logger from '@lib/logger.js';

/**
 * Processa chamadas de ferramentas (tools) da IA
 * Suporta tanto formato Anthropic quanto OpenAI
 *
 * @param {string} functionName - Nome da função a ser executada
 * @param {object} functionArgs - Argumentos da função
 * @param {string} conversationId - ID da conversa (necessário para save_lead)
 * @returns {Promise<object>} Resultado da execução da função
 */
export async function handleFunctionCall(functionName, functionArgs, conversationId = null) {
  logger.debug(`Function called: ${functionName}`, {
    args: functionArgs,
    conversationId
  });

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
        // Adiciona conversationId ao saveLead se fornecido
        if (conversationId) {
          functionArgs.conversationId = conversationId;
        }
        result = await saveLead(functionArgs);
        break;

      default:
        logger.warn(`Unknown function called: ${functionName}`);
        result = {
          success: false,
          error: 'Função desconhecida',
          message: 'Desculpe, não consigo executar essa função.'
        };
    }

    logger.info(`Function result: ${functionName}`, {
      success: result.success,
      hasData: !!result.vehicles || !!result.leadId || !!result.appointmentId
    });

    return result;
  } catch (error) {
    logger.error(`Error in function ${functionName}:`, error);

    return {
      success: false,
      error: error.message,
      message: 'Desculpe, tive um problema. Pode repetir?'
    };
  }
}

/**
 * Processa múltiplas chamadas de ferramentas em paralelo
 * Útil quando a IA solicita várias tools ao mesmo tempo
 *
 * @param {Array} toolCalls - Array de chamadas de ferramentas
 * @param {string} conversationId - ID da conversa
 * @returns {Promise<Array>} Array de resultados
 */
export async function handleMultipleFunctionCalls(toolCalls, conversationId = null) {
  logger.debug(`Processing ${toolCalls.length} function calls in parallel`);

  try {
    const promises = toolCalls.map(toolCall => {
      const functionName = toolCall.name || toolCall.function?.name;
      const functionArgs = toolCall.input || JSON.parse(toolCall.function?.arguments || '{}');

      return handleFunctionCall(functionName, functionArgs, conversationId);
    });

    const results = await Promise.all(promises);

    logger.info(`Completed ${results.length} function calls`);

    return results;
  } catch (error) {
    logger.error('Error handling multiple function calls:', error);

    return [{
      success: false,
      error: error.message,
      message: 'Desculpe, tive um problema ao processar as funções.'
    }];
  }
}

/**
 * Converte tools de formato OpenAI para formato Anthropic Claude
 * @param {Array} tools - Array de definições de tools no formato OpenAI
 * @returns {Array} Array de tools no formato Claude
 */
export function convertToolsForClaude(tools) {
  return tools.map(tool => ({
    name: tool.function.name,
    description: tool.function.description,
    input_schema: tool.function.parameters
  }));
}

/**
 * Converte tools de formato Anthropic Claude para formato OpenAI
 * @param {Array} tools - Array de definições de tools no formato Claude
 * @returns {Array} Array de tools no formato OpenAI
 */
export function convertToolsForOpenAI(tools) {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema
    }
  }));
}

/**
 * Formata resultado de tool para resposta do Claude (formato tool_result)
 * @param {string} toolUseId - ID do tool_use do Claude
 * @param {object} result - Resultado da função
 * @returns {object} Objeto formatado para tool_result
 */
export function formatToolResultForClaude(toolUseId, result) {
  return {
    type: 'tool_result',
    tool_use_id: toolUseId,
    content: JSON.stringify(result)
  };
}

/**
 * Formata resultado de tool para resposta do OpenAI (formato tool message)
 * @param {string} toolCallId - ID do tool_call do OpenAI
 * @param {object} result - Resultado da função
 * @returns {object} Objeto formatado para tool message
 */
export function formatToolResultForOpenAI(toolCallId, result) {
  return {
    role: 'tool',
    tool_call_id: toolCallId,
    content: JSON.stringify(result)
  };
}

/**
 * Processa tool use do Claude e retorna array de tool_results
 * @param {Array} toolUses - Array de tool_use blocks do Claude
 * @param {string} conversationId - ID da conversa
 * @returns {Promise<Array>} Array de tool_result objects
 */
export async function processClaudeToolUses(toolUses, conversationId = null) {
  logger.debug(`Processing ${toolUses.length} Claude tool use(s)`);

  const toolResults = [];

  for (const toolUse of toolUses) {
    const functionName = toolUse.name;
    const functionArgs = toolUse.input;

    logger.debug(`Executing Claude tool: ${functionName}`);

    // Executa função
    const functionResult = await handleFunctionCall(functionName, functionArgs, conversationId);

    // Formata para Claude tool_result
    toolResults.push(formatToolResultForClaude(toolUse.id, functionResult));
  }

  logger.info(`Completed ${toolResults.length} Claude tool execution(s)`);

  return toolResults;
}

/**
 * Processa tool calls do OpenAI e retorna array de tool messages
 * @param {Array} toolCalls - Array de tool_calls do OpenAI
 * @param {string} conversationId - ID da conversa
 * @returns {Promise<Array>} Array de tool message objects
 */
export async function processOpenAIToolCalls(toolCalls, conversationId = null) {
  logger.debug(`Processing ${toolCalls.length} OpenAI tool call(s)`);

  const toolMessages = [];

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);

    logger.debug(`Executing OpenAI tool: ${functionName}`);

    // Executa função
    const functionResult = await handleFunctionCall(functionName, functionArgs, conversationId);

    // Formata para OpenAI tool message
    toolMessages.push(formatToolResultForOpenAI(toolCall.id, functionResult));
  }

  logger.info(`Completed ${toolMessages.length} OpenAI tool execution(s)`);

  return toolMessages;
}

/**
 * Extrai texto da resposta da IA (funciona com Claude e OpenAI)
 * @param {object} response - Resposta da IA
 * @param {string} provider - Provedor ('claude' ou 'openai')
 * @returns {string} Texto extraído
 */
export function extractTextFromAIResponse(response, provider = 'claude') {
  try {
    if (provider === 'claude') {
      // Claude retorna array de content blocks
      const textBlock = response.content?.find(block => block.type === 'text');
      return textBlock?.text || response.content?.[0]?.text || 'Desculpe, não entendi.';
    }

    if (provider === 'openai') {
      // OpenAI retorna message.content
      return response.choices?.[0]?.message?.content || 'Desculpe, não entendi.';
    }

    return 'Desculpe, não entendi.';
  } catch (error) {
    logger.error('Error extracting text from AI response:', error);
    return 'Desculpe, não entendi.';
  }
}

/**
 * Verifica se resposta da IA contém tool use/call
 * @param {object} response - Resposta da IA
 * @param {string} provider - Provedor ('claude' ou 'openai')
 * @returns {boolean} true se contém tool use
 */
export function hasToolUse(response, provider = 'claude') {
  try {
    if (provider === 'claude') {
      return response.stop_reason === 'tool_use';
    }

    if (provider === 'openai') {
      return !!(response.choices?.[0]?.message?.tool_calls?.length > 0);
    }

    return false;
  } catch (error) {
    logger.error('Error checking for tool use:', error);
    return false;
  }
}

/**
 * Extrai tool uses/calls da resposta da IA
 * @param {object} response - Resposta da IA
 * @param {string} provider - Provedor ('claude' ou 'openai')
 * @returns {Array} Array de tool uses/calls
 */
export function extractToolUses(response, provider = 'claude') {
  try {
    if (provider === 'claude') {
      return response.content?.filter(block => block.type === 'tool_use') || [];
    }

    if (provider === 'openai') {
      return response.choices?.[0]?.message?.tool_calls || [];
    }

    return [];
  } catch (error) {
    logger.error('Error extracting tool uses:', error);
    return [];
  }
}
