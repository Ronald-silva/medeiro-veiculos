// Script para popular banco de dados com catálogo real - Medeiros Veículos
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Catálogo real da Medeiros Veículos
const vehicles = [
  {
    name: 'Toyota Hilux SRV 2009',
    brand: 'Toyota',
    model: 'Hilux SRV',
    price: 115000.00,
    year: 2009,
    km: 0, // Não especificado
    type: 'Picape',
    fuel: 'Diesel',
    transmission: 'Manual',
    color: 'Prata',
    features: ['4x4', 'Cabine Dupla', 'Multimídia', 'Câmera de ré'],
    description: 'Toyota Hilux 2009/2009, Cabine Dupla, Cambio Manual, 4x4, Cor Prata, Multimídia, Câmera de ré',
    status: 'available',
    stock_count: 1,
    images: Array(9).fill('/placeholder-car.jpg') // Placeholder até termos imagens reais
  },
  {
    name: 'Kawasaki Ninja 400 2020',
    brand: 'Kawasaki',
    model: 'Ninja 400',
    price: 32900.00,
    year: 2020,
    km: 0,
    type: 'Moto',
    fuel: 'Gasolina',
    transmission: 'Manual',
    color: 'Não especificado',
    features: ['Esportiva', '400cc'],
    description: 'Kawasaki 2019/2020 Ninja 400 - Moto esportiva em excelente estado',
    status: 'available',
    stock_count: 1,
    images: Array(9).fill('/placeholder-moto.jpg')
  },
  {
    name: 'Fiat Mobi Easy On 2017',
    brand: 'Fiat',
    model: 'Mobi',
    price: 39900.00,
    year: 2017,
    km: 0,
    type: 'Hatch',
    fuel: 'Flex',
    transmission: 'Manual',
    color: 'Não especificado',
    features: ['Direção hidráulica', 'Ar condicionado', 'Vidro elétrico'],
    description: 'Fiat Mobi 2017 Versão EASY ON, Motor 1.0, Câmbio Manual, Direção hidráulica, Ar condicionado, Vidro elétrico',
    status: 'available',
    stock_count: 1,
    images: Array(9).fill('/placeholder-car.jpg')
  },
  {
    name: 'Toyota Corolla XEI 2.0 2017',
    brand: 'Toyota',
    model: 'Corolla',
    price: 91900.00,
    year: 2017,
    km: 0,
    type: 'Sedan',
    fuel: 'Flex',
    transmission: 'Automático',
    color: 'Não especificado',
    features: ['Direção elétrica', 'Computador de bordo', 'Ar condicionado', 'Vidro elétrico', 'Trava elétrica', 'Multimídia'],
    description: 'Corolla 2016/2017 Versão XEI, Motor 2.0, Direção elétrica, Câmbio Automático, Computador de bordo',
    status: 'available',
    stock_count: 1,
    images: Array(10).fill('/placeholder-car.jpg')
  },
  {
    name: 'Honda HR-V Touring 2018',
    brand: 'Honda',
    model: 'HR-V',
    price: 105000.00,
    year: 2018,
    km: 0,
    type: 'SUV',
    fuel: 'Flex',
    transmission: 'Automático',
    color: 'Não especificado',
    features: ['Versão Touring', 'Motor 1.8', 'Computador de bordo', 'Ar condicionado', 'Vidro elétrico', 'Trava elétrica', 'Multimídia'],
    description: 'HONDA HRV 2018 Versão TOURING, Motor 1.8, Câmbio Automático, Computador de bordo, Completo',
    status: 'available',
    stock_count: 1,
    images: Array(10).fill('/placeholder-car.jpg')
  },
  {
    name: 'Fiat Argo 1.0 2022',
    brand: 'Fiat',
    model: 'Argo',
    price: 63000.00,
    year: 2022,
    km: 0,
    type: 'Hatch',
    fuel: 'Flex',
    transmission: 'Manual',
    color: 'Não especificado',
    features: ['Motor 1.0', 'Trava elétrica', 'Multimídia', 'Vidros elétricos', 'Direção Elétrica', 'Ar condicionado'],
    description: 'ARGO 2021/2022 Motor 1.0, Câmbio manual, Direção Elétrica, Ar condicionado, Completo',
    status: 'available',
    stock_count: 1,
    images: Array(9).fill('/placeholder-car.jpg')
  },
  {
    name: 'Chevrolet Tracker LTZ Turbo 2022',
    brand: 'Chevrolet',
    model: 'Tracker',
    price: 99900.00,
    year: 2022,
    km: 0,
    type: 'SUV',
    fuel: 'Flex',
    transmission: 'Automático',
    color: 'Não especificado',
    features: ['Motor 1.0 Turbo', 'Direção Elétrica', 'Ar condicionado', 'Vidro elétrico', 'Trava elétrica', 'Alarme', 'Multimídia'],
    description: 'Chevrolet Tracker Versão LTZ, Motor 1.0 Turbo, Câmbio Automático, Completo com todos opcionais',
    status: 'available',
    stock_count: 1,
    images: Array(10).fill('/placeholder-car.jpg')
  },
  {
    name: 'Mitsubishi L200 Triton HPE 2015',
    brand: 'Mitsubishi',
    model: 'L200 Triton',
    price: 95000.00,
    year: 2015,
    km: 0,
    type: 'Picape',
    fuel: 'Flex',
    transmission: 'Automático',
    color: 'Não especificado',
    features: ['Motor 3.5', 'Versão HPE', 'Computador de bordo', 'Ar condicionado', 'Vidro elétrico', 'Trava elétrica', 'Multimídia', 'Aro de liga-leve'],
    description: 'L200 TRITON 2015 FLEX 3.5 Versão HPE, Câmbio Automático, Computador de bordo, Completo',
    status: 'available',
    stock_count: 1,
    images: Array(9).fill('/placeholder-car.jpg')
  },
  {
    name: 'Mitsubishi Pajero Full 4x4 2009',
    brand: 'Mitsubishi',
    model: 'Pajero Full',
    price: 95000.00,
    year: 2009,
    km: 0,
    type: 'SUV',
    fuel: 'Diesel',
    transmission: 'Automático',
    color: 'Não especificado',
    features: ['7 lugares', 'Motor 3.2 Diesel', '4x4', 'Completo', '4 pneus zero', 'Vidros elétricos', 'Multimídia'],
    description: 'Pajero Full 4x4 2009, 7 lugares, Motor 3.2 Diesel, Câmbio Automático, Completo, 4 pneus zero',
    status: 'available',
    stock_count: 1,
    images: Array(10).fill('/placeholder-car.jpg')
  },
  {
    name: 'Nissan Kicks 2024',
    brand: 'Nissan',
    model: 'Kicks',
    price: 115000.00,
    year: 2024,
    km: 0,
    type: 'SUV',
    fuel: 'Flex',
    transmission: 'Automático',
    color: 'Não especificado',
    features: ['Banco de couro', 'Motor 1.6', 'Direção Elétrica', 'Ar condicionado', 'Alarme', 'Trava', 'Multimídia'],
    description: 'Nissan kicks 2023/2024, Banco de couro, Motor 1.6, Automática, Direção Elétrica, Completo',
    status: 'available',
    stock_count: 1,
    images: Array(10).fill('/placeholder-car.jpg')
  },
  {
    name: 'Suzuki Grand Vitara 4x2 2012',
    brand: 'Suzuki',
    model: 'Grand Vitara',
    price: 48000.00,
    year: 2012,
    km: 0,
    type: 'SUV',
    fuel: 'Gasolina',
    transmission: 'Manual',
    color: 'Não especificado',
    features: ['4x2', 'Motor 2.0', 'Direção hidráulica', 'Ar condicionado', 'Alarme', 'Trava', 'Bancos de couro', 'Multimídia'],
    description: 'Suzuki G. Vitara 4x2, Combustível Gasolina, Motor 2.0, Direção hidráulica, Bancos de couro',
    status: 'available',
    stock_count: 1,
    images: Array(9).fill('/placeholder-car.jpg')
  },
  {
    name: 'Ford Ranger 2014',
    brand: 'Ford',
    model: 'Ranger',
    price: 115000.00,
    year: 2014,
    km: 0,
    type: 'Picape',
    fuel: 'Diesel',
    transmission: 'Automático',
    color: 'Prata',
    features: ['Motor 3.2', 'Banco de couro', 'Completo', 'Multimídia', 'Câmera de ré', 'Computador de bordo', 'Trava elétrica', 'Vidros elétricos'],
    description: 'Ford Ranger 2014, Motor 3.2 Diesel, Cor Prata, Banco de couro, Câmbio Automático, Completo',
    status: 'available',
    stock_count: 1,
    images: Array(10).fill('/placeholder-car.jpg')
  },
  {
    name: 'Volkswagen Spacefox Confortline 2008',
    brand: 'Volkswagen',
    model: 'Spacefox',
    price: 31900.00,
    year: 2008,
    km: 0,
    type: 'Sedan',
    fuel: 'Flex',
    transmission: 'Manual',
    color: 'Não especificado',
    features: ['Versão Confortline', 'Motor 1.6', 'Completo', 'Bancada em perfeito estado', 'Vidros elétricos'],
    description: 'Spacefox 2007/2008 Versão Confortline, Motor 1.6, Câmbio Manual, Completo',
    status: 'available',
    stock_count: 1,
    images: Array(9).fill('/placeholder-car.jpg')
  }
];

async function populateVehicles() {
  console.log('🚗 Iniciando população do banco de dados...\n');

  try {
    // Limpa veículos existentes (apenas se for necessário)
    console.log('🗑️  Limpando veículos antigos...');
    const { error: deleteError } = await supabase
      .from('vehicles')
      .delete()
      .neq('id', 0); // Deleta todos

    if (deleteError) {
      console.warn('⚠️  Aviso ao limpar:', deleteError.message);
    } else {
      console.log('✅ Veículos antigos removidos\n');
    }

    // Insere novos veículos
    console.log('📝 Inserindo catálogo real da Medeiros Veículos...\n');

    for (const vehicle of vehicles) {
      const { data, error } = await supabase
        .from('vehicles')
        .insert([vehicle])
        .select()
        .single();

      if (error) {
        console.error(`❌ Erro ao inserir ${vehicle.name}:`, error.message);
      } else {
        console.log(`✅ ${vehicle.name} - R$ ${vehicle.price.toLocaleString('pt-BR')}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 CATÁLOGO ATUALIZADO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log(`📊 Total de veículos: ${vehicles.length}`);
    console.log(`💰 Faixa de preço: R$ ${Math.min(...vehicles.map(v => v.price)).toLocaleString('pt-BR')} - R$ ${Math.max(...vehicles.map(v => v.price)).toLocaleString('pt-BR')}`);
    console.log('\n📋 Resumo por tipo:');

    const byType = vehicles.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {});

    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} veículo(s)`);
    });

    console.log('\n📋 Resumo por marca:');
    const byBrand = vehicles.reduce((acc, v) => {
      acc[v.brand] = (acc[v.brand] || 0) + 1;
      return acc;
    }, {});

    Object.entries(byBrand).forEach(([brand, count]) => {
      console.log(`   ${brand}: ${count} veículo(s)`);
    });

    console.log('\n✅ Próximos passos:');
    console.log('   1. Adicionar imagens reais dos veículos');
    console.log('   2. Atualizar quilometragem dos veículos');
    console.log('   3. Testar o catálogo em http://localhost:3000\n');

  } catch (error) {
    console.error('\n❌ Erro inesperado:', error);
    process.exit(1);
  }
}

populateVehicles();
