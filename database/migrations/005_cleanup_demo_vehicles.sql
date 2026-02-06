-- ============================================
-- MEDEIROS VEICULOS - LIMPEZA DE DADOS DEMO
-- Migração: 005_cleanup_demo_vehicles.sql
-- Data: 2026-02-05
-- Objetivo: Remover veículos fictícios que causam alucinações
-- ============================================

-- PASSO 1: Listar veículos que serão removidos (para conferência)
SELECT
  id,
  name,
  price,
  status,
  created_at
FROM vehicles
WHERE created_at < '2026-02-05'
ORDER BY name;

-- PASSO 2: Fazer backup dos IDs antes de remover
-- (Execute manualmente e salve o resultado se precisar)
-- SELECT id, name, price FROM vehicles WHERE created_at < '2026-02-05';

-- PASSO 3: Remover veículos demo/seed
-- ⚠️ CUIDADO: Execute apenas se tiver certeza
DELETE FROM vehicles
WHERE created_at < '2026-02-05';

-- PASSO 4: Verificar que a tabela está vazia
SELECT COUNT(*) AS total_veiculos FROM vehicles;

-- ============================================
-- APÓS LIMPAR, INSERIR VEÍCULOS REAIS:
--
-- Use este template para cada veículo REAL:
--
-- INSERT INTO vehicles (
--   name, brand, model,
--   year_fabrication, year_model,
--   price, km,
--   fuel_type, transmission, vehicle_type,
--   features, description, selling_points, target_audience,
--   status
-- ) VALUES (
--   'Nome Completo do Veículo',
--   'Marca',
--   'Modelo',
--   2023, 2024,  -- ano fabricação, ano modelo
--   99000.00,    -- preço em reais
--   45000,       -- km rodados
--   'Flex',      -- Flex, Gasolina, Diesel, Elétrico
--   'Automatico', -- Manual, Automatico, CVT
--   'SUV',       -- Hatch, Sedan, SUV, Picape, Moto
--   ARRAY['Completo', 'Ar condicionado', 'Multimidia'],
--   'Descrição breve do veículo',
--   'Pontos de venda principais',
--   'Público-alvo ideal',
--   'available'  -- available, reserved, sold, maintenance
-- );
-- ============================================

-- ============================================
-- ALTERNATIVA: Se você tem uma lista de veículos reais,
-- descomente e ajuste o INSERT abaixo:
-- ============================================

/*
INSERT INTO vehicles (name, brand, model, year_fabrication, year_model, price, km, fuel_type, transmission, vehicle_type, features, description, status) VALUES
  -- Cole aqui os veículos REAIS do estoque atual
  -- Exemplo:
  -- ('Honda Civic EXL 2023', 'Honda', 'Civic EXL', 2023, 2024, 155000, 18000, 'Flex', 'CVT', 'Sedan', ARRAY['Couro', 'Teto solar', 'Automatico'], 'Sedan premium em excelente estado', 'available'),
  -- ('Jeep Compass Limited 2022', 'Jeep', 'Compass Limited', 2022, 2022, 165000, 32000, 'Diesel', 'Automatico', 'SUV', ARRAY['4x4', 'Couro', 'Teto panoramico'], 'SUV premium, unico dono', 'available')
ON CONFLICT DO NOTHING;
*/

-- ============================================
-- IMPORTANTE: Após inserir veículos reais,
-- a Camila só poderá mencionar esses veículos!
--
-- Se a tabela estiver vazia, Camila vai dizer:
-- "Não encontrei opções nessa faixa. Quer que eu avise quando chegar algo?"
-- ============================================
