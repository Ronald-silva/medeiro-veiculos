# 🚗 Medeiros Veículos - Sistema Completo

Sistema integrado de vendas com Landing Page de alta conversão, Chat IA e CRM profissional.

---

## 🎯 RONALD, COMECE AQUI!

### ⭐ Sistema 100% Pronto para Produção

O sistema está completo e funcional. Para colocar em produção:

**📖 LEIA PRIMEIRO:** [docs/INICIAR-SISTEMA.md](docs/INICIAR-SISTEMA.md)

Este guia contém o checklist completo para:
- Configurar o banco de dados Supabase
- Alterar credenciais de acesso
- Iniciar o sistema localmente
- Fazer deploy em produção
- Testar todas as funcionalidades
- Treinar o Adel
- Apresentar para o dono

---

## 🚀 Quick Start

### Site Público + Chat IA
```bash
npm install
npm run dev
```
Acesse: http://localhost:3000

### CRM (Área Administrativa)
Acesse: http://localhost:3000/crm

**Credenciais padrão:**
- Usuário: `admin`
- Senha: `medeiros2025` ⚠️ **ALTERE após primeiro acesso!**

---

## ✨ Funcionalidades

### 🌐 Site Público
- ✅ Landing page otimizada para conversão
- ✅ Catálogo de veículos com fotos e detalhes
- ✅ Chat IA inteligente (WhatsApp integrado)
- ✅ Agendamento automático de visitas
- ✅ Captura de leads qualificados
- ✅ Design responsivo profissional

### 💼 CRM Completo
- ✅ Dashboard com métricas financeiras em tempo real
- ✅ Gestão de vendas e comissões
- ✅ Controle de leads e follow-up
- ✅ Gestão de agendamentos
- ✅ Relatório executivo para o dono
- ✅ Sistema de comissão fixa (R$ 300/venda)
- ✅ Multi-usuário (Ronald + Adel)

### 🤖 Chat IA Especializado
- ✅ Atendimento 24/7 via WhatsApp
- ✅ Consultor virtual treinado em veículos
- ✅ Agendamento inteligente de visitas
- ✅ Qualificação automática de leads
- ✅ Transferência para vendedor humano

---

## 📂 Estrutura do Projeto

```
medeiros-veiculos/
├── src/
│   ├── components/         # Componentes React
│   │   ├── crm/           # Componentes do CRM
│   │   │   └── dashboard/ # Dashboard refatorado
│   │   ├── conversion/    # Chatbot IA
│   │   └── ...
│   ├── pages/             # Páginas principais
│   │   └── crm/          # Páginas do CRM
│   ├── lib/              # Integrações (Supabase, OpenAI)
│   ├── utils/            # Funções utilitárias
│   ├── data/             # Inventário de veículos
│   └── constants/        # Prompts da IA
├── public/               # Assets estáticos
│   └── cars/            # Fotos dos veículos
├── docs/                # 📚 Documentação completa
├── database/            # 🗄️ Scripts SQL
└── README.md            # Você está aqui
```

---

## 📚 Documentação Completa

### Para Você (Ronald)
- **[INICIAR-SISTEMA.md](docs/INICIAR-SISTEMA.md)** ⭐ - Checklist de setup (COMECE AQUI!)
- **[STATUS-SISTEMA.md](docs/STATUS-SISTEMA.md)** - Visão geral do que foi entregue
- **[FLUXO-DO-SISTEMA.md](docs/FLUXO-DO-SISTEMA.md)** - Diagramas visuais dos fluxos
- **[RONALD-LEIA-AQUI.md](docs/RONALD-LEIA-AQUI.md)** - Guia operacional diário
- **[CRM-SETUP.md](docs/CRM-SETUP.md)** - Setup técnico do CRM

### Para o Adel (Vendedor)
- **[PROCESSO-DE-VENDAS-ADEL.md](docs/PROCESSO-DE-VENDAS-ADEL.md)** - Guia completo para vendedor

### Para Mostrar ao Dono
- **[COMO-MOSTRAR-PRO-DONO.md](docs/COMO-MOSTRAR-PRO-DONO.md)** - Script de apresentação

### Técnicos
- **[SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)** - Configuração do banco de dados
- **[EXECUTE-AQUI.md](docs/EXECUTE-AQUI.md)** - Comandos SQL essenciais
- **[VERCEL-DEPLOYMENT-CHECKLIST.md](docs/VERCEL-DEPLOYMENT-CHECKLIST.md)** - Deploy em produção
- **[LIMITACOES-VERCEL-FREE.md](docs/LIMITACOES-VERCEL-FREE.md)** - Limitações do plano free

### Database
- **[supabase-schema-crm.sql](database/supabase-schema-crm.sql)** - Schema completo do banco
- **[supabase-LIMPAR-PRIMEIRO.sql](database/supabase-LIMPAR-PRIMEIRO.sql)** - Limpeza antes de criar

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 18 + Vite
- **Estilização:** TailwindCSS
- **Backend:** Supabase (PostgreSQL)
- **IA:** OpenAI GPT-4
- **Deploy:** Vercel / Render
- **Comunicação:** WhatsApp Business API

---

## 📊 Modelo de Negócio

### Comissão por Venda
- **R$ 300,00 fixos** por venda (fase de validação)
- Divisão configurável entre Ronald e Adel
- Padrão: 100% Ronald / 0% Adel
- Ajustável por venda no CRM

### Fluxo de Receita
```
Venda de R$ 50.000
├─ Medeiros (Dono): R$ 49.700
└─ Comissão CRM:    R$ 300
   ├─ Ronald: R$ 300 (100%)
   └─ Adel:   R$ 0   (0%)
```

---

## 🎯 Próximos Passos

1. **Agora:** Abra [docs/INICIAR-SISTEMA.md](docs/INICIAR-SISTEMA.md)
2. Configure o banco de dados
3. Altere as credenciais
4. Teste o sistema completo
5. Faça deploy em produção
6. Treine o Adel
7. Apresente ao dono

---

## 📞 Informações da Loja

**Medeiros Veículos**
📍 Av. Américo Barreira, 909 - Loja 03, Demócrito Rocha, Fortaleza/CE
📱 WhatsApp: (85) 98885-2900
🕐 Seg-Sex: 8h às 17h | Sáb: 8h às 13h | Dom: Fechado

---

## 📝 Licença

Projeto proprietário desenvolvido para Medeiros Veículos.

---

**Desenvolvido com ❤️ para revolucionar as vendas da Medeiros Veículos**
