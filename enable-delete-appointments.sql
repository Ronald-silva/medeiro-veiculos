-- ============================================
-- FIX: Adicionar política de DELETE para appointments
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Permite deletar agendamentos
DROP POLICY IF EXISTS "Enable delete for all" ON appointments;
CREATE POLICY "Enable delete for all" ON appointments FOR DELETE USING (true);
