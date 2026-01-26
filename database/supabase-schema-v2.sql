-- ============================================
-- MEDEIROS VEICULOS - CAMILA 2.0
-- Schema Completo para IA de Vendas de Alta Conversao
-- Baseado em melhores praticas: DaveAI, Conversica, Drift
-- ============================================
-- Versao: 2.0
-- Data: 2026-01-24
-- Objetivo: Sistema de memoria inteligente + CRM avancado
-- ============================================

-- ============================================
-- PARTE 1: EXTENSOES NECESSARIAS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para busca fuzzy

-- ============================================
-- PARTE 2: TIPOS ENUM
-- ============================================

-- Status do lead no funil
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'novo',           -- Acabou de chegar
    'em_conversa',    -- Camila esta conversando
    'qualificado',    -- BANT completo, lead quente
    'agendado',       -- Visita agendada
    'visitou',        -- Veio na loja
    'negociando',     -- Em negociacao ativa
    'proposta',       -- Proposta enviada
    'fechado',        -- VENDA REALIZADA
    'perdido',        -- Nao converteu
    'reengajar'       -- Para follow-up futuro
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Temperatura do lead (baseado em scoring)
DO $$ BEGIN
  CREATE TYPE lead_temperature AS ENUM (
    'frio',           -- Score 0-39
    'morno',          -- Score 40-69
    'quente',         -- Score 70-89
    'muito_quente'    -- Score 90-100
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status do agendamento
DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM (
    'pendente',       -- Aguardando confirmacao
    'confirmado',     -- Cliente confirmou
    'lembrete_enviado', -- Lembrete 24h enviado
    'compareceu',     -- Veio na loja
    'faltou',         -- Nao apareceu
    'remarcado',      -- Remarcou para outra data
    'cancelado'       -- Cancelou
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo de mensagem na conversa
DO $$ BEGIN
  CREATE TYPE message_role AS ENUM (
    'user',           -- Mensagem do cliente
    'assistant',      -- Resposta da Camila
    'system',         -- Mensagem do sistema
    'tool_call',      -- Chamada de ferramenta
    'tool_result'     -- Resultado da ferramenta
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Canal de comunicacao
DO $$ BEGIN
  CREATE TYPE channel_type AS ENUM (
    'whatsapp',
    'website',
    'instagram',
    'facebook',
    'telefone',
    'presencial'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Estagio SPIN identificado
DO $$ BEGIN
  CREATE TYPE spin_stage AS ENUM (
    'situation',      -- Entendendo situacao
    'problem',        -- Identificando problema
    'implication',    -- Mostrando implicacoes
    'need_payoff'     -- Criando necessidade
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Perfil comportamental do cliente
DO $$ BEGIN
  CREATE TYPE buyer_persona AS ENUM (
    'decisor_rapido',     -- Decide rapido, quer objetividade
    'analitico',          -- Pesquisa muito, quer dados
    'emocional',          -- Decide por emocao, quer conexao
    'economico',          -- Foco em preco e economia
    'premium',            -- Quer o melhor, nao liga pra preco
    'familia',            -- Prioriza seguranca e espaco
    'desconhecido'        -- Ainda nao identificado
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status do veiculo
DO $$ BEGIN
  CREATE TYPE vehicle_status AS ENUM (
    'available',      -- Disponivel para venda
    'reserved',       -- Reservado para cliente
    'sold',           -- Vendido
    'maintenance',    -- Em manutencao
    'inactive'        -- Inativo/removido
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- PARTE 3: TABELA DE VEICULOS (INVENTARIO)
-- ============================================

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identificacao
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  version VARCHAR(100),

  -- Caracteristicas principais
  year_fabrication INTEGER NOT NULL,
  year_model INTEGER NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  promotional_price DECIMAL(12,2),

  -- Detalhes tecnicos
  km INTEGER DEFAULT 0,
  fuel_type VARCHAR(50) DEFAULT 'Flex',
  transmission VARCHAR(50) DEFAULT 'Manual',
  color VARCHAR(50),
  doors INTEGER DEFAULT 4,
  engine VARCHAR(50),

  -- Categorias
  vehicle_type VARCHAR(50) NOT NULL, -- Hatch, Sedan, SUV, Picape, Moto
  category VARCHAR(50), -- economico, intermediario, premium

  -- Diferenciais (array de strings)
  features TEXT[] DEFAULT '{}',
  highlights TEXT[] DEFAULT '{}', -- Pontos de destaque para venda

  -- Midia
  main_image_url TEXT,
  images TEXT[] DEFAULT '{}',
  video_url TEXT,

  -- Descricao para IA
  description TEXT,
  selling_points TEXT, -- Argumentos de venda para a Camila
  target_audience TEXT, -- Publico-alvo ideal

  -- Controle
  status vehicle_status DEFAULT 'available',
  views_count INTEGER DEFAULT 0,
  inquiries_count INTEGER DEFAULT 0,

  -- Metadata
  plate_ending VARCHAR(1), -- Final da placa (para rodizio)
  documentation_ok BOOLEAN DEFAULT TRUE,
  accepts_trade BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para busca rapida
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_price ON vehicles(price);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_brand ON vehicles(brand);
CREATE INDEX IF NOT EXISTS idx_vehicles_search ON vehicles USING gin(to_tsvector('portuguese', name || ' ' || brand || ' ' || model));

-- ============================================
-- PARTE 4: TABELA DE LEADS (CLIENTES)
-- ============================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identificacao basica
  name VARCHAR(200),
  whatsapp VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(200),

  -- Qualificacao BANT
  budget_min DECIMAL(12,2),
  budget_max DECIMAL(12,2),
  budget_text VARCHAR(100), -- "ate 80 mil", "100 a 150"
  has_trade_in BOOLEAN DEFAULT FALSE,
  trade_in_vehicle VARCHAR(200),
  trade_in_value DECIMAL(12,2),
  down_payment DECIMAL(12,2), -- Valor de entrada

  -- Authority (Decisor)
  is_decision_maker BOOLEAN DEFAULT TRUE,
  decision_makers TEXT, -- "eu e minha esposa"

  -- Need (Necessidade)
  vehicle_type_interest VARCHAR(100), -- SUV, Sedan, etc
  usage_type VARCHAR(100), -- familia, trabalho, lazer
  family_size INTEGER,
  special_needs TEXT, -- "precisa de porta-malas grande"

  -- Timeline (Prazo)
  urgency_level VARCHAR(50), -- imediato, 1_semana, 1_mes, pesquisando
  purchase_timeline TEXT, -- "preciso pra semana que vem"

  -- Preferencias de contato
  preferred_contact_time VARCHAR(100), -- "manha", "noite", "qualquer"

  -- Scoring e Status
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  temperature lead_temperature DEFAULT 'frio',
  status lead_status DEFAULT 'novo',

  -- Origem e Atribuicao
  source channel_type DEFAULT 'whatsapp',
  source_detail VARCHAR(200), -- "anuncio facebook verao"
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  assigned_to VARCHAR(100), -- vendedor responsavel

  -- Controle de interacao
  first_contact_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  messages_count INTEGER DEFAULT 0,
  response_time_avg INTEGER, -- tempo medio de resposta em segundos

  -- Interesse em veiculos especificos
  interested_vehicles UUID[] DEFAULT '{}',
  viewed_vehicles UUID[] DEFAULT '{}',

  -- Objecoes identificadas
  objections TEXT[] DEFAULT '{}', -- ["preco alto", "precisa pensar"]
  objections_handled TEXT[] DEFAULT '{}',

  -- SPIN Selling tracking
  current_spin_stage spin_stage DEFAULT 'situation',
  situation_notes TEXT,
  problem_notes TEXT,
  implication_notes TEXT,
  need_notes TEXT,

  -- Notas e observacoes
  notes TEXT,
  ai_notes TEXT, -- Notas geradas pela Camila
  seller_notes TEXT, -- Notas do vendedor humano

  -- Probabilidade de conversao (calculada)
  conversion_probability INTEGER DEFAULT 0,

  -- Razao de perda (se perdido)
  loss_reason VARCHAR(200),
  loss_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp ON leads(whatsapp);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_temperature ON leads(temperature);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_last_contact ON leads(last_contact_at DESC);

-- ============================================
-- PARTE 5: TABELA DE CONVERSAS
-- ============================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  -- Identificacao da sessao
  session_id VARCHAR(100) NOT NULL, -- ID unico da sessao
  channel channel_type DEFAULT 'whatsapp',

  -- Estado da conversa
  is_active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Metricas da sessao
  messages_count INTEGER DEFAULT 0,
  user_messages_count INTEGER DEFAULT 0,
  assistant_messages_count INTEGER DEFAULT 0,
  tools_called INTEGER DEFAULT 0,

  -- Estado SPIN
  spin_stage spin_stage DEFAULT 'situation',

  -- Contexto acumulado (resumo)
  context_summary TEXT, -- Resumo do que foi discutido
  key_facts JSONB DEFAULT '{}', -- Fatos importantes extraidos

  -- Intencao detectada
  detected_intent VARCHAR(100), -- comprar, pesquisar, negociar, reclamar
  sentiment VARCHAR(50), -- positivo, neutro, negativo

  -- Veiculos discutidos
  vehicles_discussed UUID[] DEFAULT '{}',
  vehicles_recommended UUID[] DEFAULT '{}',

  -- Resultado
  outcome VARCHAR(100), -- agendamento, lead_qualificado, sem_interesse
  next_action TEXT, -- Proxima acao sugerida

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_active ON conversations(is_active);

-- ============================================
-- PARTE 6: TABELA DE MENSAGENS
-- ============================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  -- Conteudo
  role message_role NOT NULL,
  content TEXT NOT NULL,

  -- Metadata da mensagem
  tokens_used INTEGER,
  model_used VARCHAR(100),

  -- Para tool calls
  tool_name VARCHAR(100),
  tool_input JSONB,
  tool_output JSONB,

  -- Analise da mensagem
  intent VARCHAR(100), -- intencao detectada nesta mensagem
  sentiment VARCHAR(50), -- sentimento desta mensagem
  entities JSONB, -- entidades extraidas (valores, datas, etc)

  -- Controle
  is_processed BOOLEAN DEFAULT FALSE,
  processing_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages(lead_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

-- ============================================
-- PARTE 7: PERFIL DO CLIENTE (MEMORIA LONGA)
-- ============================================

CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID UNIQUE REFERENCES leads(id) ON DELETE CASCADE,

  -- Perfil comportamental
  persona buyer_persona DEFAULT 'desconhecido',
  communication_style VARCHAR(50),
  response_pattern VARCHAR(100), -- rapido, demorado, horario_comercial

  -- Preferencias aprendidas
  preferred_vehicle_types TEXT[] DEFAULT '{}',
  preferred_brands TEXT[] DEFAULT '{}',
  preferred_colors TEXT[] DEFAULT '{}',
  preferred_features TEXT[] DEFAULT '{}',

  -- Restricoes conhecidas
  budget_constraint DECIMAL(12,2),
  financing_preference VARCHAR(50), -- a_vista, financiado, consorcio
  trade_in_expected BOOLEAN DEFAULT FALSE,

  -- Historico de interacoes
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  avg_response_time INTEGER, -- segundos
  best_contact_time VARCHAR(100),

  -- Engagement score
  engagement_score INTEGER DEFAULT 0,
  last_engagement_at TIMESTAMPTZ,

  -- Resumos de conversas anteriores
  conversation_summaries TEXT[] DEFAULT '{}',
  key_memories TEXT[] DEFAULT '{}', -- Memorias importantes

  -- Gatilhos emocionais identificados
  emotional_triggers TEXT[] DEFAULT '{}', -- seguranca, status, economia
  pain_points TEXT[] DEFAULT '{}', -- dores identificadas

  -- Objecoes recorrentes
  common_objections TEXT[] DEFAULT '{}',
  successful_rebuttals TEXT[] DEFAULT '{}', -- contra-argumentos que funcionaram

  -- Tags e segmentacao
  tags TEXT[] DEFAULT '{}',
  segment VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_lead ON customer_profiles(lead_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_persona ON customer_profiles(persona);

-- ============================================
-- PARTE 8: RESUMOS DE CONVERSAS
-- ============================================

CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  -- Resumo
  summary TEXT NOT NULL,
  key_points TEXT[] DEFAULT '{}',

  -- Fatos extraidos
  facts_learned JSONB DEFAULT '{}',
  -- Exemplo: {"orcamento": 80000, "familia": 4, "uso": "trabalho"}

  -- Veiculos de interesse
  vehicles_interested UUID[] DEFAULT '{}',

  -- Proximos passos
  next_steps TEXT,
  follow_up_date DATE,
  follow_up_reason TEXT,

  -- Sentimento geral
  overall_sentiment VARCHAR(50),
  engagement_level VARCHAR(50), -- alto, medio, baixo

  -- Status do SPIN
  spin_progress JSONB DEFAULT '{}',
  -- Exemplo: {"situation": true, "problem": true, "implication": false}

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_summaries_lead ON conversation_summaries(lead_id);
CREATE INDEX IF NOT EXISTS idx_summaries_conversation ON conversation_summaries(conversation_id);

-- ============================================
-- PARTE 9: AGENDAMENTOS
-- ============================================

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  -- Agendamento
  scheduled_date DATE NOT NULL,
  scheduled_time VARCHAR(20) NOT NULL,
  visit_type VARCHAR(50) NOT NULL, -- test_drive, visita, negociacao

  -- Veiculo de interesse
  vehicle_id UUID REFERENCES vehicles(id),
  vehicle_interest TEXT,

  -- Status
  status appointment_status DEFAULT 'pendente',

  -- Confirmacoes
  confirmation_sent BOOLEAN DEFAULT FALSE,
  confirmation_sent_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,

  -- Resultado da visita
  attended_at TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Feedback
  customer_feedback TEXT,
  seller_notes TEXT,

  -- Resultado comercial
  interested BOOLEAN,
  made_offer BOOLEAN,
  offer_value DECIMAL(12,2),
  next_step TEXT,

  -- Motivo se faltou
  no_show_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_lead ON appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_vehicle ON appointments(vehicle_id);

-- ============================================
-- PARTE 10: VENDAS
-- ============================================

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,

  -- Dados do veiculo vendido
  vehicle_name VARCHAR(200) NOT NULL,
  vehicle_details JSONB, -- Copia dos dados do veiculo no momento da venda

  -- Valores
  list_price DECIMAL(12,2), -- Preco de tabela
  sale_price DECIMAL(12,2) NOT NULL, -- Preco final
  discount_value DECIMAL(12,2) DEFAULT 0,
  discount_reason TEXT,

  -- Pagamento
  payment_method VARCHAR(50), -- a_vista, financiado, consorcio
  down_payment DECIMAL(12,2),
  financed_value DECIMAL(12,2),
  installments INTEGER,
  installment_value DECIMAL(12,2),
  financing_bank VARCHAR(100),

  -- Trade-in
  has_trade_in BOOLEAN DEFAULT FALSE,
  trade_in_vehicle VARCHAR(200),
  trade_in_value DECIMAL(12,2),
  trade_in_details JSONB,

  -- Comissao (sistema flexivel)
  commission_rate DECIMAL(5,2) DEFAULT 3.00,
  commission_value DECIMAL(12,2),

  -- Divisao da comissao
  ronald_split_percentage DECIMAL(5,2) DEFAULT 50.00,
  adel_split_percentage DECIMAL(5,2) DEFAULT 50.00,
  ronald_commission_value DECIMAL(12,2),
  adel_commission_value DECIMAL(12,2),

  -- Pagamento de comissao
  commission_paid BOOLEAN DEFAULT FALSE,
  commission_paid_at TIMESTAMPTZ,
  ronald_paid BOOLEAN DEFAULT FALSE,
  ronald_paid_at TIMESTAMPTZ,
  adel_paid BOOLEAN DEFAULT FALSE,
  adel_paid_at TIMESTAMPTZ,

  -- Vendedor
  seller_name VARCHAR(100),

  -- Datas
  sale_date DATE NOT NULL,
  delivery_date DATE,

  -- Metricas de atribuicao
  days_to_close INTEGER, -- Dias desde primeiro contato
  touchpoints INTEGER, -- Numero de interacoes ate fechar
  ai_influenced BOOLEAN DEFAULT TRUE, -- Camila participou?

  -- Notas
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_lead ON sales(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_vehicle ON sales(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(seller_name);

-- ============================================
-- PARTE 11: ATIVIDADES DO LEAD (TIMELINE)
-- ============================================

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  -- Tipo de atividade
  activity_type VARCHAR(50) NOT NULL,
  -- Tipos: message_received, message_sent, status_change,
  --        vehicle_viewed, vehicle_recommended, appointment_scheduled,
  --        appointment_confirmed, visited, offer_made, sale_closed,
  --        objection_raised, objection_handled, follow_up_scheduled

  -- Descricao
  description TEXT NOT NULL,

  -- Dados adicionais
  metadata JSONB DEFAULT '{}',

  -- Quem realizou
  performed_by VARCHAR(100), -- 'camila', 'ronald', 'adel', 'sistema'

  -- Impacto no score
  score_change INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_lead ON lead_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON lead_activities(activity_type);

-- ============================================
-- PARTE 12: EVENTOS DO FUNIL DE VENDAS
-- ============================================

CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  -- Evento
  event_type VARCHAR(100) NOT NULL,
  -- Tipos: lead_created, first_response, qualification_complete,
  --        appointment_scheduled, appointment_attended, negotiation_started,
  --        proposal_sent, sale_closed, lead_lost

  -- Dados do evento
  from_status lead_status,
  to_status lead_status,

  -- Tempo no estagio anterior
  time_in_previous_stage INTEGER, -- segundos

  -- Contexto
  context JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_lead ON funnel_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_funnel_type ON funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_funnel_created ON funnel_events(created_at);

-- ============================================
-- PARTE 13: INSIGHTS DA IA
-- ============================================

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Tipo de insight
  insight_type VARCHAR(100) NOT NULL,
  -- Tipos: objection_detected, hot_lead, buying_signal,
  --        churn_risk, upsell_opportunity, referral_potential

  -- Conteudo
  insight TEXT NOT NULL,
  confidence DECIMAL(5,2), -- 0-100%

  -- Acao sugerida
  suggested_action TEXT,
  action_priority VARCHAR(20), -- alta, media, baixa

  -- Status
  is_actioned BOOLEAN DEFAULT FALSE,
  actioned_at TIMESTAMPTZ,
  actioned_by VARCHAR(100),
  action_result TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_lead ON ai_insights(lead_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_priority ON ai_insights(action_priority);

-- ============================================
-- PARTE 14: TEMPLATES DE MENSAGENS
-- ============================================

CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identificacao
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL, -- saudacao, follow_up, agendamento, objecao

  -- Conteudo
  content TEXT NOT NULL,

  -- Variaveis disponiveis
  variables TEXT[] DEFAULT '{}', -- {{nome}}, {{veiculo}}, etc

  -- Quando usar
  trigger_condition TEXT, -- Condicao para sugerir este template

  -- Metricas
  times_used INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0, -- Taxa de resposta positiva

  -- Controle
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_active ON message_templates(is_active);

-- ============================================
-- PARTE 15: CONFIGURACOES DO SISTEMA
-- ============================================

CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(100)
);

-- Configuracoes iniciais
INSERT INTO system_config (key, value, description) VALUES
  ('business_hours', '{"weekdays": {"start": "08:00", "end": "18:00"}, "saturday": {"start": "08:00", "end": "13:00"}, "sunday": null}', 'Horario de funcionamento'),
  ('commission_defaults', '{"rate": 3.00, "ronald_split": 50, "adel_split": 50}', 'Configuracoes padrao de comissao'),
  ('scoring_weights', '{"budget": 30, "urgency": 25, "authority": 25, "engagement": 20}', 'Pesos do lead scoring'),
  ('ai_config', '{"model": "claude-sonnet-4-5-20250929", "max_tokens": 500, "temperature": 0.7}', 'Configuracoes da IA'),
  ('follow_up_rules', '{"first": "2h", "second": "24h", "third": "72h", "max_attempts": 5}', 'Regras de follow-up')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- PARTE 16: FUNCOES E TRIGGERS
-- ============================================

-- Funcao para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE column_name = 'updated_at'
    AND table_schema = 'public'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- Funcao para calcular temperatura do lead
CREATE OR REPLACE FUNCTION calculate_lead_temperature(score INTEGER)
RETURNS lead_temperature AS $$
BEGIN
  IF score >= 90 THEN RETURN 'muito_quente';
  ELSIF score >= 70 THEN RETURN 'quente';
  ELSIF score >= 40 THEN RETURN 'morno';
  ELSE RETURN 'frio';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para atualizar temperatura quando score muda
CREATE OR REPLACE FUNCTION update_lead_temperature()
RETURNS TRIGGER AS $$
BEGIN
  NEW.temperature = calculate_lead_temperature(NEW.score);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lead_temperature_trigger ON leads;
CREATE TRIGGER update_lead_temperature_trigger
BEFORE INSERT OR UPDATE OF score ON leads
FOR EACH ROW EXECUTE FUNCTION update_lead_temperature();

-- Funcao para calcular comissao
CREATE OR REPLACE FUNCTION calculate_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcula comissao total
  NEW.commission_value = (NEW.sale_price * NEW.commission_rate / 100);

  -- Garante que os percentuais somam 100%
  IF (NEW.ronald_split_percentage + NEW.adel_split_percentage) != 100.00 THEN
    NEW.adel_split_percentage = 100.00 - NEW.ronald_split_percentage;
  END IF;

  -- Calcula quanto cada um recebe
  NEW.ronald_commission_value = (NEW.commission_value * NEW.ronald_split_percentage / 100);
  NEW.adel_commission_value = (NEW.commission_value * NEW.adel_split_percentage / 100);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_commission_trigger ON sales;
CREATE TRIGGER calculate_commission_trigger
BEFORE INSERT OR UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION calculate_commission();

-- Funcao para registrar mudanca de status do lead
CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Registra atividade
    INSERT INTO lead_activities (lead_id, activity_type, description, metadata, performed_by)
    VALUES (
      NEW.id,
      'status_change',
      'Status alterado de ' || COALESCE(OLD.status::text, 'null') || ' para ' || COALESCE(NEW.status::text, 'null'),
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status),
      'sistema'
    );

    -- Registra evento do funil
    INSERT INTO funnel_events (lead_id, event_type, from_status, to_status)
    VALUES (NEW.id, 'status_change', OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_lead_status_change_trigger ON leads;
CREATE TRIGGER log_lead_status_change_trigger
AFTER UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION log_lead_status_change();

-- Funcao para atualizar contadores de mensagens
CREATE OR REPLACE FUNCTION update_conversation_counters()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    messages_count = messages_count + 1,
    user_messages_count = user_messages_count + CASE WHEN NEW.role = 'user' THEN 1 ELSE 0 END,
    assistant_messages_count = assistant_messages_count + CASE WHEN NEW.role = 'assistant' THEN 1 ELSE 0 END,
    tools_called = tools_called + CASE WHEN NEW.role = 'tool_call' THEN 1 ELSE 0 END
  WHERE id = NEW.conversation_id;

  -- Atualiza lead
  UPDATE leads
  SET
    messages_count = messages_count + 1,
    last_message_at = NEW.created_at
  WHERE id = NEW.lead_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversation_counters_trigger ON messages;
CREATE TRIGGER update_conversation_counters_trigger
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_counters();

-- Funcao para criar perfil do cliente automaticamente
CREATE OR REPLACE FUNCTION create_customer_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO customer_profiles (lead_id)
  VALUES (NEW.id)
  ON CONFLICT (lead_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_customer_profile_trigger ON leads;
CREATE TRIGGER create_customer_profile_trigger
AFTER INSERT ON leads
FOR EACH ROW EXECUTE FUNCTION create_customer_profile();

-- ============================================
-- PARTE 17: VIEWS PARA DASHBOARD
-- ============================================

-- Metricas gerais do dashboard
DROP VIEW IF EXISTS dashboard_metrics;
CREATE VIEW dashboard_metrics AS
SELECT
  -- Metricas de leads
  COUNT(DISTINCT l.id) AS total_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'novo' THEN l.id END) AS leads_novos,
  COUNT(DISTINCT CASE WHEN l.status = 'em_conversa' THEN l.id END) AS leads_em_conversa,
  COUNT(DISTINCT CASE WHEN l.status = 'qualificado' THEN l.id END) AS leads_qualificados,
  COUNT(DISTINCT CASE WHEN l.status = 'agendado' THEN l.id END) AS leads_agendados,
  COUNT(DISTINCT CASE WHEN l.temperature IN ('quente', 'muito_quente') THEN l.id END) AS leads_quentes,

  -- Metricas de agendamentos
  COUNT(DISTINCT a.id) AS total_agendamentos,
  COUNT(DISTINCT CASE WHEN a.status = 'confirmado' THEN a.id END) AS agendamentos_confirmados,
  COUNT(DISTINCT CASE WHEN a.status = 'compareceu' THEN a.id END) AS agendamentos_compareceram,
  COUNT(DISTINCT CASE WHEN a.status = 'faltou' THEN a.id END) AS agendamentos_faltaram,

  -- Metricas de vendas
  COUNT(DISTINCT s.id) AS total_vendas,
  COALESCE(SUM(s.sale_price), 0) AS receita_total,
  COALESCE(AVG(s.sale_price), 0) AS ticket_medio,

  -- Comissoes
  COALESCE(SUM(s.commission_value), 0) AS comissao_total,
  COALESCE(SUM(s.sale_price) - SUM(s.commission_value), 0) AS medeiros_recebe,
  COALESCE(SUM(s.ronald_commission_value), 0) AS ronald_comissao_total,
  COALESCE(SUM(s.adel_commission_value), 0) AS adel_comissao_total,

  -- Taxas de conversao
  CASE
    WHEN COUNT(DISTINCT l.id) > 0
    THEN ROUND(COUNT(DISTINCT s.id)::DECIMAL / COUNT(DISTINCT l.id) * 100, 2)
    ELSE 0
  END AS taxa_conversao,

  CASE
    WHEN COUNT(DISTINCT CASE WHEN a.status = 'confirmado' THEN a.id END) > 0
    THEN ROUND(
      COUNT(DISTINCT CASE WHEN a.status = 'compareceu' THEN a.id END)::DECIMAL /
      COUNT(DISTINCT CASE WHEN a.status IN ('confirmado', 'compareceu', 'faltou') THEN a.id END) * 100, 2
    )
    ELSE 0
  END AS taxa_comparecimento

FROM leads l
LEFT JOIN appointments a ON l.id = a.lead_id
LEFT JOIN sales s ON l.id = s.lead_id;

-- Funil de vendas
DROP VIEW IF EXISTS sales_funnel;
CREATE VIEW sales_funnel AS
SELECT
  status,
  COUNT(*) AS count,
  ROUND(AVG(score), 1) AS avg_score,
  ROUND(AVG(conversion_probability), 1) AS avg_conversion_prob
FROM leads
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY status
ORDER BY
  CASE status
    WHEN 'novo' THEN 1
    WHEN 'em_conversa' THEN 2
    WHEN 'qualificado' THEN 3
    WHEN 'agendado' THEN 4
    WHEN 'visitou' THEN 5
    WHEN 'negociando' THEN 6
    WHEN 'proposta' THEN 7
    WHEN 'fechado' THEN 8
    WHEN 'perdido' THEN 9
    WHEN 'reengajar' THEN 10
    ELSE 11
  END;

-- Agendamentos do dia
DROP VIEW IF EXISTS todays_appointments;
CREATE VIEW todays_appointments AS
SELECT
  a.*,
  l.name AS customer_name,
  l.whatsapp AS customer_phone,
  l.score AS lead_score,
  l.temperature AS lead_temperature,
  v.name AS vehicle_name,
  v.price AS vehicle_price
FROM appointments a
JOIN leads l ON a.lead_id = l.id
LEFT JOIN vehicles v ON a.vehicle_id = v.id
WHERE a.scheduled_date = CURRENT_DATE
  AND a.status IN ('pendente', 'confirmado', 'lembrete_enviado')
ORDER BY a.scheduled_time;

-- Leads quentes para follow-up
DROP VIEW IF EXISTS hot_leads;
CREATE VIEW hot_leads AS
SELECT
  l.*,
  cp.persona,
  cp.emotional_triggers,
  cp.pain_points,
  cs.summary AS last_conversation_summary
FROM leads l
LEFT JOIN customer_profiles cp ON l.id = cp.lead_id
LEFT JOIN LATERAL (
  SELECT summary
  FROM conversation_summaries
  WHERE lead_id = l.id
  ORDER BY created_at DESC
  LIMIT 1
) cs ON true
WHERE l.temperature IN ('quente', 'muito_quente')
  AND l.status NOT IN ('fechado', 'perdido')
ORDER BY l.score DESC, l.last_message_at DESC;

-- Performance dos veiculos
DROP VIEW IF EXISTS vehicle_performance;
CREATE VIEW vehicle_performance AS
SELECT
  v.id,
  v.name,
  v.brand,
  v.price,
  v.status,
  v.views_count,
  v.inquiries_count,
  COUNT(DISTINCT l.id) AS interested_leads,
  COUNT(DISTINCT s.id) AS times_sold,
  AVG(s.sale_price) AS avg_sale_price,
  AVG(s.days_to_close) AS avg_days_to_close
FROM vehicles v
LEFT JOIN leads l ON v.id = ANY(l.interested_vehicles)
LEFT JOIN sales s ON v.id = s.vehicle_id
GROUP BY v.id, v.name, v.brand, v.price, v.status, v.views_count, v.inquiries_count
ORDER BY v.inquiries_count DESC;

-- ============================================
-- PARTE 18: POLITICAS DE SEGURANCA (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Politicas permissivas (ajustar conforme necessidade de autenticacao)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    VALUES ('vehicles'), ('leads'), ('conversations'), ('messages'),
           ('customer_profiles'), ('conversation_summaries'), ('appointments'),
           ('sales'), ('lead_activities'), ('funnel_events'), ('ai_insights'),
           ('message_templates'), ('system_config')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Enable all access" ON %I', t);
    EXECUTE format('CREATE POLICY "Enable all access" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ============================================
-- PARTE 19: DADOS INICIAIS
-- ============================================

-- Inserir veiculos do inventario
INSERT INTO vehicles (name, brand, model, year_fabrication, year_model, price, km, fuel_type, transmission, vehicle_type, features, description, selling_points, target_audience, status) VALUES
  ('VW Spacefox 2015', 'Volkswagen', 'Spacefox', 2015, 2015, 31000, 95000, 'Flex', 'Manual', 'Hatch', ARRAY['Completo', 'Ar condicionado', 'Direcao hidraulica'], 'Perua compacta espaçosa', 'Espaco interno impressionante, porta-malas gigante, economico', 'Familias pequenas, quem precisa de espaco', 'available'),
  ('Kawasaki Ninja 300 2020', 'Kawasaki', 'Ninja 300', 2020, 2020, 32000, 15000, 'Gasolina', 'Manual', 'Moto', ARRAY['Esportiva', 'ABS', 'Injecao eletronica'], 'Moto esportiva entrada', 'Design agressivo, performance otima para iniciantes, economica', 'Jovens, primeiro veiculo, esportistas', 'available'),
  ('Fiat Mobi Like 2022', 'Fiat', 'Mobi Like', 2022, 2022, 39000, 28000, 'Flex', 'Manual', 'Hatch', ARRAY['Direcao eletrica', 'Vidros eletricos', 'Ar condicionado'], 'Compacto economico, ideal cidade', 'Mais economico do mercado, facil de estacionar, baixa manutencao', 'Primeiro carro, cidade grande, economia', 'available'),
  ('Suzuki Vitara 2018', 'Suzuki', 'Vitara', 2018, 2018, 48000, 65000, 'Gasolina', 'Automatico', 'SUV', ARRAY['4x2', 'Ar condicionado', 'Multimidia'], 'SUV compacto, ótimo para família', 'Espaco interno otimo, baixo consumo para SUV, confiavel', 'Familias medias, quem quer SUV acessivel', 'available'),
  ('Fiat Argo Drive 2021', 'Fiat', 'Argo Drive', 2021, 2021, 63000, 35000, 'Flex', 'Manual', 'Hatch', ARRAY['Completo', 'Multimidia', '6 airbags'], 'Hatch moderno e espaçoso', 'Design moderno, otima dirigibilidade, completo de serie', 'Jovens profissionais, casais sem filhos', 'available'),
  ('Toyota Corolla GLI 2019', 'Toyota', 'Corolla GLI', 2019, 2019, 91000, 55000, 'Flex', 'Automatico', 'Sedan', ARRAY['Couro', 'Automatico', 'Central multimidia', 'Camera de re'], 'Sedan premium, conforto total', 'Referencia em durabilidade, conforto premium, valor de revenda', 'Executivos, familias que valorizam conforto', 'available'),
  ('Mitsubishi L200 Triton 2020', 'Mitsubishi', 'L200 Triton', 2020, 2020, 95000, 72000, 'Flex', 'Manual', 'Picape', ARRAY['4x4', 'FLEX', 'Cacamba grande'], 'UNICO FLEX no estoque - Picape robusta', 'UNICA FLEX, versatilidade cidade/campo, potencia excepcional', 'Produtores rurais, aventureiros, quem precisa de tracao', 'available'),
  ('Mitsubishi Pajero Sport 2019', 'Mitsubishi', 'Pajero Sport', 2019, 2019, 95000, 68000, 'Diesel', 'Automatico', 'SUV', ARRAY['4x4', '7 lugares', 'Couro', 'Teto solar'], 'SUV 7 lugares, ideal família grande', 'Espaco para toda familia, robustez off-road, status', 'Familias grandes, aventureiros de fim de semana', 'available'),
  ('Chevrolet Tracker LTZ 2022', 'Chevrolet', 'Tracker LTZ', 2022, 2022, 99000, 32000, 'Turbo Flex', 'Automatico', 'SUV', ARRAY['Turbo', 'Completo', 'OnStar'], 'SUV moderno turbo', 'Motor turbo economico, tecnologia embarcada, garantia', 'Jovens executivos, quem valoriza tecnologia', 'available'),
  ('Honda HR-V EX 2021', 'Honda', 'HR-V EX', 2021, 2021, 105000, 45000, 'Flex', 'Automatico', 'SUV', ARRAY['6 airbags', 'Automatico', 'Central multimidia'], 'SUV espaçosa premium', 'Espaco interno referencia, confiabilidade Honda, revenda', 'Familias, quem valoriza qualidade', 'available'),
  ('Nissan Kicks SL 2022', 'Nissan', 'Kicks SL', 2022, 2022, 115000, 28000, 'Flex', 'Automatico', 'SUV', ARRAY['Teto solar', 'Couro', 'Around View'], 'SUV top de linha', 'Tecnologia camera 360, acabamento premium, conforto', 'Executivos, quem quer top de linha', 'available'),
  ('Toyota Hilux SR 2021', 'Toyota', 'Hilux SR', 2021, 2021, 115000, 52000, 'Diesel', 'Automatico', 'Picape', ARRAY['4x4', 'Diesel', 'Automatica'], 'Picape referencia - cor PRATA', 'Indestrutivel, valor de revenda, status', 'Produtores rurais, aventureiros, status', 'available'),
  ('Ford Ranger XLT 2020', 'Ford', 'Ranger XLT', 2020, 2020, 115000, 58000, 'Diesel', 'Automatico', 'Picape', ARRAY['4x4', 'Diesel', 'Cacamba maritima'], 'Picape robusta e espaçosa', 'Conforto de passeio, capacidade de carga, potencia', 'Quem precisa de trabalho e conforto', 'available')
ON CONFLICT DO NOTHING;

-- ============================================
-- FIM DO SCHEMA
-- ============================================

-- Mensagem de confirmacao
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MEDEIROS VEICULOS - CAMILA 2.0';
  RAISE NOTICE 'Schema criado com sucesso!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tabelas criadas:';
  RAISE NOTICE '  - vehicles (13 veiculos inseridos)';
  RAISE NOTICE '  - leads';
  RAISE NOTICE '  - conversations';
  RAISE NOTICE '  - messages';
  RAISE NOTICE '  - customer_profiles';
  RAISE NOTICE '  - conversation_summaries';
  RAISE NOTICE '  - appointments';
  RAISE NOTICE '  - sales';
  RAISE NOTICE '  - lead_activities';
  RAISE NOTICE '  - funnel_events';
  RAISE NOTICE '  - ai_insights';
  RAISE NOTICE '  - message_templates';
  RAISE NOTICE '  - system_config';
  RAISE NOTICE '============================================';
END $$;
