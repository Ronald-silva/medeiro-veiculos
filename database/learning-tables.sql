-- =============================================
-- SISTEMA DE APRENDIZADO DA CAMILA
-- Execute CADA BLOCO SEPARADAMENTE no SQL Editor
-- =============================================

-- =============================================
-- BLOCO 1: Habilitar extensão pgvector (para embeddings)
-- =============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================
-- BLOCO 2: Criar/Atualizar tabela successful_conversations
-- (Compatível com embeddings.js)
-- =============================================
CREATE TABLE IF NOT EXISTS successful_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID,
  conversation_summary TEXT,
  customer_segment TEXT,
  vehicle_type TEXT,
  budget_range TEXT,
  winning_strategy TEXT,
  messages_sample JSONB,
  embedding VECTOR(1536),
  conversion_type TEXT NOT NULL,
  conversion_value DECIMAL,
  total_messages INT,
  conversation_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BLOCO 3: Criar índices
-- =============================================
CREATE INDEX IF NOT EXISTS idx_sc_segment ON successful_conversations(customer_segment);
CREATE INDEX IF NOT EXISTS idx_sc_vehicle ON successful_conversations(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_sc_budget ON successful_conversations(budget_range);
CREATE INDEX IF NOT EXISTS idx_sc_strategy ON successful_conversations(winning_strategy);
CREATE INDEX IF NOT EXISTS idx_sc_conversion ON successful_conversations(conversion_type);

-- Índice para busca vetorial (HNSW é mais rápido)
CREATE INDEX IF NOT EXISTS idx_sc_embedding ON successful_conversations
  USING hnsw (embedding vector_cosine_ops);

-- =============================================
-- BLOCO 4: Criar função RPC para busca por similaridade
-- Primeiro DROP para permitir mudança de return type
-- =============================================
DROP FUNCTION IF EXISTS find_similar_successful_conversations(VECTOR, TEXT, TEXT, TEXT, INT);

CREATE OR REPLACE FUNCTION find_similar_successful_conversations(
  query_embedding VECTOR(1536),
  p_customer_segment TEXT DEFAULT NULL,
  p_vehicle_type TEXT DEFAULT NULL,
  p_budget_range TEXT DEFAULT NULL,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  conversation_summary TEXT,
  customer_segment TEXT,
  vehicle_type TEXT,
  budget_range TEXT,
  winning_strategy TEXT,
  messages_sample JSONB,
  conversion_type TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.conversation_summary,
    sc.customer_segment,
    sc.vehicle_type,
    sc.budget_range,
    sc.winning_strategy,
    sc.messages_sample,
    sc.conversion_type,
    1 - (sc.embedding <=> query_embedding) as similarity
  FROM successful_conversations sc
  WHERE
    sc.embedding IS NOT NULL
    AND (p_customer_segment IS NULL OR sc.customer_segment = p_customer_segment)
    AND (p_vehicle_type IS NULL OR sc.vehicle_type = p_vehicle_type)
    AND (p_budget_range IS NULL OR sc.budget_range = p_budget_range)
  ORDER BY sc.embedding <=> query_embedding
  LIMIT p_limit;
END;
$$;

-- =============================================
-- BLOCO 5: Tabela de estratégias (opcional, para tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS response_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID,
  conversation_id UUID,
  strategy_type TEXT NOT NULL,
  vehicle_suggested TEXT,
  cta_type TEXT,
  customer_segment TEXT,
  objection_handled TEXT,
  outcome TEXT,
  outcome_measured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rs_strategy ON response_strategies(strategy_type);
CREATE INDEX IF NOT EXISTS idx_rs_outcome ON response_strategies(outcome);

-- =============================================
-- BLOCO 6: View de métricas (opcional)
-- =============================================
CREATE OR REPLACE VIEW learning_metrics AS
SELECT
  winning_strategy as strategy,
  COUNT(*) as total_conversions,
  COUNT(CASE WHEN conversion_type = 'sale' THEN 1 END) as sales,
  COUNT(CASE WHEN conversion_type = 'appointment' THEN 1 END) as appointments,
  AVG(total_messages) as avg_messages
FROM successful_conversations
GROUP BY winning_strategy
ORDER BY total_conversions DESC;

-- =============================================
-- BLOCO 7: Tabela de logs de supervisão
-- =============================================
CREATE TABLE IF NOT EXISTS supervision_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT,
  response_text TEXT,
  is_valid BOOLEAN DEFAULT true,
  errors JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sl_conversation ON supervision_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sl_valid ON supervision_logs(is_valid);
CREATE INDEX IF NOT EXISTS idx_sl_created ON supervision_logs(created_at DESC);

-- View de métricas de supervisão
CREATE OR REPLACE VIEW supervision_metrics AS
SELECT
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as total_responses,
  COUNT(CASE WHEN is_valid THEN 1 END) as valid_responses,
  COUNT(CASE WHEN NOT is_valid THEN 1 END) as invalid_responses,
  ROUND(100.0 * COUNT(CASE WHEN is_valid THEN 1 END) / NULLIF(COUNT(*), 0), 1) as accuracy_percent
FROM supervision_logs
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;
