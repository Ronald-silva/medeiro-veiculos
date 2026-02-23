import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient.js';
import logger from '../../lib/logger.js';

/**
 * Parse orçamento do texto do cliente
 * @param {string} budget - String de orçamento (ex: "até 150 mil", "100 a 150 mil")
 * @returns {number} Valor máximo do orçamento em reais
 */
function parseBudget(budget) {
  try {
    if (!budget) return 200000;

    const budgetStr = String(budget).toLowerCase();

    if (budgetStr.includes('até')) {
      const match = budgetStr.match(/\d+/);
      return match ? parseInt(match[0]) * 1000 : 150000;
    }

    if (budgetStr.includes('-') || budgetStr.includes('a')) {
      const matches = budgetStr.match(/\d+/g);
      return matches && matches[1] ? parseInt(matches[1]) * 1000 : 200000;
    }

    // Tenta extrair um número qualquer
    const match = budgetStr.match(/\d+/);
    return match ? parseInt(match[0]) * 1000 : 200000;
  } catch (error) {
    logger.error('Error parsing budget:', error);
    return 200000;
  }
}

// Normaliza vehicleType para TODOS os valores possíveis no banco
// Evita quebrar quando o DB usa 'moto' em vez de 'motorcycle' (ou vice-versa)
function normalizeVehicleTypes(types) {
  const map = {
    'moto':        ['motorcycle', 'moto', 'motocicleta'],
    'motocicleta': ['motorcycle', 'moto', 'motocicleta'],
    'motorcycle':  ['motorcycle', 'moto', 'motocicleta'],
    'carro':       ['car', 'carro'],
    'car':         ['car', 'carro'],
    'sedan':       ['sedan'],
    'hatch':       ['hatch'],
    'suv':         ['suv'],
    'picape':      ['pickup', 'picape'],
    'pickup':      ['pickup', 'picape'],
    'caminhao':    ['truck', 'caminhao', 'caminhão'],
    'caminhão':    ['truck', 'caminhao', 'caminhão'],
    'truck':       ['truck', 'caminhao', 'caminhão'],
    'van':         ['van'],
  };
  const normalized = new Set();
  for (const t of types) {
    const values = map[t.toLowerCase()];
    if (values) values.forEach(v => normalized.add(v));
    else normalized.add(t.toLowerCase());
  }
  return [...normalized];
}

/**
 * Busca veículos no Supabase
 * @param {number} maxBudget - Orçamento máximo
 * @param {number} limit - Limite de resultados
 * @param {Array<string>} vehicleTypes - Tipos de veículos (opcional)
 * @returns {Promise<Array|null>} Array de veículos ou null se falhar
 */
async function fetchVehiclesFromSupabase(maxBudget, limit = 3, vehicleTypes = null, searchTerm = null) {
  if (!isSupabaseConfigured()) {
    logger.warn('[recommend_vehicles] Supabase não configurado');
    return null;
  }

  try {
    let query = supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'available');

    // Se tem busca por nome, não limita por preço (cliente quer ver um carro específico)
    if (searchTerm) {
      // Sinônimos comuns (cliente pode usar nome diferente do cadastrado)
      const synonyms = {
        'hilux': 'SW4', 'sw-4': 'SW4',
        'pajeiro': 'Pajero', 'pagero': 'Pajero',
        'hr v': 'HR-V', 'hrv': 'HR-V',
        'l-200': 'L200', 'triton': 'L200',
        'cg': 'CG', 'titan': 'CG',
        'spacefox': 'Spacefox', 'space fox': 'Spacefox'
      };
      const term = synonyms[searchTerm.toLowerCase()] || searchTerm;
      query = query.or(`name.ilike.%${term}%,model.ilike.%${term}%,brand.ilike.%${term}%`);
    } else {
      query = query.lte('price', maxBudget);
    }

    query = query.order('price', { ascending: true }).limit(limit);

    // Filtrar por tipo — usa ilike (case-insensitive) para não quebrar com
    // variações de capitalização no banco (ex: 'Moto' vs 'moto', 'SUV' vs 'suv')
    if (vehicleTypes && vehicleTypes.length > 0) {
      const normalized = normalizeVehicleTypes(vehicleTypes);
      logger.debug(`[recommend_vehicles] Filtro tipo: ${vehicleTypes.join(',')} → ${normalized.join(',')}`);
      const ilikeConditions = normalized.map(t => `vehicle_type.ilike.${t}`).join(',');
      query = query.or(ilikeConditions);
    }

    const { data: vehicles, error } = await query;

    if (error) {
      logger.error('[recommend_vehicles] Supabase query error:', error);
      return null;
    }

    return vehicles || [];
  } catch (error) {
    logger.error('[recommend_vehicles] Error fetching from Supabase:', error);
    return null;
  }
}

/**
 * Recomenda veículos baseado no perfil do cliente
 * SEM FALLBACK LOCAL - apenas dados do Supabase (fonte única de verdade)
 *
 * @param {object} params - Parâmetros da recomendação
 * @param {string} params.budget - Orçamento do cliente
 * @param {Array<string>} params.vehicleType - Tipos de veículos desejados
 * @param {number} params.maxResults - Máximo de resultados (padrão: 2)
 * @returns {Promise<object>} Resultado da recomendação
 */
export async function recommendVehicles({ budget, vehicleType, searchTerm, maxResults = 2 }) {
  const timestamp = new Date().toISOString();

  try {
    logger.debug('[recommend_vehicles] Buscando veículos:', { budget, vehicleType, searchTerm, maxResults });

    // Parse do orçamento
    const maxBudget = parseBudget(budget);
    logger.debug(`[recommend_vehicles] Orçamento parseado: R$ ${maxBudget.toLocaleString('pt-BR')}`);

    // Busca do Supabase (única fonte de dados)
    const vehiclesFromDb = await fetchVehiclesFromSupabase(maxBudget, maxResults + 1, vehicleType, searchTerm);

    // Erro de conexão com Supabase
    if (vehiclesFromDb === null) {
      logger.error('[recommend_vehicles] Falha ao consultar Supabase');
      return {
        success: false,
        vehicles: [],
        source: 'error',
        message: 'Não consegui consultar o estoque no momento. Peça ao cliente para tentar novamente em instantes.',
        timestamp
      };
    }

    // Supabase respondeu mas não encontrou veículos
    if (vehiclesFromDb.length === 0) {
      logger.info('[recommend_vehicles] Nenhum veículo encontrado nessa faixa');
      return {
        success: true,
        vehicles: [],
        source: 'database',
        message: 'Nenhum veículo disponível nessa faixa de preço no momento.',
        timestamp
      };
    }

    // Sucesso - encontrou veículos
    const results = vehiclesFromDb.slice(0, maxResults);
    logger.info(`[recommend_vehicles] Encontrados ${vehiclesFromDb.length} veículo(s), retornando ${results.length}`);

    return {
      success: true,
      vehicles: results,
      source: 'database',
      message: `Encontrei ${results.length} veículo(s) no seu orçamento`,
      timestamp
    };

  } catch (error) {
    logger.error('[recommend_vehicles] Erro inesperado:', error);

    return {
      success: false,
      vehicles: [],
      source: 'error',
      error: error.message,
      message: 'Não consegui consultar o estoque no momento. Peça ao cliente para tentar novamente em instantes.',
      timestamp
    };
  }
}

/**
 * Busca um veículo específico por ID
 * SEM FALLBACK LOCAL - apenas Supabase
 *
 * @param {number|string} vehicleId - ID do veículo
 * @returns {Promise<object>} Resultado da busca
 */
export async function getVehicleById(vehicleId) {
  const timestamp = new Date().toISOString();

  try {
    logger.debug(`[getVehicleById] Buscando veículo: ${vehicleId}`);

    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Banco de dados não configurado',
        message: 'Não consegui verificar o veículo. Tente novamente em instantes.',
        timestamp
      };
    }

    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single();

    if (error || !vehicle) {
      logger.warn(`[getVehicleById] Veículo ${vehicleId} não encontrado`);
      return {
        success: false,
        error: 'Veículo não encontrado',
        message: 'Não encontrei esse veículo no estoque atual. Quer que eu busque outras opções?',
        timestamp
      };
    }

    logger.info(`[getVehicleById] Encontrado: ${vehicle.name}`);
    return {
      success: true,
      vehicle,
      source: 'database',
      timestamp
    };

  } catch (error) {
    logger.error('[getVehicleById] Erro:', error);

    return {
      success: false,
      error: error.message,
      message: 'Não consegui verificar o veículo. Tente novamente em instantes.',
      timestamp
    };
  }
}
