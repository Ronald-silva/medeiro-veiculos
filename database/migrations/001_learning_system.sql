-- ============================================
-- MEDEIROS VEICULOS - SISTEMA DE APRENDIZADO
-- Migration: 001_learning_system
-- Data: 2026-01-29
-- Objetivo: Tabelas para Few-Shot Learning + Outcome Tracking
-- ============================================

-- ============================================
-- PARTE 1: EXTENSAO PGVECTOR
-- ============================================

-- Habilita busca vetorial para embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- PARTE 2: TABELA DE CONVERSAS BEM-SUCEDIDAS
-- ============================================

-- Armazena conversas que resultaram em conversão
-- Usadas como exemplos para Few-Shot Learning
CREATE TABLE IF NOT EXISTS successful_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Referência ao lead
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Resumo da conversa para contexto rápido
  conversation_summary TEXT NOT NULL,

  -- Segmentação para busca contextual
  customer_segment TEXT,           -- decisor_rapido, analitico, emocional, economico
  vehicle_type TEXT,               -- SUV, sedan, pickup, hatch
  budget_range TEXT,               -- ate_50k, 50k_100k, 100k_150k, acima_150k

  -- Estratégia vencedora identificada
  winning_strategy TEXT,           -- emphasis_affordability, highlight_features, urgency, etc

  -- Amostra de mensagens-chave (3-5 trocas importantes)
  messages_sample JSONB NOT NULL,

  -- Embedding para busca semântica (1536 dimensões do Claude)
  embedding vector(1536),

  -- Tipo de conversão alcançada
  conversion_type TEXT NOT NULL,   -- sale, appointment, qualified_lead

  -- Valor da conversão (se venda)
  conversion_value DECIMAL(12,2),

  -- Métricas da conversa
  total_messages INTEGER,
  time_to_conversion INTERVAL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  conversation_date TIMESTAMPTZ
);

-- Índice para busca vetorial eficiente
CREATE INDEX IF NOT EXISTS idx_successful_conversations_embedding
ON successful_conversations
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Índices para filtros comuns
CREATE INDEX IF NOT EXISTS idx_successful_conversations_segment
ON successful_conversations(customer_segment);

CREATE INDEX IF NOT EXISTS idx_successful_conversations_vehicle
ON successful_conversations(vehicle_type);

CREATE INDEX IF NOT EXISTS idx_successful_conversations_budget
ON successful_conversations(budget_range);

CREATE INDEX IF NOT EXISTS idx_successful_conversations_type
ON successful_conversations(conversion_type);

-- ============================================
-- PARTE 3: TABELA DE ESTRATÉGIAS DE RESPOSTA
-- ============================================

-- Rastreia qual estratégia foi usada em cada resposta
-- Para análise de outcome-based learning
CREATE TABLE IF NOT EXISTS response_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Referências
  message_id UUID,                 -- ID da mensagem no sistema
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  conversation_id UUID,            -- ID da conversa

  -- Estratégia utilizada
  strategy_used TEXT NOT NULL,     -- emphasis_affordability, urgency, rapport, etc

  -- Contexto da resposta
  vehicle_suggested TEXT,          -- Veículo mencionado na resposta
  cta_type TEXT,                   -- schedule_visit, request_info, send_proposal
  customer_segment TEXT,           -- Segmento do cliente no momento
  lead_temperature TEXT,           -- frio, morno, quente, muito_quente

  -- Conteúdo (para análise)
  response_preview TEXT,           -- Primeiros 200 chars da resposta

  -- Resultado (preenchido após 24-48h)
  outcome TEXT,                    -- converted, advanced, neutral, lost, unknown
  outcome_details TEXT,            -- Detalhes adicionais
  outcome_measured_at TIMESTAMPTZ,

  -- Métricas de engajamento imediato
  client_responded BOOLEAN DEFAULT FALSE,
  response_time_seconds INTEGER,
  sentiment_after TEXT,            -- positive, neutral, negative

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para análise
CREATE INDEX IF NOT EXISTS idx_response_strategies_lead
ON response_strategies(lead_id);

CREATE INDEX IF NOT EXISTS idx_response_strategies_strategy
ON response_strategies(strategy_used);

CREATE INDEX IF NOT EXISTS idx_response_strategies_outcome
ON response_strategies(outcome);

CREATE INDEX IF NOT EXISTS idx_response_strategies_created
ON response_strategies(created_at);

-- ============================================
-- PARTE 4: VIEW PARA ANÁLISE DE ESTRATÉGIAS
-- ============================================

CREATE OR REPLACE VIEW strategy_performance AS
SELECT
  strategy_used,
  customer_segment,
  COUNT(*) as total_uses,
  COUNT(CASE WHEN outcome = 'converted' THEN 1 END) as conversions,
  COUNT(CASE WHEN outcome = 'advanced' THEN 1 END) as advances,
  COUNT(CASE WHEN outcome = 'lost' THEN 1 END) as losses,
  ROUND(
    COUNT(CASE WHEN outcome = 'converted' THEN 1 END)::DECIMAL /
    NULLIF(COUNT(CASE WHEN outcome IS NOT NULL THEN 1 END), 0) * 100,
    2
  ) as conversion_rate,
  ROUND(
    (COUNT(CASE WHEN outcome = 'converted' THEN 1 END) +
     COUNT(CASE WHEN outcome = 'advanced' THEN 1 END))::DECIMAL /
    NULLIF(COUNT(CASE WHEN outcome IS NOT NULL THEN 1 END), 0) * 100,
    2
  ) as success_rate
FROM response_strategies
WHERE outcome IS NOT NULL
GROUP BY strategy_used, customer_segment
ORDER BY success_rate DESC;

-- ============================================
-- PARTE 5: FUNÇÃO PARA BUSCAR EXEMPLOS SIMILARES
-- ============================================

-- Busca conversas bem-sucedidas similares usando embeddings
CREATE OR REPLACE FUNCTION find_similar_successful_conversations(
  query_embedding vector(1536),
  p_customer_segment TEXT DEFAULT NULL,
  p_vehicle_type TEXT DEFAULT NULL,
  p_budget_range TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  conversation_summary TEXT,
  messages_sample JSONB,
  winning_strategy TEXT,
  conversion_type TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.conversation_summary,
    sc.messages_sample,
    sc.winning_strategy,
    sc.conversion_type,
    1 - (sc.embedding <=> query_embedding) as similarity
  FROM successful_conversations sc
  WHERE
    (p_customer_segment IS NULL OR sc.customer_segment = p_customer_segment)
    AND (p_vehicle_type IS NULL OR sc.vehicle_type = p_vehicle_type)
    AND (p_budget_range IS NULL OR sc.budget_range = p_budget_range)
    AND sc.embedding IS NOT NULL
  ORDER BY sc.embedding <=> query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTE 6: FUNÇÃO PARA REGISTRAR SUCESSO
-- ============================================

-- Adiciona uma conversa bem-sucedida à base de aprendizado
CREATE OR REPLACE FUNCTION record_successful_conversation(
  p_lead_id UUID,
  p_summary TEXT,
  p_segment TEXT,
  p_vehicle_type TEXT,
  p_budget_range TEXT,
  p_strategy TEXT,
  p_messages JSONB,
  p_embedding vector(1536),
  p_conversion_type TEXT,
  p_conversion_value DECIMAL DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO successful_conversations (
    lead_id,
    conversation_summary,
    customer_segment,
    vehicle_type,
    budget_range,
    winning_strategy,
    messages_sample,
    embedding,
    conversion_type,
    conversion_value,
    conversation_date
  ) VALUES (
    p_lead_id,
    p_summary,
    p_segment,
    p_vehicle_type,
    p_budget_range,
    p_strategy,
    p_messages,
    p_embedding,
    p_conversion_type,
    p_conversion_value,
    NOW()
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMENTÁRIOS DAS TABELAS
-- ============================================

COMMENT ON TABLE successful_conversations IS 'Armazena conversas que resultaram em conversão para uso em Few-Shot Learning';
COMMENT ON TABLE response_strategies IS 'Rastreia estratégias usadas em cada resposta para análise de performance';
COMMENT ON VIEW strategy_performance IS 'Análise agregada de performance por estratégia e segmento';
