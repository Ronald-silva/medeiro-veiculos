-- Schema do banco de dados PostgreSQL para Medeiros Veículos
-- Execute este arquivo no Vercel Postgres Dashboard

-- Tabela de Leads
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  conversation_id UUID UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  whatsapp VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  orcamento VARCHAR(50),
  tipo_carro VARCHAR(50),
  forma_pagamento VARCHAR(50),
  urgencia VARCHAR(20) DEFAULT 'media',
  veiculos_interesse JSONB DEFAULT '[]',
  conversation_history JSONB DEFAULT '[]',
  observacoes TEXT,
  status VARCHAR(50) DEFAULT 'novo',
  score INTEGER DEFAULT 50,
  agendamento JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_leads_conversation_id ON leads(conversation_id);
CREATE INDEX idx_leads_whatsapp ON leads(whatsapp);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_score ON leads(score DESC);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- Tabela de Veículos
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  km INTEGER NOT NULL,
  features JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  description TEXT,
  status VARCHAR(20) DEFAULT 'available',
  stock_count INTEGER DEFAULT 1,
  views_today INTEGER DEFAULT 0,
  views_total INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_vehicles_type ON vehicles(type);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_price ON vehicles(price);

-- Tabela de Interações (Analytics)
CREATE TABLE IF NOT EXISTS interactions (
  id SERIAL PRIMARY KEY,
  conversation_id UUID,
  lead_id INTEGER REFERENCES leads(id),
  type VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_interactions_conversation_id ON interactions(conversation_id);
CREATE INDEX idx_interactions_lead_id ON interactions(lead_id);
CREATE INDEX idx_interactions_type ON interactions(type);
CREATE INDEX idx_interactions_created_at ON interactions(created_at DESC);

-- Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id),
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  preferred_date DATE,
  preferred_time VARCHAR(50),
  visit_type VARCHAR(50) NOT NULL,
  vehicle_interest VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_appointments_lead_id ON appointments(lead_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_preferred_date ON appointments(preferred_date);

-- Trigger para atualizar updated_at automaticamente
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

-- Popular tabela de veículos com estoque inicial
INSERT INTO vehicles (name, price, type, year, km, features, images, description, status, stock_count) VALUES
(
  'Honda HR-V EXL 2022',
  145900.00,
  'SUV',
  2022,
  35000,
  '["Automático", "Flex", "Completo"]',
  '["/cars/hrv.png"]',
  'SUV premium com excelente custo-benefício. Completo com todos os opcionais.',
  'available',
  1
),
(
  'Toyota Corolla XEI 2023',
  139900.00,
  'Sedan',
  2023,
  28000,
  '["Automático", "Flex", "Couro"]',
  '["/cars/corolla.png"]',
  'Sedan confortável e econômico, referência em durabilidade.',
  'available',
  1
),
(
  'Jeep Compass Limited 2022',
  169900.00,
  'SUV',
  2022,
  42000,
  '["Automático", "Diesel", "4x4"]',
  '["/cars/compass.png"]',
  'SUV robusto perfeito para aventuras, tração 4x4.',
  'available',
  1
)
ON CONFLICT DO NOTHING;

-- View para dashboard de vendas
CREATE OR REPLACE VIEW sales_dashboard AS
SELECT
  DATE(l.created_at) as date,
  COUNT(*) as total_leads,
  COUNT(CASE WHEN l.score >= 70 THEN 1 END) as qualified_leads,
  COUNT(CASE WHEN l.agendamento IS NOT NULL THEN 1 END) as scheduled_visits,
  AVG(l.score) as avg_score,
  COUNT(CASE WHEN l.status = 'convertido' THEN 1 END) as conversions
FROM leads l
GROUP BY DATE(l.created_at)
ORDER BY date DESC;

-- View para leads quentes (score > 70)
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
  AND status != 'convertido'
ORDER BY score DESC, created_at DESC;

COMMENT ON TABLE leads IS 'Leads capturados pelo chat de IA';
COMMENT ON TABLE vehicles IS 'Estoque de veículos disponíveis';
COMMENT ON TABLE interactions IS 'Tracking de interações para analytics';
COMMENT ON TABLE appointments IS 'Agendamentos de visitas e test drives';
