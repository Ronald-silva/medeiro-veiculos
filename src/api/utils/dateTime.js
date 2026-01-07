import logger from '../../lib/logger.js';

/**
 * Obtém o horário atual de Fortaleza
 * @returns {Date} Data/hora atual em Fortaleza
 */
export function getCurrentFortalezaTime() {
  return new Date();
}

/**
 * Formata data e horário para o agente (formato legível em português)
 * @param {Date} date - Data a ser formatada (padrão: agora)
 * @returns {string} String formatada (ex: "Terça-feira, 24/12/2024 às 14h00")
 */
export function formatDateForAgent(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Fortaleza',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      weekday: 'long'
    }).formatToParts(date);

    const weekDay = parts.find(p => p.type === 'weekday')?.value || 'Segunda-feira';
    const day = parts.find(p => p.type === 'day')?.value || '01';
    const month = parts.find(p => p.type === 'month')?.value || '01';
    const year = parts.find(p => p.type === 'year')?.value || '2025';
    const hour = parts.find(p => p.type === 'hour')?.value || '12';
    const minutes = parts.find(p => p.type === 'minute')?.value || '00';

    // Capitalize primeira letra do dia da semana
    const weekDayCapitalized = weekDay.charAt(0).toUpperCase() + weekDay.slice(1);

    return `${weekDayCapitalized}, ${day}/${month}/${year} às ${hour}h${minutes}`;
  } catch (error) {
    logger.error('Error formatting date for agent:', error);
    return 'Data não disponível';
  }
}

/**
 * Verifica se está em horário comercial
 * @param {Date} date - Data a verificar (padrão: agora)
 * @returns {boolean} true se está em horário comercial
 */
export function isBusinessHours(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Fortaleza',
      hour: '2-digit',
      weekday: 'long',
      hour12: false
    }).formatToParts(date);

    const weekDay = parts.find(p => p.type === 'weekday')?.value || '';
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);

    // Horário comercial: Segunda a Sexta 8h-18h, Sábado 8h-13h
    const isWeekday = !['sábado', 'domingo'].includes(weekDay.toLowerCase());
    const isSaturday = weekDay.toLowerCase() === 'sábado';

    if (isWeekday && hour >= 8 && hour < 18) {
      return true;
    }

    if (isSaturday && hour >= 8 && hour < 13) {
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error checking business hours:', error);
    return false;
  }
}

/**
 * Obtém o próximo dia útil
 * @param {Date} date - Data de referência (padrão: agora)
 * @returns {string} Data formatada do próximo dia útil (DD/MM/YYYY)
 */
export function getNextBusinessDay(date = new Date()) {
  try {
    let nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Avança até encontrar um dia útil (não domingo)
    let attempts = 0;
    while (attempts < 7) {
      const parts = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Fortaleza',
        weekday: 'long'
      }).formatToParts(nextDay);

      const weekDay = parts.find(p => p.type === 'weekday')?.value || '';

      if (weekDay.toLowerCase() !== 'domingo') {
        // Formata como DD/MM/YYYY
        const dateParts = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Fortaleza',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).formatToParts(nextDay);

        const day = dateParts.find(p => p.type === 'day')?.value || '01';
        const month = dateParts.find(p => p.type === 'month')?.value || '01';
        const year = dateParts.find(p => p.type === 'year')?.value || '2025';

        return `${day}/${month}/${year}`;
      }

      nextDay.setDate(nextDay.getDate() + 1);
      attempts++;
    }

    return 'Data não disponível';
  } catch (error) {
    logger.error('Error getting next business day:', error);
    return 'Data não disponível';
  }
}

/**
 * Converte data do formato brasileiro (DD/MM/YYYY) para ISO (YYYY-MM-DD)
 * @param {string} brazilianDate - Data no formato DD/MM/YYYY
 * @returns {string|null} Data no formato ISO ou null se inválida
 */
export function convertBrazilianDateToISO(brazilianDate) {
  try {
    if (!brazilianDate) return null;

    // Tenta converter formato brasileiro para ISO
    const dateParts = brazilianDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateParts) {
      // DD/MM/YYYY -> YYYY-MM-DD
      return `${dateParts[3]}-${dateParts[2]}-${dateParts[1]}`;
    }

    // Se não for DD/MM/YYYY, retorna como está (pode já ser ISO)
    return brazilianDate;
  } catch (error) {
    logger.error('Error converting Brazilian date to ISO:', error);
    return null;
  }
}

/**
 * Gera contexto de data/hora para mensagens do agente
 * @returns {string} String de contexto formatada
 */
export function getDateTimeContext() {
  const formatted = formatDateForAgent();
  return `\n[Data e horário em Fortaleza: ${formatted}]`;
}
