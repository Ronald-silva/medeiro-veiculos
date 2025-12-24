-- ============================================
-- MEDEIROS VEÍCULOS - CRM DE VENDAS
-- Sistema Completo de Gestão de Leads e Conversões
-- ============================================

-- PARTE 1: TIPOS ENUM
-- ============================================

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'novo',
    'contatado',
    'qualificado',
    'agendado',
    'visitou',
    'negociando',
    'fechado',
    'perdido'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM (
    'confirmado',
    'compareceu',
    'faltou',
    'remarcado',
    'cancelado'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- PARTE 2: ATUALIZAR TABELA LEADS
-- ============================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS status lead_status DEFAULT 'novo';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'website';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contact TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_probability INTEGER;

-- PARTE 3: CRIAR TABELAS
-- ============================================

CREATE TABLE IF NOT EXISTS appointments (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES leads(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time VARCHAR(20) NOT NULL,
  visit_type VARCHAR(20) NOT NULL,
  vehicle_interest TEXT,
  status appointment_status DEFAULT 'confirmado',
  attended_at TIMESTAMP,
  seller_notes TEXT,
  customer_feedback TEXT,
  interested BOOLEAN,
  made_offer BOOLEAN,
  offer_value DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES leads(id) ON DELETE SET NULL,
  appointment_id BIGINT REFERENCES appointments(id) ON DELETE SET NULL,
  vehicle_id BIGINT,
  vehicle_name VARCHAR(200) NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  down_payment DECIMAL(10,2),
  installments INTEGER,
  commission_rate DECIMAL(5,2) DEFAULT 3.00,
  commission_value DECIMAL(10,2),
  -- Divisão da comissão entre Ronald e Adel (flexível)
  ronald_split_percentage DECIMAL(5,2) DEFAULT 50.00,
  adel_split_percentage DECIMAL(5,2) DEFAULT 50.00,
  ronald_commission_value DECIMAL(10,2),
  adel_commission_value DECIMAL(10,2),
  -- Pagamento da comissão
  commission_paid BOOLEAN DEFAULT FALSE,
  commission_paid_at TIMESTAMP,
  ronald_paid BOOLEAN DEFAULT FALSE,
  adel_paid BOOLEAN DEFAULT FALSE,
  has_tradein BOOLEAN DEFAULT FALSE,
  tradein_vehicle VARCHAR(200),
  tradein_value DECIMAL(10,2),
  seller_name VARCHAR(100),
  sale_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_activities (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES leads(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PARTE 4: CRIAR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON lead_activities(lead_id, created_at DESC);

-- PARTE 5: CRIAR FUNÇÕES E TRIGGERS
-- ============================================

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

CREATE OR REPLACE FUNCTION calculate_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcula comissão total
  NEW.commission_value = (NEW.sale_price * NEW.commission_rate / 100);

  -- Garante que os percentuais de divisão somam 100%
  IF (NEW.ronald_split_percentage + NEW.adel_split_percentage) != 100.00 THEN
    -- Se não somam 100%, ajusta proporcionalmente
    NEW.adel_split_percentage = 100.00 - NEW.ronald_split_percentage;
  END IF;

  -- Calcula quanto cada um recebe da comissão
  NEW.ronald_commission_value = (NEW.commission_value * NEW.ronald_split_percentage / 100);
  NEW.adel_commission_value = (NEW.commission_value * NEW.adel_split_percentage / 100);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_commission_trigger ON sales;
CREATE TRIGGER calculate_commission_trigger BEFORE INSERT OR UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION calculate_commission();

CREATE OR REPLACE FUNCTION log_lead_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lead_activities (lead_id, activity_type, description, metadata)
    VALUES (
      NEW.id,
      'status_change',
      'Status alterado de ' || COALESCE(OLD.status::text, 'null') || ' para ' || COALESCE(NEW.status::text, 'null'),
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

-- PARTE 6: CRIAR VIEWS
-- ============================================

DROP VIEW IF EXISTS dashboard_metrics;
CREATE VIEW dashboard_metrics AS
SELECT
  -- Métricas de leads
  COUNT(DISTINCT l.id) AS total_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'novo' THEN l.id END) AS leads_novos,
  COUNT(DISTINCT CASE WHEN l.status = 'qualificado' THEN l.id END) AS leads_qualificados,
  COUNT(DISTINCT CASE WHEN l.status = 'agendado' THEN l.id END) AS leads_agendados,

  -- Métricas de agendamentos
  COUNT(DISTINCT a.id) AS total_agendamentos,
  COUNT(DISTINCT CASE WHEN a.status = 'confirmado' THEN a.id END) AS agendamentos_confirmados,
  COUNT(DISTINCT CASE WHEN a.status = 'compareceu' THEN a.id END) AS agendamentos_compareceram,
  COUNT(DISTINCT CASE WHEN a.status = 'faltou' THEN a.id END) AS agendamentos_faltaram,

  -- Métricas de vendas
  COUNT(DISTINCT s.id) AS total_vendas,
  COALESCE(SUM(s.sale_price), 0) AS receita_total,

  -- Comissão total (Ronald + Adel)
  COALESCE(SUM(s.commission_value), 0) AS comissao_total,

  -- Valor que fica com Medeiros (dono)
  COALESCE(SUM(s.sale_price) - SUM(s.commission_value), 0) AS medeiros_recebe,

  -- Comissão Ronald
  COALESCE(SUM(s.ronald_commission_value), 0) AS ronald_comissao_total,
  COALESCE(SUM(CASE WHEN s.ronald_paid THEN s.ronald_commission_value ELSE 0 END), 0) AS ronald_comissao_paga,
  COALESCE(SUM(CASE WHEN NOT s.ronald_paid THEN s.ronald_commission_value ELSE 0 END), 0) AS ronald_comissao_pendente,

  -- Comissão Adel
  COALESCE(SUM(s.adel_commission_value), 0) AS adel_comissao_total,
  COALESCE(SUM(CASE WHEN s.adel_paid THEN s.adel_commission_value ELSE 0 END), 0) AS adel_comissao_paga,
  COALESCE(SUM(CASE WHEN NOT s.adel_paid THEN s.adel_commission_value ELSE 0 END), 0) AS adel_comissao_pendente

FROM leads l
LEFT JOIN appointments a ON l.id = a.lead_id
LEFT JOIN sales s ON l.id = s.lead_id;

DROP VIEW IF EXISTS sales_funnel;
CREATE VIEW sales_funnel AS
SELECT
  status,
  COUNT(*) AS count,
  ROUND(AVG(score), 1) AS avg_score,
  STRING_AGG(DISTINCT tipo_carro, ', ') AS tipos_interesse
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
    ELSE 9
  END;

DROP VIEW IF EXISTS todays_appointments;
CREATE VIEW todays_appointments AS
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

-- PARTE 7: POLÍTICAS DE SEGURANÇA
-- ============================================

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

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
