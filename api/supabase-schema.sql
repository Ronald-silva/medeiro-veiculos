-- Schema do banco de dados para Supabase - Medeiros Veículos
-- Execute este arquivo no SQL Editor do Supabase Dashboard

-- =====================================================
-- TABELA: leads
-- Armazena leads capturados pelo chat de IA
-- =====================================================
CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  conversation_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  whatsapp VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  orcamento VARCHAR(50),
  tipo_carro VARCHAR(50),
  forma_pagamento VARCHAR(50),
  urgencia VARCHAR(20) DEFAULT 'media',
  tem_troca BOOLEAN DEFAULT false,
  veiculos_interesse JSONB DEFAULT '[]'::jsonb,
  conversation_history JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  status VARCHAR(50) DEFAULT 'novo',
  score INTEGER DEFAULT 50,
  agendamento JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_conversation_id ON leads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp ON leads(whatsapp);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- =====================================================
-- TABELA: vehicles
-- Estoque de veículos disponíveis
-- =====================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  km INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  status VARCHAR(20) DEFAULT 'available',
  stock_count INTEGER DEFAULT 1,
  views_today INTEGER DEFAULT 0,
  views_total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_price ON vehicles(price);

-- =====================================================
-- TABELA: appointments
-- Agendamentos de visitas e test drives
-- =====================================================
CREATE TABLE IF NOT EXISTS appointments (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES leads(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  preferred_date DATE,
  preferred_time VARCHAR(50),
  visit_type VARCHAR(50) NOT NULL,
  vehicle_interest VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_preferred_date ON appointments(preferred_date);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at DESC);

-- =====================================================
-- TABELA: interactions
-- Tracking de eventos para analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS interactions (
  id BIGSERIAL PRIMARY KEY,
  conversation_id UUID,
  lead_id BIGINT REFERENCES leads(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_interactions_conversation_id ON interactions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_interactions_lead_id ON interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC);

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS: Dashboards e relatórios
-- =====================================================

-- View: Dashboard de vendas diário
CREATE OR REPLACE VIEW sales_dashboard AS
SELECT
  DATE(l.created_at) as date,
  COUNT(*) as total_leads,
  COUNT(CASE WHEN l.score >= 70 THEN 1 END) as qualified_leads,
  COUNT(CASE WHEN l.agendamento IS NOT NULL THEN 1 END) as scheduled_visits,
  ROUND(AVG(l.score), 2) as avg_score,
  COUNT(CASE WHEN l.status = 'convertido' THEN 1 END) as conversions
FROM leads l
GROUP BY DATE(l.created_at)
ORDER BY date DESC;

-- View: Leads quentes (score > 70)
CREATE OR REPLACE VIEW hot_leads AS
SELECT
  id,
  nome,
  whatsapp,
  orcamento,
  tipo_carro,
  score,
  urgencia,
  veiculos_interesse,
  created_at
FROM leads
WHERE score > 70
  AND status NOT IN ('convertido', 'perdido')
ORDER BY score DESC, created_at DESC;

-- View: Performance de veículos
CREATE OR REPLACE VIEW vehicle_performance AS
SELECT
  v.id,
  v.name,
  v.price,
  v.type,
  v.status,
  v.views_total,
  COUNT(DISTINCT l.id) as lead_count,
  COUNT(DISTINCT a.id) as appointment_count
FROM vehicles v
LEFT JOIN leads l ON l.veiculos_interesse::text LIKE '%' || v.name || '%'
LEFT JOIN appointments a ON a.vehicle_interest = v.name
GROUP BY v.id, v.name, v.price, v.type, v.status, v.views_total
ORDER BY lead_count DESC, appointment_count DESC;

-- =====================================================
-- DADOS INICIAIS: Popular com veículos de exemplo
-- =====================================================
INSERT INTO vehicles (name, price, type, year, km, features, images, description, status, stock_count)
VALUES
(
  'Honda HR-V EXL 2022',
  145900.00,
  'SUV',
  2022,
  35000,
  '["Automático", "Flex", "Completo"]'::jsonb,
  '["/cars/hrv.png"]'::jsonb,
  'SUV premium com excelente custo-benefício. Completo com todos os opcionais. Procedência verificada, 3 meses de garantia.',
  'available',
  1
),
(
  'Toyota Corolla XEI 2023',
  139900.00,
  'Sedan',
  2023,
  28000,
  '["Automático", "Flex", "Couro"]'::jsonb,
  '["/cars/corolla.png"]'::jsonb,
  'Sedan confortável e econômico, referência em durabilidade. Bancos de couro, central multimídia. 3 meses de garantia.',
  'available',
  1
),
(
  'Jeep Compass Limited 2022',
  169900.00,
  'SUV',
  2022,
  42000,
  '["Automático", "Diesel", "4x4"]'::jsonb,
  '["/cars/compass.png"]'::jsonb,
  'SUV robusto perfeito para aventuras, tração 4x4. Motor diesel econômico. Procedência verificada, 3 meses de garantia.',
  'available',
  1
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE leads IS 'Leads capturados pelo chat de IA - Medeiros Veículos';
COMMENT ON TABLE vehicles IS 'Estoque de veículos disponíveis para venda';
COMMENT ON TABLE appointments IS 'Agendamentos de visitas e test drives';
COMMENT ON TABLE interactions IS 'Tracking de eventos e interações para analytics';

COMMENT ON COLUMN leads.score IS 'Score de qualificação do lead (0-100), calculado automaticamente';
COMMENT ON COLUMN leads.tem_troca IS 'Indica se o cliente tem carro para dar de entrada';
COMMENT ON COLUMN vehicles.status IS 'Status: available, sold, reserved';
COMMENT ON COLUMN appointments.visit_type IS 'Tipo: test_drive ou visit';

-- =====================================================
-- FUNÇÕES ÚTEIS
-- =====================================================

-- Função: Resetar views_today à meia-noite (pode ser agendada via pg_cron ou função externa)
CREATE OR REPLACE FUNCTION reset_daily_views()
RETURNS void AS $$
BEGIN
  UPDATE vehicles SET views_today = 0;
END;
$$ LANGUAGE plpgsql;

-- Função: Calcular score de lead (pode ser chamada via trigger ou manualmente)
CREATE OR REPLACE FUNCTION calculate_lead_score(lead_row leads)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  -- Orçamento (40%)
  IF lead_row.orcamento LIKE '%200%' OR lead_row.orcamento LIKE '%acima%' THEN
    score := score + 40;
  ELSIF lead_row.orcamento LIKE '%150%' THEN
    score := score + 38;
  ELSIF lead_row.orcamento LIKE '%120%' THEN
    score := score + 34;
  ELSIF lead_row.orcamento LIKE '%80%' THEN
    score := score + 28;
  ELSE
    score := score + 20;
  END IF;

  -- Urgência (30%)
  IF lead_row.urgencia = 'alta' THEN
    score := score + 30;
  ELSIF lead_row.urgencia = 'media' THEN
    score := score + 21;
  ELSE
    score := score + 12;
  END IF;

  -- Forma de pagamento (20%)
  IF lead_row.forma_pagamento = 'à vista' THEN
    score := score + 20;
  ELSIF lead_row.forma_pagamento IN ('financiamento', 'cartão') THEN
    score := score + 16;
  ELSE
    score := score + 12;
  END IF;

  -- Bônus
  IF lead_row.tem_troca THEN
    score := score + 15;
  END IF;

  IF lead_row.email IS NOT NULL THEN
    score := score + 10;
  END IF;

  IF lead_row.agendamento IS NOT NULL THEN
    score := score + 25;
  END IF;

  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANT PERMISSIONS (opcional, para RLS futuro)
-- =====================================================
-- Por enquanto, deixamos público para facilitar desenvolvimento
-- Em produção, configure Row Level Security (RLS)

-- =====================================================
-- MENSAGEM FINAL
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Schema criado com sucesso!';
  RAISE NOTICE '📊 Tabelas: leads, vehicles, appointments, interactions';
  RAISE NOTICE '📈 Views: sales_dashboard, hot_leads, vehicle_performance';
  RAISE NOTICE '🚗 Veículos de exemplo inseridos';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '1. Configure as variáveis de ambiente no .env.local';
  RAISE NOTICE '2. Teste o chat no frontend';
  RAISE NOTICE '3. Verifique os dados na Table Editor do Supabase';
END $$;
