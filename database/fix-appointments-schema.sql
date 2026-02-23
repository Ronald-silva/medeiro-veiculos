-- ===========================================
-- CORRIGIR SCHEMA DA TABELA APPOINTMENTS
-- Medeiros Veículos - Execute no Supabase SQL Editor
-- ===========================================
-- Problema: agendamentos pelo chat do site falham porque
-- lead_id é NOT NULL mas o lead nem sempre existe no momento do agendamento
-- ===========================================

-- 1. Torna lead_id opcional (nullable)
ALTER TABLE appointments
  ALTER COLUMN lead_id DROP NOT NULL;

-- 2. Adiciona campos de fallback para quando não há lead vinculado
--    (clientes que agendam pelo chat sem cadastro prévio)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- 3. Verifica o resultado
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'appointments'
  AND column_name IN ('lead_id', 'customer_name', 'customer_phone')
ORDER BY column_name;
