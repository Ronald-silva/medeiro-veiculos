// Serviço para comunicação com a API de chat
import { STORE_INFO } from '../agent/config/store-info.js'

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Envia mensagem para o agente de IA
 * @param {string} message - Mensagem do usuário
 * @param {string} conversationId - ID da conversa (opcional)
 * @param {object} context - Contexto adicional (ex: carro sendo visualizado)
 * @returns {Promise<object>} Resposta do agente
 */
export async function sendMessage(message, conversationId = null, context = {}) {
  try {
    const response = await fetch(`${API_URL}/chat/route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        conversationId,
        context
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      ...data
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      success: false,
      error: error.message,
      message: `Desculpe, ocorreu um erro. Por favor, tente novamente ou entre em contato pelo WhatsApp: ${STORE_INFO.phoneFormatted}`
    };
  }
}

/**
 * Recupera histórico da conversa do localStorage
 * @param {string} conversationId
 * @returns {Array} Histórico de mensagens
 */
export function getConversationHistory(conversationId) {
  try {
    const stored = localStorage.getItem(`conversation:${conversationId}`);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}

/**
 * Salva mensagem no histórico local
 * @param {string} conversationId
 * @param {object} message
 */
export function saveMessageToLocal(conversationId, message) {
  try {
    const history = getConversationHistory(conversationId);
    history.push({
      ...message,
      timestamp: message.timestamp || new Date().toISOString()
    });

    // Limita histórico a 100 mensagens
    const limitedHistory = history.slice(-100);

    localStorage.setItem(`conversation:${conversationId}`, JSON.stringify(limitedHistory));
  } catch (error) {
    console.error('Error saving message to local:', error);
  }
}

/**
 * Limpa histórico da conversa
 * @param {string} conversationId
 */
export function clearConversationHistory(conversationId) {
  try {
    localStorage.removeItem(`conversation:${conversationId}`);
  } catch (error) {
    console.error('Error clearing conversation history:', error);
  }
}

/**
 * Gera ID único para conversa
 * @returns {string} UUID v4
 */
export function generateConversationId() {
  return crypto.randomUUID();
}

/**
 * Salva lead localmente (backup)
 * @param {object} leadData
 */
export function saveLeadLocal(leadData) {
  try {
    const leads = JSON.parse(localStorage.getItem('leads') || '[]');
    leads.push({
      ...leadData,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('leads', JSON.stringify(leads));
  } catch (error) {
    console.error('Error saving lead locally:', error);
  }
}
