-- ============================================
-- MIGRATION 004: Sistema de Métricas de Qualificação
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- Este sistema rastreia TODOS os agendamentos (bloqueados, aprovados, alertas)
-- para medir a eficácia do sistema de qualificação da Camila
-- ============================================

-- Tabela de métricas de qualificação
CREATE TABLE IF NOT EXISTS qualification_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Tipo da métrica
  metric_type VARCHAR(50) NOT NULL, -- 'blocked', 'approved', 'warning'

  -- Dados do interesse
  vehicle_interest TEXT,
  detected_intent VARCHAR(50), -- 'picape_aberta', 'suv_fechado', 'hilux_ambiguo', 'indefinido'

  -- Motivo do bloqueio (se aplicável)
  block_reason VARCHAR(100), -- 'hilux_sw4_nao_e_picape', 'veiculo_nao_definido', etc

  -- Dados do cliente
  customer_phone VARCHAR(20),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Índices para consultas
  CONSTRAINT valid_metric_type CHECK (metric_type IN ('blocked', 'approved', 'warning'))
);

-- Índices para performance em consultas de métricas
CREATE INDEX IF NOT EXISTS idx_qualification_metrics_type ON qualification_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_qualification_metrics_created ON qualification_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_qualification_metrics_block_reason ON qualification_metrics(block_reason);

-- ============================================
-- VIEWS PARA DASHBOARD DE MÉTRICAS
-- ============================================

-- View: Resumo diário de qualificação
CREATE OR REPLACE VIEW qualification_daily_summary AS
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE metric_type = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE metric_type = 'blocked') as blocked_count,
  COUNT(*) FILTER (WHERE metric_type = 'warning') as warning_count,
  COUNT(*) as total_count,
  ROUND(
    COUNT(*) FILTER (WHERE metric_type = 'approved')::numeric /
    NULLIF(COUNT(*), 0) * 100, 2
  ) as approval_rate
FROM qualification_metrics
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View: Motivos de bloqueio mais comuns
CREATE OR REPLACE VIEW qualification_block_reasons AS
SELECT
  block_reason,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM qualification_metrics
WHERE metric_type = 'blocked' AND block_reason IS NOT NULL
GROUP BY block_reason
ORDER BY count DESC;

-- View: Intenções detectadas
CREATE OR REPLACE VIEW qualification_intents AS
SELECT
  detected_intent,
  metric_type,
  COUNT(*) as count
FROM qualification_metrics
WHERE detected_intent IS NOT NULL
GROUP BY detected_intent, metric_type
ORDER BY count DESC;

-- ============================================
-- FUNÇÃO PARA RELATÓRIO DE QUALIFICAÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION get_qualification_report(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  total_attempts BIGINT,
  approved BIGINT,
  blocked BIGINT,
  warnings BIGINT,
  approval_rate NUMERIC,
  most_common_block_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_attempts,
    COUNT(*) FILTER (WHERE metric_type = 'approved')::BIGINT as approved,
    COUNT(*) FILTER (WHERE metric_type = 'blocked')::BIGINT as blocked,
    COUNT(*) FILTER (WHERE metric_type = 'warning')::BIGINT as warnings,
    ROUND(
      COUNT(*) FILTER (WHERE metric_type = 'approved')::numeric /
      NULLIF(COUNT(*), 0) * 100, 2
    ) as approval_rate,
    (
      SELECT block_reason
      FROM qualification_metrics
      WHERE metric_type = 'blocked' AND block_reason IS NOT NULL
        AND created_at >= NOW() - (days_back || ' days')::INTERVAL
      GROUP BY block_reason
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as most_common_block_reason
  FROM qualification_metrics
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PERMISSÕES
-- ============================================
ALTER TABLE qualification_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on qualification_metrics" ON qualification_metrics
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON TABLE qualification_metrics IS 'Rastreia métricas do sistema de qualificação de leads da Camila';
COMMENT ON VIEW qualification_daily_summary IS 'Resumo diário de aprovações, bloqueios e alertas';
COMMENT ON VIEW qualification_block_reasons IS 'Motivos mais comuns de bloqueio de agendamentos';
COMMENT ON FUNCTION get_qualification_report IS 'Gera relatório de qualificação dos últimos N dias';
