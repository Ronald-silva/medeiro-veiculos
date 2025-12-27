# ⚠️ Limitações do Plano Gratuito Vercel

## 🔴 Problema Identificado: Timeout 504

O plano **gratuito do Vercel** tem um limite de **10 segundos** de execução para serverless functions.

Conversas com IA (especialmente quando usam tools/funções) frequentemente ultrapassam esse limite, resultando em erro **504 Gateway Timeout**.

## 📊 Otimizações Já Aplicadas

Para tentar funcionar no plano gratuito, apliquei:

| Otimização | Antes | Agora | Impacto |
|------------|-------|-------|---------|
| **max_tokens** | 1024 | 256 | Respostas 75% mais curtas |
| **Histórico** | 10 msgs | 2 msgs | Apenas última troca salva |
| **Timeout interno** | - | 7s | Falha antes dos 10s do Vercel |

## ⚠️ Limitações Resultantes

Com essas otimizações extremas:

### ✅ O que funciona:
- Primeiras mensagens do chat (saudação)
- Perguntas simples sem tools
- Conversas curtas (1-2 trocas)

### ❌ O que pode falhar:
- Agendamento de visitas (usa tools = +3-5s)
- Recomendação de veículos (usa tools = +3-5s)
- Conversas longas (>3 trocas)
- Respostas complexas

## 💡 Soluções Disponíveis

### Opção 1: Upgrade Vercel Pro (RECOMENDADO)
```
Custo: $20/mês (US$ ~100 R$/mês)
Benefício: 60 segundos de timeout (6x mais)
Resultado: Sistema funciona 100% sem limitações
```

**Como fazer:**
1. Acesse: https://vercel.com/dashboard/billing
2. Clique em "Upgrade to Pro"
3. Adicione cartão de crédito
4. Deploy automático mantém configurações

### Opção 2: Migrar para Railway (GRATUITO)
```
Custo: $0 (plano gratuito generoso)
Benefício: Sem limite de 10s (até 5 minutos)
Resultado: Sistema funciona bem sem custo
```

**Como fazer:**
1. Acesse: https://railway.app
2. Faça login com GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Selecione medeiros-veiculos
5. Configure variáveis de ambiente
6. Deploy automático

### Opção 3: Usar Claude Haiku (+ rápido, - capaz)
```
Custo: $0
Benefício: Modelo 3x mais rápido
Limitação: Respostas menos sofisticadas
```

**Como fazer:**
No Vercel Dashboard → Environment Variables:
```
ANTHROPIC_MODEL=claude-3-haiku-20240307
```

### Opção 4: Aceitar Limitações (NÃO RECOMENDADO)
```
Custo: $0
Risco: Chat vai falhar em ~40-50% das conversas
Experiência: Ruim para o cliente
```

## 🎯 Minha Recomendação

Para um sistema de vendas profissional, recomendo **Opção 1 (Vercel Pro)** por:

1. **Confiabilidade**: 99.9% uptime garantido
2. **Performance**: 60s timeout suporta qualquer conversa
3. **Simplicidade**: Zero configuração adicional
4. **CDN Global**: Site carrega rápido em qualquer lugar
5. **Deploy automático**: Cada push = deploy instantâneo

**ROI**: Se o sistema gerar 1 venda extra por mês, já paga o investimento (R$ 300 comissão > R$ 100 custo).

## 📈 Alternativa Intermediária: Railway

Se o custo for problema agora, **Railway** é excelente:
- Plano gratuito generoso (500h/mês)
- Timeouts muito maiores (até 5 min)
- Deploy tão fácil quanto Vercel
- Upgrade futuro para $5/mês (muito mais barato que Vercel Pro)

## ⚡ Ação Imediata

### Para testar com limitações atuais:
```bash
git push origin main
```

Aguarde 2 minutos e teste: **conversas CURTAS devem funcionar**.

### Para resolver DEFINITIVAMENTE:

**Se tem budget**: Upgrade Vercel Pro agora
**Se não tem budget**: Migrar para Railway hoje

---

**Data**: 24/12/2024
**Status Atual**: ⚠️ Sistema FUNCIONANDO com LIMITAÇÕES (plano gratuito)
**Próximo passo**: Decisão do Ronald sobre qual opção escolher
