import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Funções auxiliares
export const formatPrice = (price) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0
  }).format(price)
}

export const formatMileage = (km) => {
  if (!km) return '0 km'
  return new Intl.NumberFormat('pt-BR').format(km) + ' km'
}

// Mapear categoria do Supabase para o formato do site
const mapVehicleType = (type) => {
  if (!type) return 'hatch'
  const normalized = type.toLowerCase().trim()
  const typeMap = {
    'car': 'hatch',
    'hatch': 'hatch',
    'suv': 'suv',
    'pickup': 'pickup',
    'picape': 'pickup',
    'truck': 'pickup',
    'motorcycle': 'motorcycle',
    'moto': 'motorcycle',
    'motocicleta': 'motorcycle',
    'bike': 'motorcycle',
    'sedan': 'sedan',
    'minivan': 'sedan',
    'van': 'sedan'
  }
  return typeMap[normalized] || normalized
}

// Mapear combustível
const mapFuel = (fuel) => {
  const fuelMap = {
    'flex': 'Flex',
    'gasoline': 'Gasolina',
    'diesel': 'Diesel',
    'electric': 'Elétrico'
  }
  return fuelMap[fuel] || fuel
}

// Mapear câmbio
const mapTransmission = (transmission) => {
  const transMap = {
    'manual': 'Manual',
    'automatic': 'Automático',
    'cvt': 'CVT'
  }
  return transMap[transmission] || transmission
}

// Transformar veículo do Supabase para o formato esperado pelo site
const transformVehicle = (vehicle) => {
  // Garantir que features é um array
  let features = []
  if (vehicle.features) {
    if (Array.isArray(vehicle.features)) {
      features = vehicle.features
    } else if (typeof vehicle.features === 'string') {
      features = vehicle.features.split(',').map(f => f.trim()).filter(f => f)
    }
  }

  // Garantir que images é um array
  let images = []
  if (vehicle.images) {
    if (Array.isArray(vehicle.images)) {
      images = vehicle.images.filter(img => img && img.trim())
    } else if (typeof vehicle.images === 'string') {
      try {
        images = JSON.parse(vehicle.images).filter(img => img && img.trim())
      } catch {
        images = vehicle.images.trim() ? [vehicle.images] : []
      }
    }
  }

  // Se não tiver imagens no Supabase, exibe placeholder neutro
  if (images.length === 0) {
    images = ['/cars/placeholder.svg']
  }

  const year = vehicle.year_model || vehicle.year_fabrication
  const km = vehicle.km
  const fuel = vehicle.fuel_type || vehicle.fuel
  const type = vehicle.vehicle_type || vehicle.type

  return {
    id: vehicle.id,
    name: vehicle.name || `${vehicle.brand} ${vehicle.model}`,
    brand: vehicle.brand,
    model: vehicle.model,
    version: vehicle.version || '',
    year: year,
    price: vehicle.price,
    mileage: km ? formatMileage(km) : null,
    mileageRaw: km || 0,
    color: vehicle.color || 'Não informado',
    fuel: mapFuel(fuel),
    transmission: mapTransmission(vehicle.transmission),
    category: mapVehicleType(type),
    type: type,
    seats: vehicle.seats || vehicle.doors || 5,
    description: vehicle.description || `${vehicle.brand} ${vehicle.model} ${vehicle.version || ''} - ${year}`,
    features: features,
    images: images,
    status: vehicle.status || 'available',
    featured: vehicle.featured || false
  }
}

// Hook principal para buscar veículos
export function useVehicles(options = {}) {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false })

      // Filtrar apenas disponíveis por padrão (a menos que explicitamente queira todos)
      if (options.includeAll !== true) {
        query = query.eq('status', 'available')
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      const transformedVehicles = (data || []).map(transformVehicle)
      setVehicles(transformedVehicles)
    } catch (err) {
      console.error('Erro ao buscar veículos:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return { vehicles, loading, error, refetch: fetchVehicles }
}

// Hook para buscar veículos em destaque (retorna todos, ordenação feita no componente)
export function useFeaturedVehicles() {
  return useVehicles()
}

// Filtros disponíveis (mantém compatibilidade com o código antigo)
export const carFilters = {
  categories: [
    { value: 'all', label: 'Todas' },
    { value: 'suv', label: 'SUV' },
    { value: 'pickup', label: 'Picape' },
    { value: 'hatch', label: 'Hatch' },
    { value: 'sedan', label: 'Sedan' },
    { value: 'motorcycle', label: 'Moto' }
  ],
  priceRanges: [
    { value: 'all', label: 'Todos os preços' },
    { value: '0-30000', label: 'Até R$ 30.000' },
    { value: '30000-60000', label: 'R$ 30.000 - R$ 60.000' },
    { value: '60000-100000', label: 'R$ 60.000 - R$ 100.000' },
    { value: '100000-150000', label: 'R$ 100.000 - R$ 150.000' },
    { value: '150000-999999', label: 'Acima de R$ 150.000' }
  ],
  years: [
    { value: 'all', label: 'Todos' },
    { value: '2024-2025', label: '2024-2025' },
    { value: '2020-2023', label: '2020-2023' },
    { value: '2015-2019', label: '2015-2019' },
    { value: '2010-2014', label: '2010-2014' },
    { value: '0-2009', label: 'Antes de 2010' }
  ],
  fuels: [
    { value: 'all', label: 'Todos' },
    { value: 'Flex', label: 'Flex' },
    { value: 'Gasolina', label: 'Gasolina' },
    { value: 'Diesel', label: 'Diesel' },
    { value: 'Elétrico', label: 'Elétrico' }
  ]
}

// Função para filtrar veículos (mantém compatibilidade)
export function filterCars(vehicles, filters) {
  return vehicles.filter(vehicle => {
    // Filtro de categoria
    if (filters.category && filters.category !== 'all') {
      if (vehicle.category !== filters.category && vehicle.type !== filters.category) {
        return false
      }
    }

    // Filtro de preço
    if (filters.priceRange && filters.priceRange !== 'all') {
      const [min, max] = filters.priceRange.split('-').map(Number)
      if (vehicle.price < min || vehicle.price > max) {
        return false
      }
    }

    // Filtro de ano
    if (filters.year && filters.year !== 'all') {
      const [minYear, maxYear] = filters.year.split('-').map(Number)
      if (vehicle.year < minYear || vehicle.year > maxYear) {
        return false
      }
    }

    // Filtro de combustível
    if (filters.fuel && filters.fuel !== 'all') {
      if (vehicle.fuel !== filters.fuel) {
        return false
      }
    }

    // Filtro de busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const searchableText = `${vehicle.name} ${vehicle.brand} ${vehicle.model} ${vehicle.version || ''}`.toLowerCase()
      if (!searchableText.includes(searchLower)) {
        return false
      }
    }

    return true
  })
}
