-- ===========================================
-- CORRIGIR COLUNAS FALTANDO NA TABELA appointments
-- Execute no Supabase SQL Editor
-- ===========================================
-- O código tenta salvar campos que podem não existir
-- na tabela (status, confirmation_sent, reminder_sent, etc)
-- causando falha silenciosa no insert.
-- ===========================================

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS seller_notes TEXT,
  ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Verifica resultado
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'appointments'
ORDER BY ordinal_position;
