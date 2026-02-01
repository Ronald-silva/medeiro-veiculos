-- ============================================
-- MIGRAÇÃO: Contadores de Mensagens
-- ============================================
-- Adiciona colunas de contagem de mensagens
-- caso não existam (complementar à 002)
-- ============================================

-- Adiciona coluna messages_count
DO $$ BEGIN
  ALTER TABLE conversations ADD COLUMN messages_count INTEGER DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Adiciona coluna user_messages_count
DO $$ BEGIN
  ALTER TABLE conversations ADD COLUMN user_messages_count INTEGER DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Adiciona coluna assistant_messages_count
DO $$ BEGIN
  ALTER TABLE conversations ADD COLUMN assistant_messages_count INTEGER DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- ============================================
-- TRIGGER: Atualiza contadores ao inserir mensagem
-- ============================================
CREATE OR REPLACE FUNCTION update_conversation_message_counts()
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

-- Recria o trigger (substitui o da migration 002 se existir)
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
DROP TRIGGER IF EXISTS trigger_update_conversation_counts ON messages;

CREATE TRIGGER trigger_update_conversation_counts
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_message_counts();

-- ============================================
-- ATUALIZA CONTADORES EXISTENTES
-- ============================================
-- Recalcula contadores para conversas que já existem
UPDATE conversations c SET
  messages_count = COALESCE((SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id), 0),
  user_messages_count = COALESCE((SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.role = 'user'), 0),
  assistant_messages_count = COALESCE((SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.role = 'assistant'), 0);

COMMENT ON COLUMN conversations.messages_count IS 'Total de mensagens na conversa';
COMMENT ON COLUMN conversations.user_messages_count IS 'Mensagens do cliente';
COMMENT ON COLUMN conversations.assistant_messages_count IS 'Mensagens da Camila';
