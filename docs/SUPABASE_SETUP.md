# 🚀 Guia de Configuração do Supabase

## Passo 1: Criar Conta no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Clique em **"Start your project"**
3. Faça login com GitHub ou crie uma conta

## Passo 2: Criar Novo Projeto

1. No dashboard, clique em **"New Project"**
2. Preencha:
   - **Name**: `medeiros-veiculos` (ou o nome que preferir)
   - **Database Password**: Crie uma senha forte e **SALVE EM LUGAR SEGURO**
   - **Region**: Escolha `South America (São Paulo)` para menor latência
3. Clique em **"Create new project"**
4. Aguarde 2-3 minutos até o projeto estar pronto

## Passo 3: Obter Credenciais da API

1. No menu lateral, vá em **Settings** ⚙️
2. Clique em **API**
3. Você verá duas informações importantes:

### Project URL
```
https://seu-projeto-id.supabase.co
```

### anon/public key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. **Copie essas duas informações** - você vai precisar delas!

## Passo 4: Configurar Variáveis de Ambiente

1. Abra o arquivo `.env.local` no seu projeto
2. Substitua as variáveis do Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **IMPORTANTE**: Nunca commite essas credenciais no Git! O arquivo `.env.local` já está no `.gitignore`.

## Passo 5: Criar Tabelas no Database

1. No menu lateral do Supabase, vá em **SQL Editor** 💾
2. Clique em **"New query"**
3. Copie e cole o conteúdo do arquivo `api/supabase-schema.sql`
4. Clique em **"Run"** (ou pressione Ctrl+Enter)
5. Aguarde a mensagem de sucesso ✅

## Passo 6: Verificar Tabelas Criadas

1. No menu lateral, vá em **Table Editor** 📊
2. Você deve ver 4 tabelas criadas:
   - ✅ `leads` - Leads capturados pelo chat
   - ✅ `vehicles` - Estoque de veículos
   - ✅ `appointments` - Agendamentos de visitas
   - ✅ `interactions` - Tracking de eventos

## Passo 7: Popular Tabela de Veículos (Opcional)

O SQL já insere 3 veículos de exemplo automaticamente:
- Honda HR-V EXL 2022
- Toyota Corolla XEI 2023
- Jeep Compass Limited 2022

Para adicionar mais veículos:
1. Vá em **Table Editor** > `vehicles`
2. Clique em **"Insert"** > **"Insert row"**
3. Preencha os dados do veículo
4. Clique em **"Save"**

## Passo 8: Testar Integração

1. Inicie o servidor: `npm run dev`
2. Abra o navegador em `http://localhost:3000`
3. Clique no botão **"Consultor IA 24/7"**
4. Inicie uma conversa com o chat
5. Verifique no Supabase (Table Editor > `leads`) se os dados estão sendo salvos

## 🔒 Segurança e Row Level Security (RLS)

Por padrão, as tabelas estão acessíveis via API. Para produção, você deve configurar RLS:

1. Vá em **Authentication** > **Policies**
2. Para cada tabela, crie policies:
   - `leads`: Apenas INSERT público, SELECT apenas autenticado
   - `vehicles`: SELECT público, INSERT/UPDATE apenas autenticado
   - `appointments`: INSERT público, SELECT apenas autenticado
   - `interactions`: INSERT público

**Para este projeto (MVP), vamos deixar sem RLS por enquanto.**

## 📊 Visualizar Dados

### Opção 1: Table Editor (Supabase Dashboard)
1. Vá em **Table Editor**
2. Selecione a tabela desejada
3. Visualize, edite ou delete registros

### Opção 2: SQL Editor
```sql
-- Ver todos os leads
SELECT * FROM leads ORDER BY created_at DESC;

-- Ver leads quentes (score > 70)
SELECT nome, whatsapp, score, created_at
FROM leads
WHERE score > 70
ORDER BY score DESC;

-- Ver agendamentos pendentes
SELECT * FROM appointments
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Dashboard de métricas
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_leads,
  AVG(score) as avg_score
FROM leads
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🎯 Próximos Passos

Após configurar o Supabase:

1. ✅ Testar o chat e verificar se leads são salvos
2. ✅ Adicionar veículos reais na tabela `vehicles`
3. ✅ Configurar notificações por email (Supabase tem integração nativa)
4. ✅ Implementar dashboard de vendas (futuro)
5. ✅ Configurar backup automático (Supabase faz isso por padrão)

## 🆘 Troubleshooting

### Erro: "Invalid API key"
- Verifique se copiou a `anon key` correta (não confunda com `service_role key`)
- Verifique se não há espaços extras nas variáveis de ambiente

### Erro: "relation does not exist"
- Execute o SQL do passo 5 novamente
- Verifique se todas as 4 tabelas foram criadas

### Erro: "Failed to fetch"
- Verifique se a VITE_SUPABASE_URL está correta
- Verifique se o projeto Supabase está ativo (pode pausar após inatividade no plano free)

### Chat funciona mas dados não aparecem no Supabase
- Verifique o console do navegador (F12) para erros
- Teste o health check: `http://localhost:3000/api/chat/route` (GET)
- Deve retornar: `"supabase": "configured"`

## 📚 Recursos Úteis

- [Documentação Supabase](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [SQL Tutorial](https://supabase.com/docs/guides/database/tables)

---

**Pronto! Seu sistema está configurado com Supabase. 🎉**

Qualquer dúvida, acesse a [documentação oficial](https://supabase.com/docs) ou consulte o README do projeto.
