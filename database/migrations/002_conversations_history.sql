-- ============================================
-- MIGRAÇÃO: Sistema de Histórico de Conversas
-- ============================================
-- Garante que as tabelas conversations e messages existam
-- e estejam prontas para persistir o histórico completo
-- ============================================

-- Tipo enum para role de mensagem (se não existir)
DO $$ BEGIN
  CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipo enum para status de conversa (se não existir)
DO $$ BEGIN
  CREATE TYPE conversation_status AS ENUM ('ativa', 'pausada', 'encerrada', 'convertida');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipo enum para canal (se não existir)
DO $$ BEGIN
  CREATE TYPE conversation_channel AS ENUM ('whatsapp', 'website', 'instagram', 'facebook');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABELA: conversations (conversas)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identificação
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  whatsapp VARCHAR(20) NOT NULL,

  -- Canal e status
  channel conversation_channel DEFAULT 'whatsapp',
  status conversation_status DEFAULT 'ativa',

  -- Contadores
  messages_count INTEGER DEFAULT 0,
  user_messages_count INTEGER DEFAULT 0,
  assistant_messages_count INTEGER DEFAULT 0,

  -- Resultado
  resulted_in_appointment BOOLEAN DEFAULT FALSE,
  resulted_in_sale BOOLEAN DEFAULT FALSE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,

  -- Análise
  overall_sentiment VARCHAR(50),
  main_intent VARCHAR(100),
  vehicle_interest TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para conversations
CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp ON conversations(whatsapp);
CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_started ON conversations(started_at DESC);

-- ============================================
-- TABELA: messages (mensagens individuais)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relacionamentos
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Conteúdo
  role message_role NOT NULL,
  content TEXT NOT NULL,

  -- Metadata da mensagem
  tokens_used INTEGER,
  model_used VARCHAR(100),
  response_time_ms INTEGER, -- tempo de resposta em ms

  -- Para tool calls
  tool_name VARCHAR(100),
  tool_input JSONB,
  tool_output JSONB,

  -- Análise da mensagem
  intent VARCHAR(100),
  sentiment VARCHAR(50),
  entities JSONB,

  -- Controle
  is_processed BOOLEAN DEFAULT FALSE,
  processing_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages(lead_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- ============================================
-- TRIGGER: Atualiza contadores na conversa
-- ============================================
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    messages_count = messages_count + 1,
    user_messages_count = user_messages_count + CASE WHEN NEW.role = 'user' THEN 1 ELSE 0 END,
    assistant_messages_count = assistant_messages_count + CASE WHEN NEW.role = 'assistant' THEN 1 ELSE 0 END,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();

-- ============================================
-- VIEW: Conversas com resumo para o CRM
-- ============================================
CREATE OR REPLACE VIEW conversations_summary AS
SELECT
  c.id,
  c.whatsapp,
  c.channel,
  c.status,
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
  l.name as lead_name,
  l.score as lead_score,
  -- Primeira mensagem do usuário
  (
    SELECT content
    FROM messages m
    WHERE m.conversation_id = c.id AND m.role = 'user'
    ORDER BY m.created_at ASC
    LIMIT 1
  ) as first_user_message,
  -- Última mensagem
  (
    SELECT content
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) as last_message,
  -- Duração em minutos
  EXTRACT(EPOCH FROM (COALESCE(c.ended_at, c.last_message_at) - c.started_at)) / 60 as duration_minutes
FROM conversations c
LEFT JOIN leads l ON c.lead_id = l.id
ORDER BY c.last_message_at DESC;

-- ============================================
-- FUNÇÃO: Buscar ou criar conversa ativa
-- ============================================
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_whatsapp VARCHAR(20),
  p_lead_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_hours_since_last INTEGER;
BEGIN
  -- Busca conversa ativa recente (últimas 24h)
  SELECT id,
         EXTRACT(EPOCH FROM (NOW() - last_message_at)) / 3600
  INTO v_conversation_id, v_hours_since_last
  FROM conversations
  WHERE whatsapp = p_whatsapp
    AND status = 'ativa'
  ORDER BY last_message_at DESC
  LIMIT 1;

  -- Se não existe ou última mensagem foi há mais de 24h, cria nova
  IF v_conversation_id IS NULL OR v_hours_since_last > 24 THEN
    -- Encerra conversa anterior se existir
    IF v_conversation_id IS NOT NULL THEN
      UPDATE conversations
      SET status = 'encerrada', ended_at = NOW()
      WHERE id = v_conversation_id;
    END IF;

    -- Cria nova conversa
    INSERT INTO conversations (whatsapp, lead_id, channel)
    VALUES (p_whatsapp, p_lead_id, 'whatsapp')
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Política para service role (backend)
CREATE POLICY "Service role full access conversations" ON conversations
  FOR ALL USING (true);

CREATE POLICY "Service role full access messages" ON messages
  FOR ALL USING (true);

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON TABLE conversations IS 'Histórico de conversas do WhatsApp com a Camila';
COMMENT ON TABLE messages IS 'Mensagens individuais de cada conversa';
COMMENT ON VIEW conversations_summary IS 'Resumo das conversas para exibição no CRM';
