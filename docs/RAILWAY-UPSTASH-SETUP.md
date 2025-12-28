# 🚀 Railway + Upstash - Configuração Completa

Guia passo a passo para deploy do sistema em produção com **Railway** (hospedagem) + **Upstash** (cache Redis persistente).

---

## 📋 **POR QUE ESSA STACK?**

### **Railway (Hospedagem)**
- ✅ Auto-scaling automático
- ✅ Sem cold starts
- ✅ Deploy via Git (push = deploy)
- ✅ PostgreSQL + Redis inclusos
- ✅ Plano Hobby: $5/mês + consumo (~$20-40/mês)

### **Upstash Redis (Cache)**
- ✅ Cache persistente (não perde dados ao reiniciar)
- ✅ Latência ultra-baixa (10-50ms vs 150-300ms PostgreSQL)
- ✅ Serverless (paga pelo uso)
- ✅ Plano FREE: 10.000 comandos/dia
- ✅ Escalável para milhares de lojistas

### **Benefícios Combinados:**
- 🚀 **Performance**: Cache Redis 3-6x mais rápido
- 💾 **Confiabilidade**: Conversas nunca se perdem
- 📈 **Escalabilidade**: Aguenta 10-100+ lojistas
- 💰 **Custo-benefício**: ~$25-45/mês total

---

## 🎯 **PARTE 1: CONFIGURAR UPSTASH**

### **Passo 1: Criar Conta**
1. Acesse: https://console.upstash.com
2. Faça login com GitHub/Google
3. Verifique email

### **Passo 2: Criar Database Redis**
1. No dashboard, clique **"Create Database"**
2. Configure:
   - **Name**: `medeiros-veiculos-cache`
   - **Type**: Regional (mais barato)
   - **Region**: `us-east-1` ou `sa-east-1` (mais próximo do Brasil)
   - **Primary Region**: deixe padrão
   - **Read Region**: None (não precisa)
   - **Eviction**: No eviction (recomendado)

3. Clique **"Create"**

### **Passo 3: Copiar Credenciais**
1. No dashboard do database criado, vá em **"REST API"**
2. Copie:
   - `UPSTASH_REDIS_REST_URL` (ex: https://us1-random-12345.upstash.io)
   - `UPSTASH_REDIS_REST_TOKEN` (ex: AXa1b2c3d4e5...)

⚠️ **IMPORTANTE**: Guarde essas credenciais! Vamos usar no Railway.

### **Passo 4: Testar Localmente (Opcional)**
1. Edite `.env.local`:
```bash
UPSTASH_REDIS_REST_URL=https://us1-seu-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXa1b2c3d4e5...
```

2. Teste:
```bash
npm run dev:api
```

3. No console, deve aparecer:
```
💾 Cache Configuration:
  Upstash Redis: ENABLED (persistent)
```

---

## 🚂 **PARTE 2: CONFIGURAR RAILWAY**

### **Passo 1: Criar Conta**
1. Acesse: https://railway.app
2. Faça login com GitHub
3. Conecte sua conta GitHub

### **Passo 2: Criar Novo Projeto**
1. Clique **"New Project"**
2. Selecione **"Deploy from GitHub repo"**
3. Autorize acesso aos repositórios
4. Selecione repositório: `medeiros-veiculos`

### **Passo 3: Configurar Variáveis de Ambiente**

No Railway, vá em **Settings** → **Variables** e adicione:

#### **🔑 Obrigatórias:**

```bash
# API de IA (escolha UMA)
ANTHROPIC_API_KEY=sk-ant-api03-...
# OU
OPENAI_API_KEY=sk-...

# Upstash Redis (copie do Passo 3 acima)
UPSTASH_REDIS_REST_URL=https://us1-seu-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXa1b2c3d4e5...

# Supabase (se tiver)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Porta (Railway usa automaticamente)
PORT=3001
```

#### **⚙️ Opcionais (otimizações):**

```bash
# Modelo IA (se quiser trocar)
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
ANTHROPIC_MAX_TOKENS=1024

# WhatsApp loja
SELLER_WHATSAPP=5585988852900
```

### **Passo 4: Configurar Build Command**

1. Vá em **Settings** → **Build**
2. Configure:
   - **Build Command**: `npm run build`
   - **Start Command**: `node server/index.js`
   - **Watch Paths**: (deixe vazio para detectar automaticamente)

### **Passo 5: Deploy**

1. Clique **"Deploy"** ou faça push no GitHub
2. Railway detecta automaticamente e faz deploy
3. Aguarde 2-5 minutos

### **Passo 6: Obter URL Pública**

1. Vá em **Settings** → **Networking**
2. Clique **"Generate Domain"**
3. Copie a URL (ex: `medeiros-veiculos-production.up.railway.app`)

### **Passo 7: Testar API**

Teste no navegador ou Postman:
```
GET https://seu-app.railway.app/api/health
```

Deve retornar:
```json
{
  "status": "ok",
  "service": "medeiros-veiculos-api",
  "aiProvider": "claude-3.5-sonnet",
  "timestamp": "2025-12-28T...",
  "env": {
    "anthropic": true,
    "openai": false,
    "supabase": true
  }
}
```

---

## ✅ **PARTE 3: VERIFICAR INTEGRAÇÃO**

### **Teste 1: Cache Upstash Funcionando**

1. Acesse o chat no frontend
2. Envie mensagem: "Oi, meu nome é João"
3. IA responde com saudação
4. Envie: "Qual meu nome?"
5. IA deve responder: "Seu nome é João" ✅

**Se IA NÃO lembrar:**
- ❌ Upstash não está configurado
- Verifique logs do Railway: **Settings** → **Logs**
- Procure por: `Upstash Redis: ENABLED`

### **Teste 2: Performance**

Compare latência das respostas:

**SEM Upstash (cache memória):**
- Primeira resposta: ~3-8s
- Segunda resposta: ~3-8s
- Contexto se perde ao reiniciar

**COM Upstash:**
- Primeira resposta: ~3-8s
- Segunda resposta: ~3-8s
- **NUNCA perde contexto** (mesmo após reiniciar)

### **Teste 3: Persistência**

1. Inicie conversa com IA
2. No Railway, force reinicialização: **Settings** → **Restart**
3. Continue conversa
4. IA deve lembrar TUDO ✅

---

## 📊 **MONITORAMENTO**

### **Railway Dashboard**

Monitore em tempo real:
- **Metrics**: CPU, RAM, Network
- **Logs**: Erros e warnings
- **Deployments**: Histórico de deploys

### **Upstash Dashboard**

Monitore:
- **Commands**: Quantidade de operações
- **Storage**: Espaço usado
- **Latency**: Tempo de resposta (deve ser < 50ms)

### **Alertas Importantes:**

⚠️ **Railway perto do limite:**
- Plano Hobby: $5 créditos/mês
- Se ultrapassar: upgrade para Pro ($20/mês)

⚠️ **Upstash perto do limite FREE:**
- 10.000 comandos/dia
- ~300 conversas/dia (cada conversa = ~30 comandos)
- Upgrade: $0.20 por 100k comandos extras

---

## 🚀 **PRÓXIMOS PASSOS (OPCIONAL)**

### **Fase 2: Rate Limiting (Proteção)**

Para evitar abuso da API:

```javascript
// Já implementado em src/lib/upstash.js
const { allowed, remaining } = await checkRateLimit(userId, 5, 60);

if (!allowed) {
  return {
    message: "Calma aí! Aguarda só um momento que já respondo 😊"
  };
}
```

Ative adicionando no `api/chat/route.js`:
```javascript
import { checkRateLimit } from '../../src/lib/upstash.js';

// Dentro da função POST, antes de processar IA:
const rateLimit = await checkRateLimit(convId, 5, 60); // 5 msgs/min
if (!rateLimit.allowed) {
  return new Response(
    JSON.stringify({
      message: "Por favor, aguarde um momento antes de enviar outra mensagem 😊"
    }),
    { status: 429 }
  );
}
```

### **Fase 3: WhatsApp Evolution API**

Documentação separada em: `WHATSAPP-EVOLUTION-SETUP.md`

### **Fase 4: Multi-Tenant (Vários Lojistas)**

Documentação separada em: `MULTI-TENANT-SETUP.md`

---

## ❓ **TROUBLESHOOTING**

### **Problema: "Upstash Redis: DISABLED"**

**Causa:** Variáveis não configuradas no Railway

**Solução:**
1. Vá em Railway → Settings → Variables
2. Adicione `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`
3. Redeploy: Settings → Restart

### **Problema: "TypeError: redis.get is not a function"**

**Causa:** Versão incorreta do @upstash/redis

**Solução:**
```bash
npm install @upstash/redis@latest
git add package.json package-lock.json
git commit -m "fix: update upstash redis version"
git push
```

### **Problema: Conversas ainda se perdem**

**Causa:** Upstash configurado mas com erro nas credenciais

**Solução:**
1. Verifique logs Railway: `Upstash Redis connected`
2. Se não aparecer, credenciais estão erradas
3. Regenere credenciais no Upstash Console
4. Atualize no Railway

### **Problema: Latência alta (> 500ms)**

**Causa:** Region do Upstash longe do Railway

**Solução:**
1. Crie novo database Upstash na mesma região do Railway
2. Railway geralmente usa `us-east-1` ou `us-west-2`
3. Upstash: escolha região mais próxima

---

## 💰 **CUSTOS MENSAIS ESTIMADOS**

### **Cenário 1: 1 Lojista (500 conversas/mês)**
- Railway Hobby: $7/mês
- Upstash: FREE (< 10k comandos/dia)
- **Total: $7/mês** 🎉

### **Cenário 2: 5 Lojistas (2.500 conversas/mês)**
- Railway Hobby: $15/mês (mais uso)
- Upstash: FREE
- **Total: $15/mês**

### **Cenário 3: 10 Lojistas (5.000 conversas/mês)**
- Railway Pro: $25/mês
- Upstash: $2/mês
- **Total: $27/mês**

### **Cenário 4: 50 Lojistas (25.000 conversas/mês)**
- Railway Pro: $80/mês
- Upstash: $15/mês
- **Total: $95/mês**

**ROI:** Se cada lojista paga R$ 200/mês:
- 50 lojistas = R$ 10.000/mês receita
- Custo: R$ 475/mês (~$95)
- **Lucro: R$ 9.525/mês** 🚀

---

## 📚 **RECURSOS ADICIONAIS**

- **Railway Docs**: https://docs.railway.app
- **Upstash Docs**: https://docs.upstash.com
- **Upstash Redis Node SDK**: https://github.com/upstash/upstash-redis

---

## ✅ **CHECKLIST FINAL**

- [ ] Conta Upstash criada
- [ ] Database Redis criado
- [ ] Credenciais copiadas
- [ ] Conta Railway criada
- [ ] Projeto conectado ao GitHub
- [ ] Variáveis de ambiente configuradas
- [ ] Build command configurado
- [ ] Deploy realizado com sucesso
- [ ] URL pública gerada
- [ ] Teste /api/health passou
- [ ] Teste de memória funcionando
- [ ] Logs mostrando "Upstash Redis: ENABLED"

**Tudo checado? Parabéns! 🎉 Sistema em produção com cache persistente!**
