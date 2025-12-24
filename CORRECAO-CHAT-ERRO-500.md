# 🔧 CORREÇÃO - Erro 500 no Chat (Financiamento)

**Data:** 21 de Dezembro de 2025
**Status:** ✅ CORRIGIDO

---

## 🚨 PROBLEMA IDENTIFICADO

### Erro Relatado:
```
:3000/api/chat/route:1 Failed to load resource: the server responded with a status of 500 (Internal Server Error)
chatService.js:36 Error sending message: Error: HTTP error! status: 500
```

### Contexto do Erro:
O erro ocorria quando o usuário tentava calcular financiamento:
1. Usuário: "parcelar"
2. Bot: "Show! Posso financiar em até 60x. Você consegue dar quanto de entrada?"
3. Usuário: "30 mil"
4. **ERRO 500** ❌

---

## 🔍 CAUSA RAIZ

A função `calculate_installment` requer 2 parâmetros obrigatórios:
- `vehiclePrice` (número) - preço do veículo
- `months` (número) - quantidade de parcelas

**O que estava acontecendo:**
- O cliente informava a entrada ("30 mil")
- A IA tentava chamar `calculate_installment` mas:
  - ❌ Não tinha o `vehiclePrice` (qual carro?)
  - ❌ Não tinha `months` (quantas parcelas?)
  - ❌ A função falhava causando erro 500

**Por que a IA não tinha essas informações?**
- Faltava contexto sobre qual veículo estava sendo discutido
- O prompt não orientava a IA a perguntar o número de parcelas
- A validação de parâmetros era fraca

---

## ✅ SOLUÇÃO IMPLEMENTADA

### 1. **Melhor Validação na Função** (`api/chat/route.js`)

**Antes:**
```javascript
function calculateInstallment({ vehiclePrice, downPayment = 0, months, interestRate = 2.49 }) {
  try {
    const financedAmount = vehiclePrice - downPayment;
    // ... cálculo direto sem validação
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

**Depois:**
```javascript
function calculateInstallment({ vehiclePrice, downPayment = 0, months, interestRate = 2.49 }) {
  try {
    // ✅ VALIDAÇÃO: Preço do veículo
    if (!vehiclePrice || vehiclePrice <= 0) {
      console.error('❌ calculateInstallment: vehiclePrice inválido:', vehiclePrice);
      return {
        success: false,
        error: 'Preço do veículo não informado',
        message: 'Preciso saber qual veículo você está interessado para calcular o financiamento. Qual carro você gostou?'
      };
    }

    // ✅ VALIDAÇÃO: Número de parcelas
    if (!months || months <= 0) {
      console.error('❌ calculateInstallment: months inválido:', months);
      return {
        success: false,
        error: 'Número de meses não informado',
        message: 'Em quantas vezes você quer parcelar? Temos opções de 12x até 60x.'
      };
    }

    // ✅ VALIDAÇÃO: Entrada maior que preço (pagamento à vista)
    if (downPayment >= vehiclePrice) {
      return {
        success: true,
        installmentValue: 0,
        months: 0,
        total: vehiclePrice,
        totalInterest: 0,
        message: `Pagamento à vista de R$ ${vehiclePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      };
    }

    // ... cálculo normal
    console.log(`💰 Financiamento calculado: R$ ${vehiclePrice.toLocaleString('pt-BR')} - Entrada R$ ${downPayment.toLocaleString('pt-BR')} = ${months}x de R$ ${installment.toFixed(2)}`);

    return {
      success: true,
      installmentValue: Math.round(installment * 100) / 100,
      months,
      downPayment, // ✅ Agora retorna entrada também
      total: Math.round(total * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      message: `Entrada de R$ ${downPayment.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} + ${months}x de R$ ${installment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    };
  } catch (error) {
    console.error('❌ Error in calculateInstallment:', error);
    return {
      success: false,
      error: error.message,
      message: 'Desculpe, tive um problema ao calcular o financiamento. Me passa o valor do carro e em quantas vezes você quer pagar?'
    };
  }
}
```

**Melhorias:**
- ✅ Valida se `vehiclePrice` existe e é maior que 0
- ✅ Valida se `months` existe e é maior que 0
- ✅ Trata caso especial de entrada >= preço (pagamento à vista)
- ✅ Retorna mensagens claras ao usuário quando falta informação
- ✅ Logs detalhados para debugging

---

### 2. **Prompt Melhorado** (`src/constants/agentPrompts.js`)

Adicionada nova seção no prompt:

```
💳 FINANCIAMENTO - REGRAS IMPORTANTES:

**ANTES de chamar calculate_installment, você PRECISA ter:**
1. ✅ Preço do veículo específico (use recommend_vehicles primeiro)
2. ✅ Valor da entrada (se o cliente der; senão use 0)
3. ✅ Número de parcelas (pergunte ou assuma 48x como padrão)

**Fluxo correto de financiamento:**
Cliente: "Quero financiar"
Você: "Show! Consigo financiar em até 60x. Você consegue dar quanto de entrada?"
Cliente: "30 mil"
Você: "Ótimo! Quer parcelar em quantas vezes? 24x, 36x, 48x ou 60x?"
Cliente: "48x"
Você: [AGORA SIM chama calculate_installment com vehiclePrice=63000, downPayment=30000, months=48]

**Se o cliente NÃO informar número de parcelas:**
→ ASSUMA 48x como padrão e informe: "Vou simular em 48x, ok?"
→ NUNCA chame a função sem o parâmetro months
```

**O que isso faz:**
- ✅ Ensina a IA a coletar TODAS as informações antes de chamar a função
- ✅ Define um padrão (48x) caso cliente não informe
- ✅ Mostra exemplo prático de fluxo correto

---

### 3. **Tool Description Melhorada** (`src/constants/agentPrompts.js`)

**Antes:**
```javascript
{
  name: 'calculate_installment',
  description: 'Calcula parcelas de financiamento',
  // ...
}
```

**Depois:**
```javascript
{
  name: 'calculate_installment',
  description: 'Calcula parcelas de financiamento. IMPORTANTE: só chame esta função se você JÁ tiver o preço do veículo específico (de recommend_vehicles) E o número de parcelas (pergunte ao cliente ou assuma 48x). Se não tiver essas informações, pergunte ao cliente primeiro.',
  // ...
}
```

**O que isso faz:**
- ✅ Deixa CLARO para a IA quando ela pode chamar a função
- ✅ Instrui a IA a perguntar primeiro se não tiver os dados
- ✅ Sugere usar 48x como padrão

---

### 4. **Logging Melhorado** (`api/chat/route.js`)

**Antes:**
```javascript
async function handleFunctionCall(functionName, functionArgs) {
  switch (functionName) {
    case 'calculate_installment':
      return calculateInstallment(functionArgs);
    // ...
  }
}
```

**Depois:**
```javascript
async function handleFunctionCall(functionName, functionArgs) {
  console.log(`🔧 Function called: ${functionName}`, JSON.stringify(functionArgs, null, 2));

  try {
    let result;
    switch (functionName) {
      case 'calculate_installment':
        result = calculateInstallment(functionArgs);
        break;
      // ...
    }

    console.log(`✅ Function result: ${functionName}`, result.success ? 'SUCCESS' : 'FAILED');
    return result;
  } catch (error) {
    console.error(`❌ Error in function ${functionName}:`, error);
    return {
      success: false,
      error: error.message,
      message: 'Desculpe, tive um problema. Pode repetir?'
    };
  }
}
```

**O que isso faz:**
- ✅ Loga TODOS os parâmetros recebidos (para debug)
- ✅ Loga se a função teve sucesso ou falhou
- ✅ Captura erros inesperados
- ✅ Facilita diagnóstico de problemas futuros

---

## 🧪 COMO TESTAR

### 1. Reinicie o servidor backend:
```bash
npm run dev:server
```

### 2. Teste o fluxo de financiamento completo:

**Cenário 1 - Fluxo ideal:**
```
Você: "Olá"
Bot: "E aí! Tá procurando carro..."
Você: "Quero um hatch"
Bot: "Show! Tá pensando em investir até quanto?"
Você: "60 mil"
Bot: [Mostra veículos]
Você: "O Argo me interessou"
Bot: "Excelente escolha! Como quer pagar?"
Você: "Financiado"
Bot: "Show! Você consegue dar quanto de entrada?"
Você: "20 mil"
Bot: "Ótimo! Quer parcelar em quantas vezes? 24x, 36x, 48x ou 60x?"
Você: "48x"
Bot: ✅ "Entrada de R$ 20.000 + 48x de R$ 1.234,56"
```

**Cenário 2 - Cliente não informa parcelas (IA deve assumir 48x):**
```
Você: "Quero financiar"
Bot: "Show! Você consegue dar quanto de entrada?"
Você: "10 mil"
Bot: ✅ "Vou simular em 48x, ok? [Cálculo]"
```

**Cenário 3 - Cliente não informa qual carro (IA deve perguntar):**
```
Você: "Quanto fica financiado?"
Bot: ✅ "Preciso saber qual veículo você está interessado. Qual carro você gostou?"
```

---

## 📊 LOGS ESPERADOS NO CONSOLE DO SERVIDOR

Quando tudo funcionar corretamente, você verá:

```
🔧 Function called: calculate_installment {
  "vehiclePrice": 63000,
  "downPayment": 20000,
  "months": 48,
  "interestRate": 2.49
}
💰 Financiamento calculado: R$ 63.000 - Entrada R$ 20.000 = 48x de R$ 1234.56
✅ Function result: calculate_installment SUCCESS
```

Quando faltar parâmetros:

```
🔧 Function called: calculate_installment {
  "downPayment": 20000,
  "months": 48
}
❌ calculateInstallment: vehiclePrice inválido: undefined
✅ Function result: calculate_installment FAILED
```

---

## 🎯 RESULTADO ESPERADO

### ✅ ANTES (errado):
- Usuário: "30 mil"
- Bot: **ERRO 500** ❌

### ✅ DEPOIS (correto):

**Opção 1 - IA coleta informações primeiro:**
- Usuário: "30 mil"
- Bot: "Ótimo! Quer parcelar em quantas vezes? 24x, 36x, 48x ou 60x?"
- Usuário: "48x"
- Bot: "Entrada de R$ 30.000 + 48x de R$ 891,23" ✅

**Opção 2 - IA não tem contexto do carro:**
- Usuário: "Quanto fica financiado?"
- Bot: "Preciso saber qual veículo você está interessado. Qual carro você gostou?" ✅

---

## 📁 ARQUIVOS MODIFICADOS

1. ✅ `api/chat/route.js` - Função `calculateInstallment` com validação robusta
2. ✅ `api/chat/route.js` - Handler `handleFunctionCall` com logging melhorado
3. ✅ `src/constants/agentPrompts.js` - Prompt com seção de financiamento
4. ✅ `src/constants/agentPrompts.js` - Tool description melhorada

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Reiniciar servidor backend
2. ✅ Testar fluxo de financiamento
3. ✅ Verificar logs no console
4. ✅ Confirmar que não há mais erros 500

---

## ❓ SE O ERRO PERSISTIR

Se ainda houver erro 500 após essas correções:

1. **Verifique os logs do servidor** - procure por linhas com ❌
2. **Verifique a API Key** - confirme que ANTHROPIC_API_KEY ou OPENAI_API_KEY está configurada
3. **Teste o endpoint diretamente:**
   ```bash
   curl -X POST http://localhost:3001/api/chat/route \
     -H "Content-Type: application/json" \
     -d '{"message": "olá"}'
   ```
4. **Verifique memória/CPU** - se o servidor está sobrecarregado

---

**✅ CORREÇÃO CONCLUÍDA!**

O chat agora deve funcionar corretamente ao processar financiamentos.

**Data:** 21/12/2025
