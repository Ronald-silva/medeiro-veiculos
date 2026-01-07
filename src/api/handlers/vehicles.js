import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient.js';
import logger from '../../lib/logger.js';

// Estoque de veículos (fallback - quando Supabase não está disponível)
const VEHICLES_INVENTORY = [
  {
    id: 1,
    name: 'Honda HR-V EXL 2022',
    price: 145900,
    type: 'SUV',
    year: 2022,
    km: 35000,
    features: ['Automático', 'Flex', 'Completo'],
    description: 'SUV premium com excelente custo-benefício'
  },
  {
    id: 2,
    name: 'Toyota Corolla XEI 2023',
    price: 139900,
    type: 'Sedan',
    year: 2023,
    km: 28000,
    features: ['Automático', 'Flex', 'Couro'],
    description: 'Sedan confortável e econômico'
  },
  {
    id: 3,
    name: 'Jeep Compass Limited 2022',
    price: 169900,
    type: 'SUV',
    year: 2022,
    km: 42000,
    features: ['Automático', 'Diesel', '4x4'],
    description: 'SUV robusto para aventuras'
  }
];

/**
 * Parse orçamento do texto do cliente
 * @param {string} budget - String de orçamento (ex: "até 150 mil", "100 a 150 mil")
 * @returns {number} Valor máximo do orçamento em reais
 */
function parseBudget(budget) {
  try {
    if (budget.includes('até')) {
      const match = budget.match(/\d+/);
      return match ? parseInt(match[0]) * 1000 : 150000;
    }

    if (budget.includes('-') || budget.includes('a')) {
      const matches = budget.match(/\d+/g);
      return matches && matches[1] ? parseInt(matches[1]) * 1000 : 200000;
    }

    // Tenta extrair um número qualquer
    const match = budget.match(/\d+/);
    return match ? parseInt(match[0]) * 1000 : 200000;
  } catch (error) {
    logger.error('Error parsing budget:', error);
    return 200000; // fallback padrão
  }
}

/**
 * Busca veículos no Supabase
 * @param {number} maxBudget - Orçamento máximo
 * @param {number} limit - Limite de resultados
 * @returns {Promise<Array|null>} Array de veículos ou null se falhar
 */
async function fetchVehiclesFromSupabase(maxBudget, limit = 3) {
  try {
    if (!isSupabaseConfigured()) {
      logger.debug('Supabase not configured, skipping database query');
      return null;
    }

    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'available')
      .lte('price', maxBudget)
      .order('price', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Supabase query error:', error);
      return null;
    }

    return vehicles;
  } catch (error) {
    logger.error('Error fetching vehicles from Supabase:', error);
    return null;
  }
}

/**
 * Filtra veículos do inventário local
 * @param {number} maxBudget - Orçamento máximo
 * @param {Array<string>} vehicleTypes - Tipos de veículos desejados
 * @param {number} maxResults - Máximo de resultados
 * @returns {Array} Array de veículos filtrados
 */
function filterLocalInventory(maxBudget, vehicleTypes = [], maxResults = 2) {
  let recommendations = VEHICLES_INVENTORY.filter(v => v.price <= maxBudget);

  // Filtrar por tipo se especificado
  if (vehicleTypes && vehicleTypes.length > 0) {
    recommendations = recommendations.filter(v =>
      vehicleTypes.some(type => type.toLowerCase() === v.type.toLowerCase())
    );
  }

  // Ordenar por preço (mais caro primeiro)
  recommendations.sort((a, b) => b.price - a.price);

  return recommendations.slice(0, maxResults);
}

/**
 * Recomenda veículos baseado no perfil do cliente
 * @param {object} params - Parâmetros da recomendação
 * @param {string} params.budget - Orçamento do cliente
 * @param {Array<string>} params.vehicleType - Tipos de veículos desejados
 * @param {number} params.maxResults - Máximo de resultados (padrão: 2)
 * @returns {Promise<object>} Resultado da recomendação
 */
export async function recommendVehicles({ budget, vehicleType, maxResults = 2 }) {
  try {
    logger.debug('Recommending vehicles:', { budget, vehicleType, maxResults });

    // Parse do orçamento
    const maxBudget = parseBudget(budget);
    logger.debug(`Parsed budget: R$ ${maxBudget.toLocaleString('pt-BR')}`);

    // Tenta buscar do Supabase primeiro
    const vehiclesFromDb = await fetchVehiclesFromSupabase(maxBudget, 3);

    if (vehiclesFromDb && vehiclesFromDb.length > 0) {
      const results = vehiclesFromDb.slice(0, maxResults);
      logger.info(`Found ${vehiclesFromDb.length} vehicle(s) in database, returning ${results.length}`);

      return {
        success: true,
        vehicles: results,
        message: `Encontrei ${vehiclesFromDb.length} veículo(is) no seu orçamento`,
        source: 'database'
      };
    }

    // Fallback para inventário local
    logger.debug('Using local inventory fallback');
    const recommendations = filterLocalInventory(maxBudget, vehicleType, maxResults);

    logger.info(`Recommended ${recommendations.length} vehicle(s) from local inventory`);

    return {
      success: true,
      vehicles: recommendations,
      message: `Encontrei ${recommendations.length} veículo(is) no seu orçamento`,
      source: 'local'
    };
  } catch (error) {
    logger.error('Error recommending vehicles:', error);

    return {
      success: false,
      error: error.message,
      message: 'Desculpe, tive um problema ao buscar os veículos. Pode tentar novamente?'
    };
  }
}

/**
 * Busca um veículo específico por ID
 * @param {number|string} vehicleId - ID do veículo
 * @returns {Promise<object>} Resultado da busca
 */
export async function getVehicleById(vehicleId) {
  try {
    logger.debug(`Fetching vehicle by ID: ${vehicleId}`);

    // Tenta buscar do Supabase
    if (isSupabaseConfigured()) {
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .single();

      if (!error && vehicle) {
        logger.info(`Found vehicle ${vehicleId} in database`);
        return {
          success: true,
          vehicle,
          source: 'database'
        };
      }
    }

    // Fallback para inventário local
    const vehicle = VEHICLES_INVENTORY.find(v => v.id === parseInt(vehicleId));

    if (vehicle) {
      logger.info(`Found vehicle ${vehicleId} in local inventory`);
      return {
        success: true,
        vehicle,
        source: 'local'
      };
    }

    logger.warn(`Vehicle ${vehicleId} not found`);
    return {
      success: false,
      error: 'Veículo não encontrado',
      message: 'Desculpe, não encontrei esse veículo. Quer que eu busque outros?'
    };
  } catch (error) {
    logger.error('Error fetching vehicle by ID:', error);

    return {
      success: false,
      error: error.message,
      message: 'Desculpe, tive um problema ao buscar o veículo.'
    };
  }
}
