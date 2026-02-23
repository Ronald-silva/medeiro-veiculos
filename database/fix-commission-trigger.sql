-- ===========================================
-- CORRIGIR TRIGGER DE COMISSÃO
-- Medeiros Veículos - Execute no Supabase SQL Editor
-- ===========================================
-- Problema: trigger antigo recalculava comissão como % do preço de venda,
-- sobrescrevendo os valores fixos enviados pelo sistema (R$300 + R$500).
-- Solução: trigger novo preserva os valores enviados pelo app.
-- ===========================================

CREATE OR REPLACE FUNCTION calculate_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Usa os valores enviados pelo app se já estiverem preenchidos
  -- (sistema envia comissões fixas: Ronald R$300, Adel R$500)
  IF NEW.commission_value IS NULL OR NEW.commission_value = 0 THEN
    NEW.commission_value = 800.00;
  END IF;

  IF NEW.ronald_commission_value IS NULL OR NEW.ronald_commission_value = 0 THEN
    NEW.ronald_commission_value = 300.00;
  END IF;

  IF NEW.adel_commission_value IS NULL OR NEW.adel_commission_value = 0 THEN
    NEW.adel_commission_value = 500.00;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger (já existe, só atualiza a função acima)
DROP TRIGGER IF EXISTS calculate_commission_trigger ON sales;
CREATE TRIGGER calculate_commission_trigger
BEFORE INSERT OR UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION calculate_commission();

-- Corrigir vendas existentes que foram salvas com valores errados
-- (só atualiza se os valores individuais estiverem zerados ou nulos)
UPDATE sales
SET
  commission_value = 800.00,
  ronald_commission_value = 300.00,
  adel_commission_value = 500.00
WHERE
  ronald_commission_value IS NULL
  OR ronald_commission_value = 0
  OR adel_commission_value IS NULL
  OR adel_commission_value = 0;

-- Verificar resultado
SELECT
  id,
  vehicle_name,
  sale_price,
  commission_value,
  ronald_commission_value,
  adel_commission_value,
  ronald_paid,
  adel_paid,
  commission_paid
FROM sales
ORDER BY sale_date DESC;
