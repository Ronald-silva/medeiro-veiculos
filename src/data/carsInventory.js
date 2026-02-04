// Inventário REAL de carros disponíveis - Medeiros Veículos
// Dados do catálogo WhatsApp: https://wa.me/c/558588852900

export const carsInventory = [
  // VEÍCULOS COM FOTOS COMPLETAS (Featured)
  {
    id: 'hilux-sw4-2012',
    name: 'Toyota Hilux SW4 SRV',
    year: 2012,
    brand: 'Toyota',
    model: 'Hilux SW4',
    version: '2012/2012 SRV 7 Lugares 4x4',
    price: 135000,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Diesel',
    transmission: 'Automático',
    vehicleType: 'suv_fechado', // CRÍTICO: SUV FECHADO, NÃO É PICAPE!
    features: [
      '7 lugares',
      'Motor 3.0 Diesel',
      'Tração 4x4',
      'Câmbio automático',
      'Som original',
      'Aro de liga leve',
      'Bancos em couro',
      'Ar-condicionado',
      'Direção hidráulica',
      '⚠️ SUV FECHADO - NÃO É PICAPE'
    ],
    description: '⚠️ ATENÇÃO: SUV FECHADO (não é picape!). Toyota Hilux SW4 SRV 2012 7 Lugares 4x4 Diesel. SUV robusta com porta-malas fechado, perfeita para família. Se procura picape com caçamba, veja L200 Triton ou Ranger.',
    images: [
      '/cars/hilux-1.jpeg',
      '/cars/hilux-2.jpeg',
      '/cars/hilux-3.jpeg',
      '/cars/hilux-4.jpeg',
      '/cars/hilux-5.jpeg',
      '/cars/hilux-6.jpeg',
      '/cars/hilux-7.jpeg',
      '/cars/hilux-8.jpeg',
      '/cars/hilux-9.jpeg',
      '/cars/hilux-10.jpeg',
      '/cars/hilux-11.jpeg',
      '/cars/hilux-12.jpeg',
      '/cars/hilux-13.jpeg',
      '/cars/hilux-14.jpeg',
      '/cars/hilux-15.jpeg',
      '/cars/hilux-16.jpeg',
      '/cars/hilux-17.jpeg',
      '/cars/hilux-18.jpeg',
      '/cars/hilux-19.jpeg',
      '/cars/hilux-20.jpeg',
      '/cars/hilux-21.jpeg'
    ],
    status: 'available',
    category: 'suv',
    featured: true,
    tags: ['diesel', '4x4', '7 lugares', 'toyota', 'automático', 'suv']
  },
  {
    id: 'hrv-2018',
    name: 'Honda HR-V EXL',
    year: 2018,
    brand: 'Honda',
    model: 'HR-V',
    version: '2018 Versão EXL',
    price: 105000,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Flex',
    transmission: 'Automática CVT',
    features: [
      'Versão top de linha EXL',
      'Câmbio CVT',
      'Bancos em couro',
      'Central multimídia',
      'Câmera de ré',
      'Ar-condicionado digital',
      'Sensor de estacionamento',
      'Rodas de liga leve'
    ],
    description: 'Honda HR-V 2018 EXL. SUV compacto versão top de linha com todos os opcionais. Conforto e tecnologia.',
    images: [
      '/cars/hrv-1.jpeg',
      '/cars/hrv-2.jpeg',
      '/cars/hrv-3.jpeg',
      '/cars/hrv-4.jpeg',
      '/cars/hrv-5.jpeg',
      '/cars/hrv-6.jpeg',
      '/cars/hrv-7.jpeg',
      '/cars/hrv-8.jpeg',
      '/cars/hrv-9.jpeg',
      '/cars/hrv-10.jpeg',
      '/cars/hrv-11.jpeg',
      '/cars/hrv-12.jpeg',
      '/cars/hrv-13.jpeg',
      '/cars/hrv-14.jpeg',
      '/cars/hrv-15.jpeg',
      '/cars/hrv-16.jpeg'
    ],
    status: 'available',
    category: 'suv',
    featured: true,
    tags: ['flex', 'automática', 'suv', 'honda', 'top de linha']
  },
  // MOBI VENDIDO - Removido do catálogo em 02/02/2026
  {
    id: 'moto-ninja-400',
    name: 'Kawasaki Ninja 400',
    year: 2020,
    brand: 'Kawasaki',
    model: 'Ninja 400',
    version: '2019/2020',
    price: 32900,
    mileage: 'Baixa KM',
    color: 'Verde/Preto',
    fuel: 'Gasolina',
    transmission: 'Manual',
    features: [
      'Motor 400cc bicilíndrico',
      'Freio ABS',
      'Painel digital completo',
      'Farol full LED',
      'Chassi de aço tubular',
      'Tanque 14 litros',
      'Suspensão dianteira telescópica 41mm',
      'Aceleração 0-100 km/h em 4,6s',
      'Velocidade máxima 190 km/h'
    ],
    description: 'Kawasaki Ninja 400 2019/2020. Moto esportiva versátil, perfeita para cidade e estrada. Econômica com desempenho impressionante.',
    images: [
      '/cars/moto-1.jpeg',
      '/cars/moto-2.jpeg',
      '/cars/moto-3.jpeg',
      '/cars/moto-4.jpeg',
      '/cars/moto-5.jpeg',
      '/cars/moto-6.jpeg',
      '/cars/moto-7.jpeg',
      '/cars/moto-8.jpeg',
      '/cars/moto-9.jpeg',
      '/cars/moto-10.jpeg',
      '/cars/moto-11.jpeg',
      '/cars/moto-12.jpeg'
    ],
    status: 'available',
    category: 'motorcycle',
    featured: true,
    tags: ['moto', 'esportiva', 'abs', '400cc', 'ninja']
  },

  // DEMAIS VEÍCULOS DO CATÁLOGO
  {
    id: 'onix-plus-2020',
    name: 'Chevrolet Onix Plus Premier',
    year: 2020,
    brand: 'Chevrolet',
    model: 'Onix Plus',
    version: '2020 Premier Turbo',
    price: 71900,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Flex',
    transmission: 'Automático',
    features: [
      'Motor 1.0 Turbo',
      'Versão Premier (top de linha)',
      'Câmbio automático',
      'Computador de bordo',
      'Ar-condicionado',
      'Vidros elétricos',
      'Trava elétrica',
      'Central multimídia'
    ],
    description: 'Chevrolet Onix Plus 2020 Premier Turbo. Sedan compacto versão top de linha com motor turbo e câmbio automático.',
    images: [
      '/cars/onix-1.jpeg',
      '/cars/onix-2.jpeg',
      '/cars/onix-3.jpeg',
      '/cars/onix-4.jpeg',
      '/cars/onix-5.jpeg',
      '/cars/onix-6.jpeg',
      '/cars/onix-7.jpeg',
      '/cars/onix-8.jpeg',
      '/cars/onix-9.jpeg',
      '/cars/onix-10.jpeg',
      '/cars/onix-11.jpeg',
      '/cars/onix-12.jpeg',
      '/cars/onix-13.jpeg',
      '/cars/onix-14.jpeg',
      '/cars/onix15.jpeg',
      '/cars/onix-16.jpeg',
      '/cars/onix-17.jpeg',
      '/cars/onix-18.jpeg',
      '/cars/onix-19.jpeg',
      '/cars/onix-20.jpeg',
      '/cars/onix-21.jpeg'
    ],
    status: 'available',
    category: 'sedan',
    featured: true,
    tags: ['sedan', 'flex', 'automático', 'turbo', 'premier', 'top de linha']
  },
  {
    id: 'honda-cg-2019',
    name: 'Honda CG 160 Start',
    year: 2019,
    brand: 'Honda',
    model: 'CG 160',
    version: '2018/2019 Start',
    price: 13500,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Gasolina',
    transmission: 'Manual',
    features: [
      'Motor 160cc',
      'Versão Start',
      'Freio a disco dianteiro',
      'Painel digital',
      'Partida elétrica',
      'Baixo consumo'
    ],
    description: 'Honda CG 160 Start 2018/2019. Moto econômica e confiável, ideal para trabalho e dia a dia.',
    images: [
      '/cars/titan-1.png',
      '/cars/titan-2.png',
      '/cars/titan-3.png',
      '/cars/titan-4.png',
      '/cars/titan-5.png',
      '/cars/titan-6.png',
      '/cars/titan-7.png',
      '/cars/titan-8.png',
      '/cars/titan-9.png',
      '/cars/titan-10.png'
    ],
    status: 'available',
    category: 'motorcycle',
    featured: true,
    tags: ['moto', '160cc', 'econômica', 'honda', 'trabalho']
  },
  {
    id: 'l200-triton-2015',
    name: 'Mitsubishi L200 Triton',
    year: 2015,
    brand: 'Mitsubishi',
    model: 'L200 Triton',
    version: '3.2 Flex ⭐ ÚNICO FLEX NO ESTOQUE',
    price: 95000,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Flex',
    transmission: 'Manual',
    vehicleType: 'picape_aberta', // PICAPE COM CAÇAMBA ABERTA
    features: [
      'Motor 3.2 FLEX (ÚNICO NO ESTOQUE)',
      'Tração 4x4',
      'Cabine dupla',
      'CAÇAMBA ABERTA (picape)',
      'Ar-condicionado',
      'Direção hidráulica',
      'Bancos em couro'
    ],
    description: '✅ PICAPE COM CAÇAMBA ABERTA. L200 Triton 2015 3.2 Flex. ⭐ ÚNICO VEÍCULO FLEX DISPONÍVEL. Picape robusta e potente para trabalho e transporte de carga.',
    images: [
      '/cars/L200-1.jpeg',
      '/cars/L200-2.jpeg',
      '/cars/L200-3.jpeg',
      '/cars/L200-4.jpeg',
      '/cars/L200-5.jpeg',
      '/cars/L200-6.jpeg',
      '/cars/L200-7.jpeg',
      '/cars/L200-8.jpeg',
      '/cars/L200-9.jpeg',
      '/cars/L200-10.jpeg',
      '/cars/L200-11.jpeg',
      '/cars/L200-12.jpeg',
      '/cars/L200-13.jpeg',
      '/cars/L200-14.jpeg',
      '/cars/L200-15.jpeg',
      '/cars/L200-16.jpeg',
      '/cars/L200-17.jpeg'
    ],
    status: 'available',
    category: 'pickup',
    featured: true,
    tags: ['picape', '4x4', 'flex', 'cabine dupla', 'ÚNICO FLEX', 'destaque']
  },
  {
    id: 'pajero-full-2009',
    name: 'Mitsubishi Pajero Full',
    year: 2009,
    brand: 'Mitsubishi',
    model: 'Pajero Full',
    version: '4x4 7 lugares 3.2 Diesel',
    price: 95000,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Diesel',
    transmission: 'Manual',
    features: [
      '7 lugares',
      'Motor 3.2 Diesel',
      'Tração 4x4',
      'Ar-condicionado',
      'Direção hidráulica',
      'Bancos em couro',
      'Teto solar'
    ],
    description: 'Pajero Full 2009 4x4. SUV 7 lugares diesel, robusta e confortável.',
    images: [
      '/cars/Pagero-1.jpeg',
      '/cars/Pagero-2.jpeg',
      '/cars/Pagero-3.jpeg',
      '/cars/Pagero-4.jpeg',
      '/cars/Pagero-5.jpeg',
      '/cars/Pagero-6.jpeg',
      '/cars/Pagero-7.jpeg',
      '/cars/Pagero-8.jpeg',
      '/cars/Pagero-9.jpeg',
      '/cars/Pagero-10.jpeg',
      '/cars/Pagero-11.jpeg',
      '/cars/Pagero-12.jpeg',
      '/cars/Pagero-13.jpeg',
      '/cars/Pagero-14.jpeg',
      '/cars/Pagero-15.jpeg'
    ],
    status: 'available',
    category: 'suv',
    featured: true,
    tags: ['suv', '4x4', 'diesel', '7 lugares']
  },
  {
    id: 'vitara-2014',
    name: 'Suzuki Grand Vitara 4x4',
    year: 2014,
    brand: 'Suzuki',
    model: 'Grand Vitara',
    version: '2013/2014 Limited Edition',
    price: 65000,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Gasolina',
    transmission: 'Manual',
    features: [
      'Versão Limited Edition',
      'Motor 2.0',
      'Tração 4x4',
      'Câmbio manual',
      'Direção hidráulica',
      'Ar-condicionado',
      'Bancos de couro',
      'Central multimídia',
      'Alarme',
      'Trava elétrica'
    ],
    description: 'Suzuki Grand Vitara 2013/2014 Limited Edition 4x4. SUV compacto com motor 2.0, tração 4x4 e bancos em couro.',
    images: [
      '/cars/vitara-1.jpeg',
      '/cars/vitara-2.jpeg',
      '/cars/vitara-3.jpeg',
      '/cars/vitara-4.jpeg',
      '/cars/vitara-5.jpeg',
      '/cars/vitara-6.jpeg',
      '/cars/vitara-7.jpeg',
      '/cars/vitara-8.jpeg',
      '/cars/vitara-9.jpeg',
      '/cars/vitara-10.jpeg',
      '/cars/vitara-11.jpeg',
      '/cars/vitara-12.jpeg',
      '/cars/vitara-13.jpeg',
      '/cars/vitara-14.jpeg',
      '/cars/vitara-15.jpeg'
    ],
    status: 'available',
    category: 'suv',
    featured: true,
    tags: ['suv', '4x4', 'gasolina', 'manual', 'limited edition']
  },
  {
    id: 'ranger-2014',
    name: 'Ford Ranger',
    year: 2014,
    brand: 'Ford',
    model: 'Ranger',
    version: 'Motor 3.2 Diesel',
    price: 115000,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Diesel',
    transmission: 'Manual',
    vehicleType: 'picape_aberta', // PICAPE COM CAÇAMBA ABERTA
    features: [
      'Motor 3.2 Diesel',
      'Tração 4x4',
      'Cabine dupla',
      'CAÇAMBA ABERTA (picape)',
      'Ar-condicionado',
      'Direção hidráulica',
      'Vidros elétricos'
    ],
    description: '✅ PICAPE COM CAÇAMBA ABERTA. Ford Ranger 2014 3.2 Diesel. Picape potente e resistente para trabalho e transporte de carga.',
    images: [
      '/cars/Ranger-1.jpeg',
      '/cars/Ranger-2.jpeg',
      '/cars/Ranger-3.jpeg',
      '/cars/Ranger-4.jpeg',
      '/cars/Ranger-5.jpeg',
      '/cars/Ranger-6.jpeg',
      '/cars/Ranger-7.jpeg',
      '/cars/Ranger-8.jpeg',
      '/cars/Ranger-9.jpeg',
      '/cars/Ranger-10.jpeg',
      '/cars/Ranger-11.jpeg',
      '/cars/Ranger-12.jpeg',
      '/cars/Ranger-13.jpeg',
      '/cars/Ranger-14.jpeg',
      '/cars/Ranger-15.jpeg',
      '/cars/Ranger-16.jpeg',
      '/cars/Ranger-17.jpeg',
      '/cars/Ranger-18.jpeg',
      '/cars/Ranger-19.jpeg',
      '/cars/Ranger-20.jpeg',
      '/cars/Ranger-21.jpeg',
      '/cars/Ranger-22.jpeg'
    ],
    status: 'available',
    category: 'pickup',
    featured: true,
    tags: ['picape', 'diesel', '4x4', 'cabine dupla']
  },
  {
    id: 'spacefox-2008',
    name: 'VW Spacefox',
    year: 2008,
    brand: 'Volkswagen',
    model: 'Spacefox',
    version: '2007/2008 Confortline 1.6',
    price: 31900,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Flex',
    transmission: 'Manual',
    features: [
      'Motor 1.6',
      'Direção hidráulica',
      'Ar-condicionado',
      'Vidros elétricos',
      'Travas elétricas',
      'Porta-malas amplo'
    ],
    description: 'VW Spacefox 2007/2008 Confortline 1.6. Sedan familiar econômico.',
    images: [
      '/cars/space-1.jpeg',
      '/cars/space-2.jpeg',
      '/cars/space-3.jpeg',
      '/cars/space-4.jpeg',
      '/cars/space-5.jpeg',
      '/cars/space-6.jpeg',
      '/cars/space-7.jpeg',
      '/cars/space-8.jpeg',
      '/cars/space-9.jpeg',
      '/cars/space-10.jpeg',
      '/cars/space-11.jpeg',
      '/cars/space-12.jpeg',
      '/cars/space-13.jpeg',
      '/cars/space-14.jpeg',
      '/cars/space-15.jpeg'
    ],
    status: 'available',
    category: 'sedan',
    featured: true,
    tags: ['sedan', 'flex', 'manual', 'familiar']
  }
];

// Filtros disponíveis
export const carFilters = {
  categories: [
    { value: 'all', label: 'Todos' },
    { value: 'hatch', label: 'Hatch' },
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'pickup', label: 'Picape' },
    { value: 'motorcycle', label: 'Motos' }
  ],
  priceRanges: [
    { value: 'all', label: 'Todos os preços', min: 0, max: Infinity },
    { value: 'under40k', label: 'Até R$ 40.000', min: 0, max: 40000 },
    { value: '40k-70k', label: 'R$ 40.000 - R$ 70.000', min: 40000, max: 70000 },
    { value: '70k-100k', label: 'R$ 70.000 - R$ 100.000', min: 70000, max: 100000 },
    { value: 'above100k', label: 'Acima de R$ 100.000', min: 100000, max: Infinity }
  ],
  years: [
    { value: 'all', label: 'Todos os anos' },
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' },
    { value: '2022', label: '2022' },
    { value: '2021', label: '2021' },
    { value: '2020', label: '2020' },
    { value: '2019', label: '2019' },
    { value: '2018', label: '2018' },
    { value: '2017', label: '2017' },
    { value: 'older', label: '2016 ou anterior' }
  ],
  fuels: [
    { value: 'all', label: 'Todos' },
    { value: 'Flex', label: 'Flex' },
    { value: 'Gasolina', label: 'Gasolina' },
    { value: 'Diesel', label: 'Diesel' }
  ]
};

// Função helper para formatar preço
export function formatPrice(price) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0
  }).format(price);
}

// Função helper para filtrar carros
export function filterCars(cars, filters) {
  return cars.filter(car => {
    // Filtro de categoria
    if (filters.category && filters.category !== 'all' && car.category !== filters.category) {
      return false;
    }

    // Filtro de preço
    if (filters.priceRange && filters.priceRange !== 'all') {
      const range = carFilters.priceRanges.find(r => r.value === filters.priceRange);
      if (range && (car.price < range.min || car.price > range.max)) {
        return false;
      }
    }

    // Filtro de ano
    if (filters.year && filters.year !== 'all') {
      if (filters.year === 'older' && car.year >= 2017) return false;
      if (filters.year !== 'older' && car.year !== parseInt(filters.year)) return false;
    }

    // Filtro de combustível
    if (filters.fuel && filters.fuel !== 'all' && car.fuel !== filters.fuel) {
      return false;
    }

    // Filtro de busca por texto
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchableText = `${car.name} ${car.brand} ${car.model} ${car.version}`.toLowerCase();
      if (!searchableText.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });
}

// Função para obter carros em destaque (com fotos)
export function getFeaturedCars() {
  return carsInventory.filter(car => car.featured && car.status === 'available');
}

// Função para obter carro por ID
export function getCarById(id) {
  return carsInventory.find(car => car.id === id);
}
