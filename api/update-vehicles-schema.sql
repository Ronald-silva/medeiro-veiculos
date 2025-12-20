-- Atualização do schema da tabela vehicles para catálogo completo
-- Execute este SQL no Supabase SQL Editor

-- Adiciona novas colunas à tabela vehicles
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
ADD COLUMN IF NOT EXISTS model VARCHAR(100),
ADD COLUMN IF NOT EXISTS fuel VARCHAR(50),
ADD COLUMN IF NOT EXISTS transmission VARCHAR(50),
ADD COLUMN IF NOT EXISTS color VARCHAR(50);

-- Atualiza comentários
COMMENT ON COLUMN vehicles.brand IS 'Marca do veículo (Toyota, Honda, Ford, etc)';
COMMENT ON COLUMN vehicles.model IS 'Modelo do veículo (Corolla, Civic, Ranger, etc)';
COMMENT ON COLUMN vehicles.fuel IS 'Tipo de combustível (Flex, Gasolina, Diesel, Elétrico)';
COMMENT ON COLUMN vehicles.transmission IS 'Tipo de câmbio (Manual, Automático, Automatizado)';
COMMENT ON COLUMN vehicles.color IS 'Cor do veículo';

-- Cria índices para melhor performance em buscas
CREATE INDEX IF NOT EXISTS idx_vehicles_brand ON vehicles(brand);
CREATE INDEX IF NOT EXISTS idx_vehicles_model ON vehicles(model);
CREATE INDEX IF NOT EXISTS idx_vehicles_fuel ON vehicles(fuel);
CREATE INDEX IF NOT EXISTS idx_vehicles_transmission ON vehicles(transmission);
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles(year);

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Schema da tabela vehicles atualizado com sucesso!';
  RAISE NOTICE 'Novas colunas: brand, model, fuel, transmission, color';
  RAISE NOTICE 'Índices criados para otimização de buscas';
END $$;
