-- ===========================================
-- ADICIONAR CAMPO MILEAGE E ATUALIZAR HILUX SW4
-- Medeiros Veículos - Execute no Supabase SQL Editor
-- ===========================================

-- 1. Adiciona a coluna mileage (quilometragem) na tabela vehicles
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS mileage INTEGER;

-- 2. Atualiza a quilometragem da Hilux SW4
UPDATE vehicles
SET mileage = 192000
WHERE (name ILIKE '%SW4%' OR model ILIKE '%SW4%')
  AND status = 'available';

-- 3. Verifica o resultado (colunas básicas que existem)
SELECT id, name, model, mileage, price, status
FROM vehicles
WHERE name ILIKE '%SW4%' OR model ILIKE '%SW4%';
