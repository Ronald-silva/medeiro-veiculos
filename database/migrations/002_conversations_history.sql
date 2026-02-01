-- ============================================
-- MIGRAÇÃO: Sistema de Histórico de Conversas
-- ============================================
-- Adiciona colunas necessárias às tabelas existentes
-- para persistir o histórico completo de conversas
-- ============================================

-- ============================================
-- ADICIONA COLUNAS À TABELA conversations
-- ============================================

-- Adiciona coluna whatsapp (se não existir)
DO $$ BEGIN
  ALTER TABLE conversations ADD COLUMN whatsapp VARCHAR(20);
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Adiciona coluna status (se não existir)
DO $$ BEGIN
  CREATE TYPE conversation_status AS ENUM ('ativa', 'pausada', 'encerrada', 'convertida');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE conversations ADD COLUMN status conversation_status DEFAULT 'ativa';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Adiciona coluna resulted_in_appointment
DO $$ BEGIN
  ALTER TABLE conversations ADD COLUMN resulted_in_appointment BOOLEAN DEFAULT FALSE;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Adiciona coluna resulted_in_sale
DO $$ BEGIN
  ALTER TABLE conversations ADD COLUMN resulted_in_sale BOOLEAN DEFAULT FALSE;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Adiciona coluna appointment_id
DO $$ BEGIN
  ALTER TABLE conversations ADD COLUMN appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Adiciona coluna last_message_at
DO $$ BEGIN
  ALTER TABLE conversations ADD COLUMN last_message_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Adiciona coluna overall_sentiment
DO $$ BEGIN
  ALTER TABLE conversations ADD COLUMN overall_sentiment VARCHAR(50);
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Adiciona coluna vehicle_interest
DO $$ BEGIN
  ALTER TABLE conversations ADD COLUMN vehicle_interest TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Adiciona coluna updated_at
DO $$ BEGIN
  ALTER TABLE conversations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- ============================================
-- ADICIONA COLUNAS À TABELA messages
-- ============================================

-- Adiciona coluna response_time_ms
DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN response_time_ms INTEGER;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índice para buscar conversas por WhatsApp
CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp ON conversations(whatsapp);

-- Índice para buscar conversas por status
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

-- Índice para ordenar por última mensagem
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- Índice para buscar por resultado
CREATE INDEX IF NOT EXISTS idx_conversations_appointment ON conversations(resulted_in_appointment);

-- ============================================
-- TRIGGER: Atualiza last_message_at
-- ============================================
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_last_message();

-- ============================================
-- FUNÇÃO: Buscar ou criar conversa ativa
-- ============================================
CREATE OR REPLACE FUNCTION get_or_create_whatsapp_conversation(
  p_whatsapp VARCHAR(20),
  p_lead_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_hours_since_last NUMERIC;
BEGIN
  -- Busca conversa ativa recente (últimas 24h)
  SELECT id,
         EXTRACT(EPOCH FROM (NOW() - COALESCE(last_message_at, started_at))) / 3600
  INTO v_conversation_id, v_hours_since_last
  FROM conversations
  WHERE whatsapp = p_whatsapp
    AND (status = 'ativa' OR is_active = TRUE)
  ORDER BY COALESCE(last_message_at, started_at) DESC
  LIMIT 1;

  -- Se não existe ou última mensagem foi há mais de 24h, cria nova
  IF v_conversation_id IS NULL OR v_hours_since_last > 24 THEN
    -- Encerra conversa anterior se existir
    IF v_conversation_id IS NOT NULL THEN
      UPDATE conversations
      SET status = 'encerrada', is_active = FALSE, ended_at = NOW()
      WHERE id = v_conversation_id;
    END IF;

    -- Cria nova conversa
    INSERT INTO conversations (
      whatsapp,
      lead_id,
      session_id,
      channel,
      status,
      is_active,
      started_at,
      last_message_at
    )
    VALUES (
      p_whatsapp,
      p_lead_id,
      'whatsapp_' || p_whatsapp || '_' || EXTRACT(EPOCH FROM NOW())::TEXT,
      'whatsapp',
      'ativa',
      TRUE,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEW: Resumo das conversas para o CRM
-- ============================================
CREATE OR REPLACE VIEW conversations_crm_view AS
SELECT
  c.id,
  c.whatsapp,
  c.channel,
  c.status,
  c.is_active,
  c.messages_count,
  c.user_messages_count,
  c.assistant_messages_count,
  c.resulted_in_appointment,
  c.resulted_in_sale,
  c.overall_sentiment,
  c.vehicle_interest,
  c.started_at,
  c.last_message_at,
  c.ended_at,
  l.id as lead_id,
  l.name as lead_name,
  l.score as lead_score
FROM conversations c
LEFT JOIN leads l ON c.lead_id = l.id
WHERE c.whatsapp IS NOT NULL
ORDER BY c.last_message_at DESC NULLS LAST;

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON COLUMN conversations.whatsapp IS 'Número do WhatsApp do cliente';
COMMENT ON COLUMN conversations.status IS 'Status da conversa: ativa, pausada, encerrada, convertida';
COMMENT ON COLUMN conversations.resulted_in_appointment IS 'Se a conversa resultou em agendamento';
COMMENT ON COLUMN conversations.last_message_at IS 'Data/hora da última mensagem';
COMMENT ON FUNCTION get_or_create_whatsapp_conversation IS 'Busca conversa ativa ou cria nova para o WhatsApp';
