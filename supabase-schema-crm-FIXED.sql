-- ============================================
-- MEDEIROS VEÍCULOS - CRM DE VENDAS (VERSÃO CORRIGIDA)
-- Sistema Completo de Gestão de Leads e Conversões
-- ============================================

-- 1. ENUM para status do lead
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'novo',           -- Lead acabou de chegar
    'contatado',      -- Agente conversou
    'qualificado',    -- Tem orçamento e interesse real
    'agendado',       -- Marcou test drive/visita
    'visitou',        -- Compareceu na loja
    'negociando',     -- Em negociação de preço
    'fechado',        -- VENDA FECHADA 💰
    'perdido'         -- Desistiu
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. ENUM para status do agendamento
DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM (
    'confirmado',     -- Agendamento confirmado
    'compareceu',     -- Cliente veio
    'faltou',         -- No-show
    'remarcado',      -- Remarcou para outra data
    'cancelado'       -- Cancelou
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Atualizar tabela de leads (adicionar campos de controle)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status lead_status DEFAULT 'novo';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0; -- 0-100
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'website'; -- website, instagram, indicacao
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(100); -- Vendedor responsável
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contact TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_probability INTEGER; -- 0-100%

-- 4. Tabela de AGENDAMENTOS (usando BIGINT para compatibilidade)
CREATE TABLE IF NOT EXISTS appointments (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES leads(id) ON DELETE CASCADE,

  -- Dados do agendamento
  scheduled_date DATE NOT NULL,
  scheduled_time VARCHAR(20) NOT NULL, -- "14:00" ou "manhã"
  visit_type VARCHAR(20) NOT NULL, -- test_drive, visit, negotiation
  vehicle_interest TEXT, -- Veículo de interesse

  -- Status
  status appointment_status DEFAULT 'confirmado',
  attended_at TIMESTAMP, -- Quando compareceu

  -- Notas
  seller_notes TEXT,
  customer_feedback TEXT,

  -- Resultado da visita
  interested BOOLEAN, -- Gostou do carro?
  made_offer BOOLEAN, -- Fez proposta?
  offer_value DECIMAL(10,2), -- Valor oferecido

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Tabela de VENDAS (usando BIGINT para compatibilidade)
CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES leads(id) ON DELETE SET NULL,
  appointment_id BIGINT REFERENCES appointments(id) ON DELETE SET NULL,

  -- Dados da venda
  vehicle_id BIGINT, -- Removido REFERENCES vehicles(id) caso não exista
  vehicle_name VARCHAR(200) NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50), -- à vista, financiamento, consórcio
  down_payment DECIMAL(10,2), -- Entrada
  installments INTEGER, -- Número de parcelas

  -- Comissão
  commission_rate DECIMAL(5,2) DEFAULT 3.00, -- % de comissão
  commission_value DECIMAL(10,2), -- Valor da comissão
  commission_paid BOOLEAN DEFAULT FALSE,
  commission_paid_at TIMESTAMP,

  -- Trade-in (carro do cliente)
  has_tradein BOOLEAN DEFAULT FALSE,
  tradein_vehicle VARCHAR(200),
  tradein_value DECIMAL(10,2),

  -- Vendedor
  seller_name VARCHAR(100),

  -- Timestamps
  sale_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Tabela de ATIVIDADES (histórico de interações)
CREATE TABLE IF NOT EXISTS lead_activities (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES leads(id) ON DELETE CASCADE,

  -- Tipo de atividade
  activity_type VARCHAR(50) NOT NULL, -- chat, call, email, visit, whatsapp

  -- Descrição
  description TEXT NOT NULL,

  -- Dados extras (JSON)
  metadata JSONB,

  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON lead_activities(lead_id, created_at DESC);

-- 8. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Função para calcular comissão automaticamente
CREATE OR REPLACE FUNCTION calculate_commission()
RETURNS TRIGGER AS $$
BEGIN
  NEW.commission_value = (NEW.sale_price * NEW.commission_rate / 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_commission_trigger ON sales;
CREATE TRIGGER calculate_commission_trigger BEFORE INSERT OR UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION calculate_commission();

-- 10. View para DASHBOARD (métricas rápidas)
CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT
  -- Leads
  COUNT(DISTINCT l.id) AS total_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'novo' THEN l.id END) AS leads_novos,
  COUNT(DISTINCT CASE WHEN l.status = 'qualificado' THEN l.id END) AS leads_qualificados,
  COUNT(DISTINCT CASE WHEN l.status = 'agendado' THEN l.id END) AS leads_agendados,

  -- Agendamentos
  COUNT(DISTINCT a.id) AS total_agendamentos,
  COUNT(DISTINCT CASE WHEN a.status = 'confirmado' THEN a.id END) AS agendamentos_confirmados,
  COUNT(DISTINCT CASE WHEN a.status = 'compareceu' THEN a.id END) AS agendamentos_compareceram,
  COUNT(DISTINCT CASE WHEN a.status = 'faltou' THEN a.id END) AS agendamentos_faltaram,

  -- Vendas
  COUNT(DISTINCT s.id) AS total_vendas,
  COALESCE(SUM(s.sale_price), 0) AS receita_total,
  COALESCE(SUM(s.commission_value), 0) AS comissao_total,
  COALESCE(SUM(CASE WHEN s.commission_paid THEN s.commission_value ELSE 0 END), 0) AS comissao_paga,

  -- Taxas de conversão
  ROUND(
    (COUNT(DISTINCT CASE WHEN l.status = 'fechado' THEN l.id END)::DECIMAL /
     NULLIF(COUNT(DISTINCT l.id), 0) * 100), 2
  ) AS taxa_conversao_lead_venda,

  ROUND(
    (COUNT(DISTINCT CASE WHEN a.status = 'compareceu' THEN a.id END)::DECIMAL /
     NULLIF(COUNT(DISTINCT a.id), 0) * 100), 2
  ) AS taxa_comparecimento

FROM leads l
LEFT JOIN appointments a ON l.id = a.lead_id
LEFT JOIN sales s ON l.id = s.lead_id;

-- 11. View para FUNIL DE VENDAS
CREATE OR REPLACE VIEW sales_funnel AS
SELECT
  status,
  COUNT(*) AS count,
  ROUND(AVG(score), 1) AS avg_score,
  STRING_AGG(DISTINCT tipoCarro, ', ') AS tipos_interesse
FROM leads
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY status
ORDER BY
  CASE status
    WHEN 'novo' THEN 1
    WHEN 'contatado' THEN 2
    WHEN 'qualificado' THEN 3
    WHEN 'agendado' THEN 4
    WHEN 'visitou' THEN 5
    WHEN 'negociando' THEN 6
    WHEN 'fechado' THEN 7
    WHEN 'perdido' THEN 8
  END;

-- 12. View para AGENDAMENTOS DO DIA
CREATE OR REPLACE VIEW todays_appointments AS
SELECT
  a.*,
  l.nome AS customer_name,
  l.whatsapp AS customer_phone,
  l.score AS lead_score,
  l.orcamento AS budget
FROM appointments a
JOIN leads l ON a.lead_id = l.id
WHERE a.scheduled_date = CURRENT_DATE
  AND a.status IN ('confirmado', 'remarcado')
ORDER BY a.scheduled_time;

-- 13. Função para registrar atividade automaticamente
CREATE OR REPLACE FUNCTION log_lead_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO lead_activities (lead_id, activity_type, description, metadata)
    VALUES (
      NEW.id,
      'status_change',
      'Status alterado de ' || OLD.status || ' para ' || NEW.status,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_lead_status_change ON leads;
CREATE TRIGGER log_lead_status_change AFTER UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION log_lead_activity();

-- 14. Policies de segurança (RLS)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- Permite acesso público para leitura (você pode ajustar depois)
DROP POLICY IF EXISTS "Enable read access for all" ON appointments;
CREATE POLICY "Enable read access for all" ON appointments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all" ON appointments;
CREATE POLICY "Enable insert for all" ON appointments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all" ON appointments;
CREATE POLICY "Enable update for all" ON appointments FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable read access for all" ON sales;
CREATE POLICY "Enable read access for all" ON sales FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all" ON sales;
CREATE POLICY "Enable insert for all" ON sales FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for all" ON lead_activities;
CREATE POLICY "Enable read access for all" ON lead_activities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all" ON lead_activities;
CREATE POLICY "Enable insert for all" ON lead_activities FOR INSERT WITH CHECK (true);

-- ============================================
-- DONE! Agora você tem um CRM completo! 🚀
-- ============================================

-- COMO USAR:
-- 1. Execute este SQL no Supabase (SQL Editor)
-- 2. Use as views para ver métricas:
--    SELECT * FROM dashboard_metrics;
--    SELECT * FROM sales_funnel;
--    SELECT * FROM todays_appointments;
-- 3. O sistema registra TUDO automaticamente
