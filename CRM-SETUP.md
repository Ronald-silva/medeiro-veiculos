# 🚀 CONFIGURAÇÃO DO CRM - MEDEIROS VEÍCULOS

## ✅ O QUE JÁ ESTÁ PRONTO

1. **Sistema de Autenticação** - Login protegido com senha
2. **Dashboard Financeiro** - Visão clara de valores e comissões
3. **Módulo de Vendas** - Registro de vendas com cálculo automático
4. **Gestão de Leads** - Visualização e atualização de status
5. **Integração com Supabase** - Banco de dados configurado

## 📋 PRÓXIMOS PASSOS (FAÇA NESTA ORDEM!)

### Passo 1: Executar o Schema SQL no Supabase

1. Acesse o Supabase: https://supabase.com/dashboard
2. Selecione seu projeto: **mwnfujhxydrsjuwzodlh**
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **New Query**
5. Copie TODO o conteúdo do arquivo `supabase-schema-crm.sql`
6. Cole no editor SQL
7. Clique em **RUN** (canto inferior direito)
8. ✅ Aguarde a confirmação de sucesso!

### Passo 2: Alterar a Senha do CRM (IMPORTANTE!)

1. Abra o arquivo: `src/contexts/AuthContext.jsx`
2. Na linha 6, altere a senha:
   ```javascript
   const CRM_PASSWORD = 'medeiros2025' // ALTERE ESTA SENHA!
   ```
3. Escolha uma senha forte e compartilhe apenas com o Adel

### Passo 3: Testar o Sistema

1. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Acesse o CRM:
   ```
   http://localhost:5173/crm
   ```

3. Faça login com a senha que você definiu

4. Teste registrar uma venda para verificar se está funcionando

## 🎯 COMO USAR O CRM

### Acessar o CRM

- URL: `https://seusite.com/crm` (ou `/crm` em desenvolvimento)
- **IMPORTANTE**: Esta URL é SECRETA! Não compartilhe publicamente.
- Apenas você e Adel devem saber desta URL

### Registrar uma Venda

1. Clique em **"Nova Venda"**
2. Preencha:
   - Veículo vendido (ex: Toyota Hilux 2023)
   - Valor da venda (ex: R$ 150.000)
   - Cliente (opcional - pode vincular a um lead)
   - Data da venda
   - Forma de pagamento

3. **O sistema calcula AUTOMATICAMENTE**:
   - Comissão de 3% para o vendedor
   - Valor líquido que VOCÊ recebe
   - Exemplo:
     - Venda: R$ 150.000
     - Comissão (3%): R$ 4.500
     - **VOCÊ RECEBE: R$ 145.500**

### Dashboard - Entenda os Números

#### Card "Total Vendido"
- Soma de TODAS as vendas registradas
- Quantidade total de carros vendidos

#### Card "💰 Você Recebe" (AZUL - O MAIS IMPORTANTE!)
- Valor LÍQUIDO que você deve receber
- Já com a comissão do vendedor DESCONTADA
- Este é o valor real que entra no seu bolso

#### Card "Comissão (3%)"
- Total de comissão gerada
- **Pago**: Comissões já pagas ao vendedor
- **Pendente**: Comissões que ainda não foram pagas

#### Tabela de Vendas
- Lista TODAS as vendas
- Mostra claramente:
  - Valor da venda
  - Comissão
  - Quanto VOCÊ recebe
- Status: "Pago" ou "Pendente"

### Gerenciar Leads

1. Aba **"Leads"**
2. Filtre por status (Novo, Contatado, Qualificado, etc.)
3. Altere o status diretamente na tabela
4. Quando fechar venda, registre na aba "Vendas"

## 💡 EXEMPLOS PRÁTICOS

### Exemplo 1: Venda à Vista
- Veículo: Honda HRV 2022
- Valor: R$ 80.000
- Comissão: R$ 2.400 (3%)
- **Você recebe: R$ 77.600**

### Exemplo 2: Venda Financiada
- Veículo: Toyota Corolla 2021
- Valor: R$ 120.000
- Entrada: R$ 40.000
- Parcelas: 60x
- Comissão: R$ 3.600 (3%)
- **Você recebe: R$ 116.400**

## 🔒 SEGURANÇA

1. **Nunca compartilhe**:
   - A URL `/crm`
   - A senha de acesso
   - Apenas você e Adel devem ter acesso

2. **Altere a senha periodicamente**
   - A cada 3-6 meses
   - Se suspeitar de vazamento

3. **Backup dos dados**:
   - Supabase faz backup automático
   - Você pode exportar dados em SQL a qualquer momento

## 📊 RELATÓRIOS FINANCEIROS

O dashboard mostra automaticamente:
- ✅ Total vendido no período
- ✅ Total de comissão paga
- ✅ Total de comissão pendente
- ✅ **Valor líquido que você recebe**

### Para ver relatórios personalizados:
1. Acesse o Supabase
2. SQL Editor
3. Use as views prontas:

```sql
-- Ver métricas gerais
SELECT * FROM dashboard_metrics;

-- Ver funil de vendas (últimos 30 dias)
SELECT * FROM sales_funnel;

-- Ver agendamentos de hoje
SELECT * FROM todays_appointments;

-- Ver todas as vendas com cálculos
SELECT
  vehicle_name,
  sale_price,
  commission_value,
  (sale_price - commission_value) as valor_dono,
  commission_paid,
  sale_date
FROM sales
ORDER BY sale_date DESC;
```

## 🆘 SOLUÇÃO DE PROBLEMAS

### Erro ao fazer login
- Verifique se a senha está correta
- Limpe o cache do navegador (Ctrl + Shift + Delete)

### Erro ao registrar venda
- Verifique se executou o schema SQL no Supabase (Passo 1)
- Verifique se as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão corretas no .env.local

### Dashboard vazio
- Registre uma venda de teste
- Verifique o console do navegador (F12) para erros

## 📞 PRÓXIMAS MELHORIAS POSSÍVEIS

- [ ] Gráficos de vendas por período
- [ ] Exportar relatórios em PDF/Excel
- [ ] Notificações de novas vendas
- [ ] Integração com WhatsApp para avisar sobre leads
- [ ] Sistema de metas de vendas
- [ ] Histórico de atividades detalhado

---

**Desenvolvido com foco em clareza financeira e praticidade!**
