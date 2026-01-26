import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient.js';
import logger from '../../lib/logger.js';

// Estoque de veículos (fallback - quando Supabase não está disponível)
// SINCRONIZADO com inventory.js - MANTER ATUALIZADO!
const VEHICLES_INVENTORY = [
  {
    id: 1,
    name: 'VW Spacefox 2015',
    price: 31000,
    type: 'Hatch',
    year: 2015,
    km: 95000,
    features: ['Manual', 'Flex', 'Completo'],
    description: 'Perua compacta espaçosa'
  },
  {
    id: 2,
    name: 'Kawasaki Ninja 300 2020',
    price: 32000,
    type: 'Moto',
    year: 2020,
    km: 15000,
    features: ['Manual', 'Gasolina', 'Esportiva'],
    description: 'Moto esportiva entrada'
  },
  {
    id: 3,
    name: 'Fiat Mobi Like 2022',
    price: 39000,
    type: 'Hatch',
    year: 2022,
    km: 28000,
    features: ['Manual', 'Flex', 'Direção elétrica'],
    description: 'Compacto econômico, ideal cidade'
  },
  {
    id: 4,
    name: 'Suzuki Vitara 2018',
    price: 48000,
    type: 'SUV',
    year: 2018,
    km: 65000,
    features: ['Automático', 'Gasolina', '4x2'],
    description: 'SUV compacto, ótimo para família'
  },
  {
    id: 5,
    name: 'Fiat Argo Drive 2021',
    price: 63000,
    type: 'Hatch',
    year: 2021,
    km: 35000,
    features: ['Manual', 'Flex', 'Completo'],
    description: 'Hatch moderno e espaçoso'
  },
  {
    id: 6,
    name: 'Toyota Corolla GLI 2019',
    price: 91000,
    type: 'Sedan',
    year: 2019,
    km: 55000,
    features: ['Automático', 'Flex', 'Couro'],
    description: 'Sedan premium, conforto total'
  },
  {
    id: 7,
    name: 'Mitsubishi L200 Triton 2020',
    price: 95000,
    type: 'Picape',
    year: 2020,
    km: 72000,
    features: ['Manual', 'Flex', '4x4'],
    description: 'ÚNICO FLEX no estoque - Picape robusta'
  },
  {
    id: 8,
    name: 'Mitsubishi Pajero Sport 2019',
    price: 95000,
    type: 'SUV',
    year: 2019,
    km: 68000,
    features: ['Automático', 'Diesel', '4x4'],
    description: 'SUV 7 lugares, ideal família grande'
  },
  {
    id: 9,
    name: 'Chevrolet Tracker LTZ 2022',
    price: 99000,
    type: 'SUV',
    year: 2022,
    km: 32000,
    features: ['Automático', 'Turbo Flex', 'Completo'],
    description: 'SUV moderno turbo'
  },
  {
    id: 10,
    name: 'Honda HR-V EX 2021',
    price: 105000,
    type: 'SUV',
    year: 2021,
    km: 45000,
    features: ['Automático', 'Flex', '6 airbags'],
    description: 'SUV espaçosa premium'
  },
  {
    id: 11,
    name: 'Nissan Kicks SL 2022',
    price: 115000,
    type: 'SUV',
    year: 2022,
    km: 28000,
    features: ['Automático', 'Flex', 'Teto solar'],
    description: 'SUV top de linha'
  },
  {
    id: 12,
    name: 'Toyota Hilux SR 2021',
    price: 115000,
    type: 'Picape',
    year: 2021,
    km: 52000,
    features: ['Automático', 'Diesel', '4x4'],
    description: 'Picape referência - cor PRATA'
  },
  {
    id: 13,
    name: 'Ford Ranger XLT 2020',
    price: 115000,
    type: 'Picape',
    year: 2020,
    km: 58000,
    features: ['Automático', 'Diesel', '4x4'],
    description: 'Picape robusta e espaçosa'
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
