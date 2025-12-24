// Inventário REAL de carros disponíveis - Medeiros Veículos
// Dados do catálogo WhatsApp: https://wa.me/c/558588852900

export const carsInventory = [
  // VEÍCULOS COM FOTOS COMPLETAS (Featured)
  {
    id: 'hilux-srv-2009',
    name: 'Toyota Hilux SRV',
    year: 2009,
    brand: 'Toyota',
    model: 'Hilux',
    version: '2009/2009 Cabine Dupla SRV',
    price: 115000,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Diesel',
    transmission: 'Manual',
    features: [
      'Cabine dupla',
      'Tração 4x4',
      'Ar-condicionado',
      'Direção hidráulica',
      'Vidros elétricos',
      'Travas elétricas'
    ],
    description: 'Toyota Hilux SRV 2009/2009 Cabine Dupla. Picape resistente e confiável, perfeita para trabalho e lazer.',
    images: [
      '/cars/hilux-1.jpeg',
      '/cars/hilux-2.jpeg',
      '/cars/hilux-3.jpeg',
      '/cars/hilux-4.jpeg',
      '/cars/hilux-5.jpeg',
      '/cars/hilux-6.jpeg',
      '/cars/hilux-7.jpeg',
      '/cars/hilux-8.jpeg',
      '/cars/hilux-9.jpeg'
    ],
    status: 'available',
    category: 'pickup',
    featured: true,
    tags: ['diesel', '4x4', 'cabine dupla', 'toyota']
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
  {
    id: 'mobi-2017',
    name: 'Fiat Mobi Easy',
    year: 2017,
    brand: 'Fiat',
    model: 'Mobi',
    version: 'Ano 2017 Modelo Easy',
    price: 39900,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Flex',
    transmission: 'Manual',
    features: [
      'Direção elétrica',
      'Ar-condicionado',
      'Vidros elétricos',
      'Trava elétrica',
      'Som com Bluetooth',
      'Freios ABS',
      'Airbags'
    ],
    description: 'Fiat Mobi 2017 Easy. Carro econômico e ágil para cidade. Baixo consumo e IPVA reduzido.',
    images: [
      '/cars/mobi-1.jpeg',
      '/cars/mobi-2.jpeg',
      '/cars/mobi-3.jpeg',
      '/cars/mobi-4.jpeg',
      '/cars/mobi-5.jpeg',
      '/cars/mobi-6.jpeg',
      '/cars/mobi-7.jpeg',
      '/cars/mobi-8.jpeg',
      '/cars/mobi-9.jpeg',
      '/cars/mobi-10.jpeg',
      '/cars/mobi-11.jpeg',
      '/cars/mobi-12.jpeg',
      '/cars/mobi-13.jpeg',
      '/cars/mobi-14.jpeg'
    ],
    status: 'available',
    category: 'hatch',
    featured: true,
    tags: ['econômico', 'flex', 'manual', 'baixo consumo']
  },
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
    id: 'kwid-2018',
    name: 'Renault Kwid Zen',
    year: 2018,
    brand: 'Renault',
    model: 'Kwid',
    version: '2017/2018 Versão Zen',
    price: 38500,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Flex',
    transmission: 'Manual',
    features: [
      'Direção elétrica',
      'Ar-condicionado',
      'Vidros elétricos dianteiros',
      'Computador de bordo',
      'Freios ABS',
      'Airbag duplo'
    ],
    description: 'Renault Kwid 2017/2018 Zen. Compacto econômico e moderno.',
    images: [],
    status: 'available',
    category: 'hatch',
    featured: false,
    tags: ['econômico', 'flex', 'manual']
  },
  {
    id: 'corolla-xei-2017',
    name: 'Toyota Corolla XEI',
    year: 2017,
    brand: 'Toyota',
    model: 'Corolla',
    version: '2016/2017 2.0 XEI',
    price: 91900,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Flex',
    transmission: 'Automática',
    features: [
      'Motor 2.0',
      'Câmbio automático',
      'Bancos em couro',
      'Central multimídia',
      'Ar-condicionado digital',
      'Rodas de liga leve',
      'Piloto automático'
    ],
    description: 'Toyota Corolla XEI 2016/2017. Sedan premium com conforto e economia.',
    images: [],
    status: 'available',
    category: 'sedan',
    featured: false,
    tags: ['sedan', 'flex', 'automático', 'premium']
  },
  {
    id: 'argo-2022',
    name: 'Fiat Argo',
    year: 2022,
    brand: 'Fiat',
    model: 'Argo',
    version: '2021/2022 Motor 1.0',
    price: 63000,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Flex',
    transmission: 'Manual',
    features: [
      'Motor 1.0',
      'Direção elétrica',
      'Ar-condicionado',
      'Vidros elétricos',
      'Central multimídia',
      'Freios ABS',
      'Controle de estabilidade'
    ],
    description: 'Fiat Argo 2021/2022 1.0. Hatch moderno e econômico.',
    images: [],
    status: 'available',
    category: 'hatch',
    featured: false,
    tags: ['hatch', 'flex', 'manual', 'moderno']
  },
  {
    id: 'tracker-lt-2022',
    name: 'Chevrolet Tracker LT',
    year: 2022,
    brand: 'Chevrolet',
    model: 'Tracker',
    version: 'LT Automático',
    price: 99900,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Flex',
    transmission: 'Automática',
    features: [
      'Câmbio automático',
      'Central multimídia com tela',
      'Ar-condicionado digital',
      'Câmera de ré',
      'Sensor de estacionamento',
      'Rodas de liga leve',
      'OnStar'
    ],
    description: 'Chevrolet Tracker LT 2022. SUV automático completo e moderno.',
    images: [],
    status: 'available',
    category: 'suv',
    featured: false,
    tags: ['suv', 'automática', 'flex', 'completo']
  },
  {
    id: 'l200-triton-2015',
    name: 'Mitsubishi L200 Triton',
    year: 2015,
    brand: 'Mitsubishi',
    model: 'L200 Triton',
    version: '3.2 Flex',
    price: 95000,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Flex',
    transmission: 'Manual',
    features: [
      'Motor 3.2',
      'Tração 4x4',
      'Cabine dupla',
      'Ar-condicionado',
      'Direção hidráulica',
      'Bancos em couro'
    ],
    description: 'L200 Triton 2015 3.2 Flex. Picape robusta e potente.',
    images: [],
    status: 'available',
    category: 'pickup',
    featured: false,
    tags: ['picape', '4x4', 'flex', 'cabine dupla']
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
    images: [],
    status: 'available',
    category: 'suv',
    featured: false,
    tags: ['suv', '4x4', 'diesel', '7 lugares']
  },
  {
    id: 'kicks-2024',
    name: 'Nissan Kicks',
    year: 2024,
    brand: 'Nissan',
    model: 'Kicks',
    version: '2023/2024 Baixa KM',
    price: 115000,
    mileage: 'Baixa KM',
    color: 'A consultar',
    fuel: 'Flex',
    transmission: 'Automática CVT',
    features: [
      'Câmbio CVT',
      'Baixa quilometragem',
      'Central multimídia',
      'Ar-condicionado digital',
      'Câmera de ré',
      'Sensor de estacionamento',
      'Controle de estabilidade'
    ],
    description: 'Nissan Kicks 2023/2024. SUV moderno com baixa quilometragem.',
    images: [],
    status: 'available',
    category: 'suv',
    featured: false,
    tags: ['suv', 'automática', 'flex', 'baixa km', 'novo']
  },
  {
    id: 'vitara-2012',
    name: 'Suzuki Grand Vitara',
    year: 2012,
    brand: 'Suzuki',
    model: 'Grand Vitara',
    version: '4x2 Gasolina',
    price: 48000,
    mileage: 'A consultar',
    color: 'A consultar',
    fuel: 'Gasolina',
    transmission: 'Manual',
    features: [
      'Tração 4x2',
      'Ar-condicionado',
      'Direção hidráulica',
      'Vidros elétricos',
      'Travas elétricas',
      'Rodas de liga leve'
    ],
    description: 'Suzuki Grand Vitara 2012 4x2. SUV confiável e econômico.',
    images: [],
    status: 'available',
    category: 'suv',
    featured: false,
    tags: ['suv', 'gasolina', 'manual']
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
    features: [
      'Motor 3.2 Diesel',
      'Tração 4x4',
      'Cabine dupla',
      'Ar-condicionado',
      'Direção hidráulica',
      'Vidros elétricos'
    ],
    description: 'Ford Ranger 2014 3.2 Diesel. Picape potente e resistente.',
    images: [],
    status: 'available',
    category: 'pickup',
    featured: false,
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
    images: [],
    status: 'available',
    category: 'sedan',
    featured: false,
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
