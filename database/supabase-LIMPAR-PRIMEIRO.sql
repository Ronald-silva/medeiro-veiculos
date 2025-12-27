-- ============================================
-- SCRIPT DE LIMPEZA - EXECUTE ESTE PRIMEIRO!
-- ============================================
-- Este script remove tabelas e views antigas para começar do zero

-- 1. Remover VIEWS primeiro (não dá erro se não existir)
DROP VIEW IF EXISTS todays_appointments CASCADE;
DROP VIEW IF EXISTS sales_funnel CASCADE;
DROP VIEW IF EXISTS dashboard_metrics CASCADE;

-- 2. Remover TABELAS (isso também remove os triggers automaticamente!)
DROP TABLE IF EXISTS lead_activities CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;

-- 3. Remover FUNÇÕES (caso ainda existam)
DROP FUNCTION IF EXISTS log_lead_activity() CASCADE;
DROP FUNCTION IF EXISTS calculate_commission() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 4. Remover TIPOS ENUM
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS lead_status CASCADE;

-- 5. Remover colunas adicionadas à tabela leads (caso queira começar do zero)
-- DESCOMENTE as linhas abaixo se quiser remover as colunas da tabela leads:
-- ALTER TABLE leads DROP COLUMN IF EXISTS status CASCADE;
-- ALTER TABLE leads DROP COLUMN IF EXISTS score;
-- ALTER TABLE leads DROP COLUMN IF EXISTS source;
-- ALTER TABLE leads DROP COLUMN IF EXISTS assigned_to;
-- ALTER TABLE leads DROP COLUMN IF EXISTS last_contact;
-- ALTER TABLE leads DROP COLUMN IF EXISTS notes;
-- ALTER TABLE leads DROP COLUMN IF EXISTS conversion_probability;

-- ============================================
-- ✅ PRONTO! Agora execute supabase-schema-crm.sql
-- ============================================
