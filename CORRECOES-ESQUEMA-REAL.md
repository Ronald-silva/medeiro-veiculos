# ✅ CORREÇÕES - ESQUEMA REAL DA COMISSÃO

**Data:** 21 de Dezembro de 2025

---

## 🚨 CORREÇÃO IMPORTANTE REALIZADA

Havia um **mal-entendido** sobre o esquema de comissão. Agora está corrigido!

### ❌ ESQUEMA ERRADO (Anterior):
```
Venda de R$ 100.000
  ↓
Ronald recebe: R$ 97.000 (97%)
Adel recebe: R$ 3.000 (3%)
```

### ✅ ESQUEMA CORRETO (Atual):
```
Venda de R$ 100.000
  ↓
Medeiros (DONO) recebe: R$ 97.000 (97%)
  ↓
Comissão Total: R$ 3.000 (3%)
  ↓
Ronald + Adel DIVIDEM esses R$ 3.000
  - Ronald: R$ 1.500 (50%)
  - Adel: R$ 1.500 (50%)
```

---

## 📊 O QUE FOI CORRIGIDO

### 1. **Schema SQL** ✅

**Arquivo:** `supabase-schema-crm.sql`

**Mudanças na tabela `sales`:**

```sql
-- ANTES (ERRADO):
CREATE TABLE IF NOT EXISTS sales (
  ...
  commission_rate DECIMAL(5,2) DEFAULT 3.00,
  commission_value DECIMAL(10,2),
  commission_paid BOOLEAN DEFAULT FALSE,
  ...
);
```

```sql
-- AGORA (CORRETO):
CREATE TABLE IF NOT EXISTS sales (
  ...
  commission_rate DECIMAL(5,2) DEFAULT 3.00,
  commission_value DECIMAL(10,2),

  -- Divisão da comissão entre Ronald e Adel (flexível)
  ronald_split_percentage DECIMAL(5,2) DEFAULT 50.00,
  adel_split_percentage DECIMAL(5,2) DEFAULT 50.00,
  ronald_commission_value DECIMAL(10,2),
  adel_commission_value DECIMAL(10,2),

  -- Pagamento da comissão (separado)
  commission_paid BOOLEAN DEFAULT FALSE,
  ronald_paid BOOLEAN DEFAULT FALSE,
  adel_paid BOOLEAN DEFAULT FALSE,
  ...
);
```

**Trigger melhorado:**

```sql
CREATE OR REPLACE FUNCTION calculate_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcula comissão total
  NEW.commission_value = (NEW.sale_price * NEW.commission_rate / 100);

  -- Garante que os percentuais de divisão somam 100%
  IF (NEW.ronald_split_percentage + NEW.adel_split_percentage) != 100.00 THEN
    NEW.adel_split_percentage = 100.00 - NEW.ronald_split_percentage;
  END IF;

  -- Calcula quanto cada um recebe da comissão
  NEW.ronald_commission_value = (NEW.commission_value * NEW.ronald_split_percentage / 100);
  NEW.adel_commission_value = (NEW.commission_value * NEW.adel_split_percentage / 100);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**View `dashboard_metrics` atualizada:**

```sql
SELECT
  -- Valor que fica com Medeiros (dono)
  COALESCE(SUM(s.sale_price) - SUM(s.commission_value), 0) AS medeiros_recebe,

  -- Comissão Ronald
  COALESCE(SUM(s.ronald_commission_value), 0) AS ronald_comissao_total,
  COALESCE(SUM(CASE WHEN s.ronald_paid THEN s.ronald_commission_value ELSE 0 END), 0) AS ronald_comissao_paga,
  COALESCE(SUM(CASE WHEN NOT s.ronald_paid THEN s.ronald_commission_value ELSE 0 END), 0) AS ronald_comissao_pendente,

  -- Comissão Adel
  COALESCE(SUM(s.adel_commission_value), 0) AS adel_comissao_total,
  COALESCE(SUM(CASE WHEN s.adel_paid THEN s.adel_commission_value ELSE 0 END), 0) AS adel_comissao_paga,
  COALESCE(SUM(CASE WHEN NOT s.adel_paid THEN s.adel_commission_value ELSE 0 END), 0) AS adel_comissao_pendente
  ...
```

---

### 2. **Dashboard CRM** ✅

**Arquivo:** `src/pages/crm/Dashboard.jsx`

**Cards reorganizados:**

```
┌──────────────────────────────────────────┐
│ 🏪 Medeiros Recebe                       │
│    R$ 140.650,00                         │
│    Dono da loja (líquido)                │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 💰 Comissão Total                        │
│    R$ 4.350,00                           │
│    Ronald + Adel (1 vendas)              │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 💵 Ronald Recebe                         │
│    R$ 2.175,00                           │
│    Sua parte da comissão                 │
│    ✓ Pago: R$ 0                          │
│    ⏳ Pendente: R$ 2.175,00              │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 🤝 Adel Recebe                           │
│    R$ 2.175,00                           │
│    Parte do Adel da comissão             │
│    ✓ Pago: R$ 0                          │
│    ⏳ Pendente: R$ 2.175,00              │
└──────────────────────────────────────────┘
```

---

### 3. **Formulário de Vendas** ✅

**Arquivo:** `src/components/crm/SalesModal.jsx`

**Novo campo adicionado:**

```
┌─────────────────────────────────────────┐
│ 💼 Divisão da Comissão (Você + Adel)   │
│                                         │
│ Ronald (você) %: [50.00]                │
│ Adel %: [50.00]                         │
│                                         │
│ 💡 Você pode ajustar a divisão conforme│
│    seu acordo com o Adel para cada     │
│    venda                                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📊 Resumo Financeiro                    │
│                                         │
│ Valor da Venda: R$ 145.000,00           │
│ Comissão Total (3%): - R$ 4.350,00     │
│ ─────────────────────────────────       │
│ 🏪 Medeiros Recebe: R$ 140.650,00       │
│                                         │
│ Divisão da Comissão:                    │
│ 💵 Ronald (50%): R$ 2.175,00            │
│ 🤝 Adel (50%): R$ 2.175,00              │
└─────────────────────────────────────────┘
```

**Funcionalidades:**
- ✅ Ajuste dinâmico: quando você muda Ronald%, Adel% ajusta automaticamente para somar 100%
- ✅ Cálculo em tempo real de quanto cada um recebe
- ✅ Flexibilidade total por venda

---

## 🆕 NOVO: CATÁLOGO DE VEÍCULOS

### 4. **Página de Catálogo Completa** ✅

**Arquivo criado:** `src/pages/CatalogPage.jsx`

**Características:**
- ✅ Galeria com as 4 motos/carros disponíveis:
  - Toyota Hilux 2023 (9 fotos)
  - Honda HR-V Touring 2022 (16 fotos!)
  - Fiat Mobi 2021 (14 fotos)
  - Yamaha Fazer 250 2022 (12 fotos)

- ✅ Filtros funcionais:
  - Categoria (SUV, Hatch, Picape, Moto)
  - Preço (faixas pré-definidas)
  - Ano
  - Combustível
  - Busca por texto

- ✅ Modal de detalhes com:
  - Galeria de imagens navegável (setas esquerda/direita)
  - Thumbnails clicáveis
  - Especificações completas
  - Lista de características
  - Botão WhatsApp direto

**Arquivo de dados:** `src/data/carsInventory.js`

**Navegação:**
- Header desktop: link "Nossos Veículos"
- Header mobile: link no menu
- URL: `http://localhost:3000/catalogo`

---

## 🎯 EXEMPLO PRÁTICO DO ESQUEMA

### Cenário 1: Divisão 50/50 (Padrão)

```
Venda: Honda Civic R$ 145.000
Comissão: 3%

Cálculos:
  Comissão Total: R$ 145.000 × 3% = R$ 4.350,00
  Medeiros recebe: R$ 145.000 - R$ 4.350 = R$ 140.650,00

  Ronald (50%): R$ 4.350 × 50% = R$ 2.175,00
  Adel (50%): R$ 4.350 × 50% = R$ 2.175,00
```

### Cenário 2: Ronald 70% / Adel 30%

```
Venda: Hilux R$ 280.000
Comissão: 2% (carro premium, vende fácil)

Cálculos:
  Comissão Total: R$ 280.000 × 2% = R$ 5.600,00
  Medeiros recebe: R$ 280.000 - R$ 5.600 = R$ 274.400,00

  Ronald (70%): R$ 5.600 × 70% = R$ 3.920,00
  Adel (30%): R$ 5.600 × 30% = R$ 1.680,00
```

### Cenário 3: Ronald 30% / Adel 70%

```
Venda: HRV parado R$ 140.000
Comissão: 8% (carro parado, precisa sair)

Cálculos:
  Comissão Total: R$ 140.000 × 8% = R$ 11.200,00
  Medeiros recebe: R$ 140.000 - R$ 11.200 = R$ 128.800,00

  Ronald (30%): R$ 11.200 × 30% = R$ 3.360,00
  Adel (70%): R$ 11.200 × 70% = R$ 7.840,00
```

**Estratégia:** Adel leva mais porque vai precisar se esforçar mais para vender um carro parado!

---

## 💡 VANTAGENS DO NOVO SISTEMA

### 1. **Flexibilidade Total**
- ✅ Você e Adel podem negociar a divisão para CADA venda
- ✅ Carros difíceis = mais % pro Adel (incentivo)
- ✅ Carros fáceis = mais % pra você (lucro)

### 2. **Transparência**
- ✅ Dashboard mostra EXATAMENTE quanto cada um recebe
- ✅ Separação clara: Medeiros / Ronald / Adel
- ✅ Status de pagamento individual

### 3. **Controle de Pagamentos**
- ✅ Marcar Ronald como pago separadamente
- ✅ Marcar Adel como pago separadamente
- ✅ Histórico de quem recebeu o quê

### 4. **Catálogo Profissional**
- ✅ Site com cara de concessionária de verdade
- ✅ Clientes podem ver fotos reais dos carros
- ✅ Filtros facilitam a busca
- ✅ WhatsApp direto de cada carro

---

## 📋 CHECKLIST DE ATUALIZAÇÃO

### Para Atualizar o Sistema:

**1. Banco de Dados (OBRIGATÓRIO):**
```sql
-- Execute no Supabase SQL Editor:
1. supabase-LIMPAR-PRIMEIRO.sql
2. supabase-schema-crm.sql (ATUALIZADO)
```

**2. Não Precisa Fazer Mais Nada!**
- ✅ Código React já está atualizado
- ✅ Dashboard já mostra o esquema correto
- ✅ Formulário já tem divisão flexível
- ✅ Catálogo já está funcionando

**3. Testar:**
```
npm run dev

Acesse:
- Site: http://localhost:3000
- Catálogo: http://localhost:3000/catalogo
- CRM: http://localhost:3000/crm
```

---

## 🎨 CORES NO DASHBOARD

Para facilitar visualização:

- 🔵 **Azul** = Medeiros (dono da loja)
- 🟡 **Amarelo** = Comissão Total
- 🟢 **Verde** = Ronald (você)
- 🟣 **Roxo** = Adel (vendedor)

---

## 📁 ARQUIVOS MODIFICADOS

### SQL:
- ✅ `supabase-schema-crm.sql` - Schema corrigido com divisão

### React:
- ✅ `src/pages/crm/Dashboard.jsx` - Cards reorganizados
- ✅ `src/components/crm/SalesModal.jsx` - Campo de divisão adicionado
- ✅ `src/pages/CatalogPage.jsx` - **NOVO!** Catálogo completo
- ✅ `src/data/carsInventory.js` - **NOVO!** Dados dos carros
- ✅ `src/App.jsx` - Rota do catálogo adicionada
- ✅ `src/components/Header.jsx` - Link do catálogo adicionado

---

## 🚀 PRÓXIMOS PASSOS

1. **Execute os scripts SQL** (passo obrigatório!)
2. **Teste o catálogo** - veja se as imagens aparecem
3. **Teste uma venda no CRM** - experimente divisões diferentes:
   - 50/50
   - 70/30
   - 30/70
4. **Ajuste os dados dos carros** em `src/data/carsInventory.js` se necessário
5. **Combine com Adel** qual será a divisão padrão

---

## ❓ DÚVIDAS COMUNS

### "E se eu quiser mudar a divisão depois?"
Você pode! Basta editar a venda no CRM e ajustar os percentuais.

### "O Adel pode ver quanto eu recebo?"
Sim, no CRM ambos veem tudo. É transparente.

### "O dono Medeiros sabe dessa divisão?"
**NÃO!** Ele só vê que a comissão total é X% (3%, 5%, etc). A divisão entre você e Adel é privada.

### "Posso ter divisões diferentes por venda?"
**SIM!** Cada venda pode ter divisão diferente. Total flexibilidade.

### "As imagens do catálogo vão aparecer?"
Sim! Desde que as imagens estejam em `public/cars/` e o servidor esteja rodando.

---

**✅ SISTEMA CORRIGIDO E MELHORADO!**

**Data:** 21/12/2025
