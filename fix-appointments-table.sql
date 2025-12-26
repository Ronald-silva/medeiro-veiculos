-- ============================================
-- FIX: Adicionar colunas faltantes na tabela appointments
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Adicionar colunas customer_name e phone se não existirem
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Criar índice para buscas por telefone
CREATE INDEX IF NOT EXISTS idx_appointments_phone ON appointments(phone);

-- Verificar a estrutura da tabela (opcional - apenas para visualizar)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'appointments'
ORDER BY ordinal_position;
