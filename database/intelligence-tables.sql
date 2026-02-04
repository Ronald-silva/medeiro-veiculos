-- =====================================================
-- TABELAS DE INTELIGÊNCIA PREDITIVA
-- Sistema de Behavioral Intelligence + Predictive Intent
-- =====================================================

-- 1. Fingerprints Comportamentais
-- Armazena padrões de comportamento de cada sessão
CREATE TABLE IF NOT EXISTS behavioral_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id),
  intent_score INTEGER DEFAULT 0,
  pattern TEXT, -- 'researcher_to_buyer', 'urgent_buyer', 'comparison_shopper', etc
  confidence DECIMAL(3,2) DEFAULT 0,
  metrics JSONB DEFAULT '{}',
  signals JSONB DEFAULT '{}',
  is_hot_lead BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fingerprints_session ON behavioral_fingerprints(session_id);
CREATE INDEX IF NOT EXISTS idx_fingerprints_hot ON behavioral_fingerprints(is_hot_lead) WHERE is_hot_lead = true;
CREATE INDEX IF NOT EXISTS idx_fingerprints_score ON behavioral_fingerprints(intent_score DESC);

-- 2. Predições de Intenção
-- Histórico de predições para calibrar o modelo
CREATE TABLE IF NOT EXISTS intent_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predicted_score INTEGER NOT NULL,
  predicted_class TEXT NOT NULL, -- 'hot', 'warm', 'cold'
  confidence DECIMAL(3,2),
  signals JSONB DEFAULT '[]',
  actual_outcome TEXT, -- 'converted', 'scheduled', 'lost', 'nurturing', NULL
  conversation_id TEXT,
  lead_id UUID REFERENCES leads(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_outcome ON intent_predictions(actual_outcome);
CREATE INDEX IF NOT EXISTS idx_predictions_class ON intent_predictions(predicted_class);

-- 3. Log de Triggers Proativos
-- Registra quando Camila inicia conversa proativamente
CREATE TABLE IF NOT EXISTS proactive_triggers_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id TEXT NOT NULL,
  trigger_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  message_sent TEXT,
  outcome TEXT DEFAULT 'pending', -- 'engaged', 'ignored', 'converted'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triggers_outcome ON proactive_triggers_log(outcome);
CREATE INDEX IF NOT EXISTS idx_triggers_session ON proactive_triggers_log(session_id);

-- 4. Conversas de Sucesso (Few-Shot Learning)
-- Armazena conversas que converteram para aprendizado
CREATE TABLE IF NOT EXISTS successful_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT,
  lead_id UUID REFERENCES leads(id),
  conversation_summary TEXT,
  customer_segment TEXT, -- 'familia', 'trabalho', 'jovem_primeiro_carro', etc
  vehicle_type TEXT, -- 'suv', 'sedan', 'hatch', 'picape', etc
  budget_range TEXT, -- 'ate_50k', '50k_80k', '80k_120k', '120k_200k', 'acima_200k'
  winning_strategy TEXT, -- estratégia que funcionou
  conversion_type TEXT NOT NULL, -- 'sale', 'appointment', 'qualified', 'hot_lead'
  total_messages INTEGER DEFAULT 0,
  messages_sample JSONB DEFAULT '[]', -- amostra das mensagens-chave
  notes TEXT,
  embedding VECTOR(1536), -- para busca semântica futura
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_success_segment ON successful_conversations(customer_segment);
CREATE INDEX IF NOT EXISTS idx_success_vehicle ON successful_conversations(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_success_budget ON successful_conversations(budget_range);
CREATE INDEX IF NOT EXISTS idx_success_type ON successful_conversations(conversion_type);

-- 5. Métricas de Performance do Modelo
-- Para monitoramento e calibração
CREATE TABLE IF NOT EXISTS model_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0,
  hot_lead_precision DECIMAL(5,2) DEFAULT 0,
  avg_intent_score DECIMAL(5,2) DEFAULT 0,
  triggers_fired INTEGER DEFAULT 0,
  triggers_engaged INTEGER DEFAULT 0,
  trigger_engagement_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_date ON model_performance(metric_date);

-- =====================================================
-- FUNÇÕES E VIEWS
-- =====================================================

-- View: Dashboard de Inteligência
CREATE OR REPLACE VIEW intelligence_dashboard AS
SELECT
  (SELECT COUNT(*) FROM behavioral_fingerprints WHERE created_at > NOW() - INTERVAL '24 hours') as fingerprints_24h,
  (SELECT COUNT(*) FROM behavioral_fingerprints WHERE is_hot_lead = true AND created_at > NOW() - INTERVAL '24 hours') as hot_leads_24h,
  (SELECT AVG(intent_score) FROM behavioral_fingerprints WHERE created_at > NOW() - INTERVAL '24 hours') as avg_intent_score_24h,
  (SELECT COUNT(*) FROM intent_predictions WHERE actual_outcome IN ('converted', 'scheduled') AND created_at > NOW() - INTERVAL '7 days') as conversions_7d,
  (SELECT COUNT(*) FROM proactive_triggers_log WHERE outcome = 'engaged' AND created_at > NOW() - INTERVAL '7 days') as triggers_engaged_7d,
  (SELECT COUNT(*) FROM successful_conversations) as total_learning_examples;

-- Função: Calcula precisão do modelo
CREATE OR REPLACE FUNCTION calculate_model_accuracy()
RETURNS TABLE(
  total_predictions BIGINT,
  correct_predictions BIGINT,
  accuracy_percentage DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH predictions AS (
    SELECT
      predicted_class,
      actual_outcome,
      CASE
        WHEN predicted_class = 'hot' AND actual_outcome IN ('converted', 'scheduled') THEN true
        WHEN predicted_class = 'warm' AND actual_outcome IN ('qualified', 'nurturing') THEN true
        WHEN predicted_class = 'cold' AND actual_outcome = 'lost' THEN true
        ELSE false
      END as is_correct
    FROM intent_predictions
    WHERE actual_outcome IS NOT NULL
  )
  SELECT
    COUNT(*)::BIGINT as total_predictions,
    SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::BIGINT as correct_predictions,
    ROUND(
      (SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as accuracy_percentage
  FROM predictions;
END;
$$ LANGUAGE plpgsql;

-- Função: Busca conversas similares para Few-Shot Learning
CREATE OR REPLACE FUNCTION find_learning_examples(
  p_segment TEXT DEFAULT NULL,
  p_vehicle_type TEXT DEFAULT NULL,
  p_budget_range TEXT DEFAULT NULL,
  p_limit INT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  conversation_summary TEXT,
  customer_segment TEXT,
  vehicle_type TEXT,
  budget_range TEXT,
  winning_strategy TEXT,
  conversion_type TEXT,
  messages_sample JSONB,
  relevance_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.conversation_summary,
    sc.customer_segment,
    sc.vehicle_type,
    sc.budget_range,
    sc.winning_strategy,
    sc.conversion_type,
    sc.messages_sample,
    (
      CASE WHEN sc.customer_segment = p_segment THEN 0.3 ELSE 0 END +
      CASE WHEN sc.vehicle_type = p_vehicle_type THEN 0.25 ELSE 0 END +
      CASE WHEN sc.budget_range = p_budget_range THEN 0.25 ELSE 0 END +
      CASE WHEN sc.created_at > NOW() - INTERVAL '7 days' THEN 0.1 ELSE 0 END +
      CASE WHEN sc.conversion_type = 'sale' THEN 0.2 WHEN sc.conversion_type = 'appointment' THEN 0.15 ELSE 0.05 END
    )::DECIMAL as relevance_score
  FROM successful_conversations sc
  WHERE
    (p_segment IS NULL OR sc.customer_segment = p_segment OR sc.customer_segment IS NULL) AND
    (p_vehicle_type IS NULL OR sc.vehicle_type = p_vehicle_type OR sc.vehicle_type IS NULL) AND
    (p_budget_range IS NULL OR sc.budget_range = p_budget_range OR sc.budget_range IS NULL)
  ORDER BY relevance_score DESC, sc.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilita RLS nas tabelas
ALTER TABLE behavioral_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proactive_triggers_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE successful_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_performance ENABLE ROW LEVEL SECURITY;

-- Política: Leitura pública (para o sistema)
CREATE POLICY "Allow public read" ON behavioral_fingerprints FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON behavioral_fingerprints FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read" ON intent_predictions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON intent_predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON intent_predictions FOR UPDATE USING (true);

CREATE POLICY "Allow public read" ON proactive_triggers_log FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON proactive_triggers_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON proactive_triggers_log FOR UPDATE USING (true);

CREATE POLICY "Allow public read" ON successful_conversations FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON successful_conversations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read" ON model_performance FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON model_performance FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON model_performance FOR UPDATE USING (true);

-- =====================================================
-- DADOS INICIAIS (Exemplos para Few-Shot Learning)
-- =====================================================

-- Insere exemplos de conversas bem-sucedidas para o sistema começar a aprender
INSERT INTO successful_conversations (
  conversation_summary,
  customer_segment,
  vehicle_type,
  budget_range,
  winning_strategy,
  conversion_type,
  total_messages,
  messages_sample
) VALUES
(
  'Cliente família buscando SUV, agendou visita em 8 mensagens',
  'familia',
  'suv',
  '80k_120k',
  'foco_em_familia',
  'appointment',
  8,
  '[{"role":"user","content":"Boa tarde, estou procurando um carro para minha família"},{"role":"assistant","content":"Boa tarde! Que legal que está buscando um carro para a família! Quantas pessoas vão usar o carro no dia a dia?"},{"role":"user","content":"Somos 4, eu, minha esposa e 2 filhos"},{"role":"assistant","content":"Perfeito! Para uma família de 4, recomendo um SUV pelo espaço e conforto. Temos o Creta e o Tracker que são ótimas opções. Qual seu orçamento aproximado?"},{"role":"user","content":"Uns 100 mil mais ou menos"},{"role":"assistant","content":"Excelente! Temos um Hyundai Creta 2022 por R$ 98.900 que é perfeito para família - espaçoso, econômico e muito seguro. Quer agendar uma visita para conhecer?"},{"role":"user","content":"Pode ser amanhã?"}]'
),
(
  'Jovem primeiro carro, fechou financiamento em 12 mensagens',
  'jovem_primeiro_carro',
  'hatch',
  'ate_50k',
  'financiamento_facilitado',
  'sale',
  12,
  '[{"role":"user","content":"oi, to procurando meu primeiro carro"},{"role":"assistant","content":"Oi! Que momento especial! O primeiro carro é sempre inesquecível. Me conta, você está pensando em algo mais econômico para o dia a dia?"},{"role":"user","content":"sim, precisa ser barato pra manter"},{"role":"assistant","content":"Entendo perfeitamente! Temos ótimas opções de carros 1.0 que fazem mais de 14km/l. O Kwid e o Mobi são campeões de economia. Qual valor você consegue investir?"},{"role":"user","content":"tenho uns 8 mil de entrada"},{"role":"assistant","content":"Com R$ 8 mil de entrada, consigo te colocar em um Renault Kwid 2021 com parcelas que cabem no bolso! Quer que eu faça uma simulação?"}]'
),
(
  'Profissional buscando picape para trabalho, agendou test-drive',
  'trabalho',
  'picape',
  '120k_200k',
  'foco_em_durabilidade',
  'appointment',
  10,
  '[{"role":"user","content":"Preciso de uma picape para trabalho"},{"role":"assistant","content":"Olá! Picapes são excelentes para trabalho. Você precisa de uma cabine simples para mais caçamba, ou cabine dupla?"},{"role":"user","content":"cabine dupla, as vezes levo a equipe"},{"role":"assistant","content":"Perfeito! Para uso profissional com equipe, a Hilux e a S10 são imbatíveis em durabilidade. Qual o tipo de trabalho? Isso me ajuda a recomendar a motorização ideal."},{"role":"user","content":"construção civil"},{"role":"assistant","content":"Para construção civil, recomendo a S10 diesel - aguenta carga pesada e tem manutenção mais em conta que a Hilux. Temos uma 2021 com 45 mil km por R$ 165 mil. Quer fazer um test-drive?"}]'
),
(
  'Executivo buscando sedan premium, converteu para hot lead',
  'executivo',
  'sedan',
  'acima_200k',
  'foco_em_status',
  'hot_lead',
  6,
  '[{"role":"user","content":"Vocês tem Corolla ou Civic?"},{"role":"assistant","content":"Olá! Sim, temos ambos! O Corolla e o Civic são excelentes sedans. Você prefere um mais conservador ou mais esportivo?"},{"role":"user","content":"uso para trabalho, reuniões com clientes"},{"role":"assistant","content":"Para uso executivo, o Corolla Altis passa uma imagem mais sofisticada, enquanto o Civic Touring tem mais tecnologia. Temos um Corolla Altis Hybrid 2023 que é top de linha. Posso passar os detalhes?"},{"role":"user","content":"manda o preço e as fotos"}]'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE behavioral_fingerprints IS 'Armazena padrões de comportamento únicos de cada sessão para análise preditiva';
COMMENT ON TABLE intent_predictions IS 'Histórico de predições de intenção para calibração do modelo ML';
COMMENT ON TABLE proactive_triggers_log IS 'Log de mensagens proativas iniciadas pela Camila';
COMMENT ON TABLE successful_conversations IS 'Banco de exemplos de conversas bem-sucedidas para Few-Shot Learning';
COMMENT ON TABLE model_performance IS 'Métricas diárias de performance do modelo preditivo';
