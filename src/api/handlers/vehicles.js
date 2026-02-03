import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient.js';
import logger from '../../lib/logger.js';

// Estoque de veículos (fallback - quando Supabase não está disponível)
// SINCRONIZADO com carsInventory.js - MANTER ATUALIZADO!
// Última atualização: 02/02/2026
const VEHICLES_INVENTORY = [
  {
    id: 1,
    name: 'Honda CG 160 Start 2019',
    price: 15000,
    type: 'Moto',
    year: 2019,
    km: 'A consultar',
    features: ['Manual', 'Gasolina', '160cc'],
    description: 'Moto econômica e confiável'
  },
  {
    id: 2,
    name: 'VW Spacefox 2008',
    price: 31900,
    type: 'Sedan',
    year: 2008,
    km: 'A consultar',
    features: ['Manual', 'Flex', 'Completo'],
    description: 'Perua compacta espaçosa'
  },
  {
    id: 3,
    name: 'Kawasaki Ninja 400 2020',
    price: 32900,
    type: 'Moto',
    year: 2020,
    km: 'Baixa KM',
    features: ['Manual', 'Gasolina', 'Esportiva'],
    description: 'Moto esportiva 400cc'
  },
  // MOBI VENDIDO - Removido em 02/02/2026
  {
    id: 5,
    name: 'Suzuki Grand Vitara 2012',
    price: 48000,
    type: 'SUV',
    year: 2012,
    km: 'A consultar',
    features: ['Manual', 'Gasolina', '4x4'],
    description: 'SUV compacto Limited Edition'
  },
  {
    id: 6,
    name: 'Chevrolet Onix Plus Premier 2020',
    price: 71900,
    type: 'Sedan',
    year: 2020,
    km: 'A consultar',
    features: ['Automático', 'Flex', 'Turbo'],
    description: 'Sedan top de linha turbo'
  },
  {
    id: 7,
    name: 'Toyota Corolla XEI 2017',
    price: 91900,
    type: 'Sedan',
    year: 2017,
    km: 'A consultar',
    features: ['Automático', 'Flex', 'Couro'],
    description: 'Sedan premium, conforto total'
  },
  {
    id: 8,
    name: 'Mitsubishi L200 Triton 2015',
    price: 95000,
    type: 'Picape',
    vehicleType: 'picape_aberta', // CAÇAMBA ABERTA
    year: 2015,
    km: 'A consultar',
    features: ['Manual', 'Flex', '4x4', 'CAÇAMBA ABERTA'],
    description: '✅ PICAPE COM CAÇAMBA ABERTA - ÚNICO FLEX - Para trabalho e transporte de carga'
  },
  {
    id: 9,
    name: 'Mitsubishi Pajero Full 2009',
    price: 95000,
    type: 'SUV',
    year: 2009,
    km: 'A consultar',
    features: ['Manual', 'Diesel', '4x4', '7 lugares'],
    description: 'SUV 7 lugares diesel'
  },
  {
    id: 10,
    name: 'Honda HR-V EXL 2018',
    price: 105000,
    type: 'SUV',
    year: 2018,
    km: 'A consultar',
    features: ['Automático', 'Flex', 'CVT'],
    description: 'SUV premium top de linha'
  },
  {
    id: 11,
    name: 'Ford Ranger 2014',
    price: 115000,
    type: 'Picape',
    vehicleType: 'picape_aberta', // CAÇAMBA ABERTA
    year: 2014,
    km: 'A consultar',
    features: ['Manual', 'Diesel', '4x4', 'CAÇAMBA ABERTA'],
    description: '✅ PICAPE COM CAÇAMBA ABERTA - 3.2 diesel - Para trabalho e transporte de carga'
  },
  {
    id: 12,
    name: 'Toyota Hilux SW4 SRV 2012',
    price: 135000,
    type: 'SUV',
    vehicleType: 'suv_fechado', // ⚠️ NÃO É PICAPE!
    year: 2012,
    km: 'A consultar',
    features: ['Automático', 'Diesel', '4x4', '7 lugares', '⚠️ SUV FECHADO'],
    description: '⚠️ ATENÇÃO: SUV FECHADO (NÃO É PICAPE!) - 7 lugares 4x4 diesel - Para família, NÃO tem caçamba'
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
