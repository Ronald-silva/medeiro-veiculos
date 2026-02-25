-- ===========================================
-- RECUPERAÇÃO DE LEADS PERDIDOS
-- Medeiros Veículos - Execute no Supabase SQL Editor
-- ===========================================
-- Extrai contatos reais das conversas mesmo quando
-- save_lead ou schedule_visit falhou silenciosamente.
-- ===========================================

-- -----------------------------------------------
-- 1. LEADS JÁ SALVOS (verificação base)
-- -----------------------------------------------
SELECT
  name,
  whatsapp,
  budget_text,
  vehicle_interest,
  status,
  created_at
FROM leads
ORDER BY created_at DESC;

-- -----------------------------------------------
-- 2. CONVERSAS COM TENTATIVA DE AGENDAMENTO
--    (schedule_visit foi chamado mas appointment não salvou)
-- -----------------------------------------------
SELECT
  c.source_id        AS telefone_whatsapp,
  c.source,
  c.created_at       AS inicio_conversa,
  m.content          AS mensagem_agendamento,
  m.created_at       AS quando_agendou
FROM conversations c
JOIN messages m ON m.conversation_id = c.id
WHERE m.tool_name = 'schedule_visit'
ORDER BY m.created_at DESC;

-- -----------------------------------------------
-- 3. TODAS AS CONVERSAS DO WHATSAPP COM CONTAGEM
--    (para identificar quem falou mas não virou lead)
-- -----------------------------------------------
SELECT
  c.source_id                           AS telefone,
  c.created_at                          AS primeiro_contato,
  COUNT(m.id)                           AS total_mensagens,
  MAX(m.created_at)                     AS ultima_mensagem,
  BOOL_OR(m.tool_name = 'save_lead')    AS lead_salvo,
  BOOL_OR(m.tool_name = 'schedule_visit') AS agendamento_tentado
FROM conversations c
JOIN messages m ON m.conversation_id = c.id
WHERE c.source = 'whatsapp'
GROUP BY c.id, c.source_id, c.created_at
HAVING COUNT(m.id) >= 3   -- ao menos 3 mensagens = interesse real
ORDER BY c.created_at DESC;

-- -----------------------------------------------
-- 4. HISTÓRICO COMPLETO DE UMA CONVERSA ESPECÍFICA
--    Substitua 'NUMERO_AQUI' pelo telefone do cliente
--    ex: '5585999991150' ou 'whatsapp:+5585999991150'
-- -----------------------------------------------
/*
SELECT
  m.role,
  m.content,
  m.tool_name,
  m.created_at
FROM conversations c
JOIN messages m ON m.conversation_id = c.id
WHERE c.source_id ILIKE '%NUMERO_AQUI%'
ORDER BY m.created_at ASC;
*/
