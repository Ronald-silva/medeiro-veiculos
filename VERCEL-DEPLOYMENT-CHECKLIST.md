# ✅ Checklist de Deploy no Vercel - Medeiros Veículos

## 📋 Problemas Anteriores RESOLVIDOS

### ❌ Problema 1: Rotas de API não funcionavam
**Causa**: `vercel.json` tinha rewrite rule `"/(.*)"` que redirecionava TUDO (incluindo APIs) para index.html

**✅ Solução**: Alterado para `"/((?!api).*)"` que EXCLUI rotas `/api/*` do rewrite
- **Arquivo**: [vercel.json:4](vercel.json#L4)
- **Status**: ✅ CORRIGIDO

### ❌ Problema 2: Variáveis de ambiente não documentadas
**Causa**: Não havia `.env.example` indicando quais variáveis configurar no Vercel

**✅ Solução**: Criado `.env.example` com todas as variáveis necessárias
- **Arquivo**: [.env.example](.env.example)
- **Status**: ✅ CRIADO

## 🚀 Passo a Passo para Deploy

### 1️⃣ Preparação Local (antes do deploy)

- [x] `vercel.json` corrigido com rewrite rule adequado
- [x] `.env.example` criado com documentação das variáveis
- [x] API routes em formato compatível com Vercel Serverless Functions
- [x] Build local testado: `npm run build`

**Testar build local**:
```bash
npm run build
npm run preview
```

Se o preview funcionar, o deploy deve funcionar também.

### 2️⃣ Configuração no Vercel Dashboard

#### A. Criar/Configurar Projeto
1. Acesse: https://vercel.com
2. Clique em "Add New..." → "Project"
3. Importe o repositório Git
4. **Framework Preset**: Vite (deve detectar automaticamente)
5. **Root Directory**: `.` (raiz do projeto)
6. **Build Command**: `npm run build` (padrão do Vite)
7. **Output Directory**: `dist` (padrão do Vite)

#### B. Configurar Environment Variables
🚨 **CRÍTICO**: Configure ANTES do primeiro deploy!

Acesse: `Settings` → `Environment Variables`

**OBRIGATÓRIO** (escolha UMA opção de IA):

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Production, Preview, Development |

OU (se preferir OpenAI):

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `OPENAI_API_KEY` | `sk-proj-...` | Production, Preview, Development |

**OPCIONAL** (Supabase - se quiser persistência de dados):

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJh...` | Production, Preview, Development |

**OPCIONAL** (WhatsApp):

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `SELLER_WHATSAPP` | `5585988852900` | Production, Preview, Development |

### 3️⃣ Deploy

1. Clique em "Deploy" no Vercel Dashboard
2. Aguarde o build completar (1-3 minutos)
3. Vercel vai:
   - Executar `npm install`
   - Executar `npm run build` (compila frontend Vite)
   - Detectar automaticamente as funções serverless em `/api/*`
   - Fazer deploy do frontend estático + API serverless

### 4️⃣ Verificação Pós-Deploy

#### A. Testar Frontend
Acesse a URL do deploy (ex: `https://medeiros-veiculos.vercel.app`)

✅ **Deve carregar**:
- Página inicial com catálogo de veículos
- Chat funcionando visualmente
- Imagens dos carros

#### B. Testar API Health Check
Acesse: `https://seu-dominio.vercel.app/api/chat/route`

✅ **Resposta esperada**:
```json
{
  "status": "ok",
  "service": "chat-api",
  "supabase": "configured" | "not configured",
  "aiProvider": "claude-3.5-sonnet" | "gpt-4o",
  "conversationsInCache": 0,
  "timestamp": "2024-12-24T..."
}
```

#### C. Testar Chat Completo
1. Abra o site no browser
2. Abra DevTools (F12) → Console
3. Clique no chat e envie mensagem: "Olá"
4. Verifique:
   - ✅ Mensagem enviada
   - ✅ Resposta recebida em português
   - ✅ Sem erros no console
   - ✅ Sem erros 500 ou 400

#### D. Testar Recomendação de Veículos
Envie no chat: "Quero uma picape até 120k"

✅ **Deve**:
- Recomendar veículos do estoque
- Mostrar preços
- Oferecer agendamento

## 🔍 Checklist de Diagnóstico de Problemas

### Se o Frontend não carregar:

- [ ] Verifique se o build completou sem erros no Vercel Dashboard → Deployments → Build Logs
- [ ] Verifique se `dist/` foi gerado corretamente
- [ ] Verifique se há erros 404 no browser console

### Se a API não responder (erro 404 nas chamadas `/api/*`):

- [ ] ✅ Verifique se `vercel.json` tem `"/((?!api).*)"` e NÃO `"/(.*)"`
- [ ] Verifique se os arquivos em `/api/` estão presentes no repositório
- [ ] Verifique se as funções exportam `export async function POST()` ou `export async function GET()`
- [ ] Verifique os logs do Vercel: Dashboard → Deployments → Functions

### Se a API retornar erro 500:

- [ ] Verifique se `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY` foi configurada
- [ ] Verifique os logs da função: Dashboard → Deployments → [sua função] → Logs
- [ ] Verifique se a chave de API está válida (não expirada)
- [ ] Se usar Supabase, verifique se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão corretos

### Se o chat responder em inglês ou com erros de formato:

- [ ] Verifique se o prompt em `src/constants/agentPrompts.js` está em português
- [ ] Verifique se `ANTHROPIC_MODEL` está usando `claude-sonnet-4-5-20250929` (mais recente)
- [ ] Limpe o cache de conversação reiniciando a função (redeploy)

## 📊 Estrutura do Projeto no Vercel

```
medeiros-veiculos/
├── dist/                          # Frontend estático (gerado por Vite)
│   ├── index.html                 # → https://seu-dominio.vercel.app/
│   ├── assets/                    # → https://seu-dominio.vercel.app/assets/*
│   └── ...
│
├── api/                           # Serverless Functions
│   ├── chat/
│   │   └── route.js              # → https://seu-dominio.vercel.app/api/chat/route
│   ├── leads/                    # (se houver)
│   ├── schedule/                 # (se houver)
│   └── whatsapp/                 # (se houver)
│
└── server/                       # ❌ NÃO usado no Vercel (apenas dev local)
    └── index.js                  # Express server (ignorado no deploy)
```

## ⚠️ IMPORTANTE: Diferenças Local vs Vercel

| Aspecto | Desenvolvimento Local | Vercel Production |
|---------|----------------------|-------------------|
| **Frontend** | Vite dev server (porta 3000) | Static hosting (CDN) |
| **API** | Express server (porta 3001) | Serverless Functions |
| **Env Vars** | `.env.local` via dotenv | Vercel Dashboard |
| **Persistência** | Em memória (reinicia) | Em memória (cold start) |
| **Logs** | Terminal local | Vercel Dashboard → Functions → Logs |

## 🎯 Comandos Úteis

```bash
# Build local (teste antes do deploy)
npm run build

# Preview do build (simula produção)
npm run preview

# Deploy via CLI (alternativa ao dashboard)
npx vercel

# Deploy para produção via CLI
npx vercel --prod

# Ver logs em tempo real
npx vercel logs
```

## 📞 Suporte

Se encontrar problemas não listados aqui:

1. **Logs do Vercel**: Dashboard → Deployments → [seu deploy] → Function Logs
2. **Browser Console**: F12 → Console (para erros de frontend)
3. **Network Tab**: F12 → Network (para ver requests/responses da API)

## ✅ Status Final

- [x] Correção do vercel.json (rewrite rule)
- [x] API routes em formato Vercel Serverless Functions
- [x] Documentação de environment variables (.env.example)
- [x] Checklist de deployment criado
- [x] Suporte a Anthropic Claude (preferencial)
- [x] Suporte a OpenAI (fallback)
- [x] Supabase opcional (com fallback em memória)
- [x] Tratamento de erros robusto
- [x] Sistema pronto para deploy! 🚀

**Data da última verificação**: 24/12/2024
**Status**: ✅ PRONTO PARA DEPLOY NO VERCEL
