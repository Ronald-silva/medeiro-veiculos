-- ===========================================
-- DIAGNÓSTICO DE AGENDAMENTOS
-- Execute no Supabase SQL Editor para investigar
-- ===========================================

-- 1. Ver todos os agendamentos (sem filtro)
SELECT
  id,
  lead_id,
  customer_name,
  customer_phone,
  scheduled_date,
  scheduled_time,
  visit_type,
  vehicle_interest,
  status,
  created_at
FROM appointments
ORDER BY created_at DESC
LIMIT 20;

-- 2. Ver a estrutura da tabela (quais colunas existem)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'appointments'
ORDER BY ordinal_position;
