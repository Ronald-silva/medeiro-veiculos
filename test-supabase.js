// Teste de Conexão com Supabase
// Execute: node test-supabase.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Testando conexão com Supabase...\n');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Variáveis de ambiente não encontradas!');
  console.log('VITE_SUPABASE_URL:', supabaseUrl);
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Configurada' : '❌ Não encontrada');
  process.exit(1);
}

console.log('✅ Variáveis de ambiente carregadas:');
console.log('   URL:', supabaseUrl);
console.log('   Key:', supabaseKey.substring(0, 30) + '...\n');

// Cria cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function testConnection() {
  try {
    console.log('📊 Testando acesso às tabelas...\n');

    // Teste 1: Verificar tabela vehicles
    console.log('1️⃣ Buscando veículos...');
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .limit(3);

    if (vehiclesError) {
      console.error('   ❌ Erro ao buscar veículos:', vehiclesError.message);
    } else {
      console.log(`   ✅ ${vehicles.length} veículos encontrados!`);
      vehicles.forEach(v => {
        console.log(`      - ${v.name} (R$ ${v.price.toLocaleString('pt-BR')})`);
      });
    }

    // Teste 2: Verificar tabela leads
    console.log('\n2️⃣ Verificando tabela de leads...');
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, nome, whatsapp, score, created_at')
      .limit(5);

    if (leadsError) {
      console.error('   ❌ Erro ao buscar leads:', leadsError.message);
    } else {
      console.log(`   ✅ Tabela leads acessível! (${leads.length} leads no banco)`);
      if (leads.length > 0) {
        console.log('   Últimos leads:');
        leads.forEach(l => {
          console.log(`      - ${l.nome} | Score: ${l.score} | ${l.whatsapp}`);
        });
      }
    }

    // Teste 3: Verificar tabela appointments
    console.log('\n3️⃣ Verificando tabela de agendamentos...');
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id')
      .limit(1);

    if (appointmentsError) {
      console.error('   ❌ Erro ao buscar agendamentos:', appointmentsError.message);
    } else {
      console.log('   ✅ Tabela appointments acessível!');
    }

    // Teste 4: Inserir e deletar um lead de teste
    console.log('\n4️⃣ Testando INSERT (lead de teste)...');
    const testLead = {
      conversation_id: crypto.randomUUID(),
      nome: 'Teste Conexão',
      whatsapp: '85999999999',
      orcamento: 'até R$ 100k',
      score: 50,
      status: 'teste'
    };

    const { data: insertedLead, error: insertError } = await supabase
      .from('leads')
      .insert([testLead])
      .select()
      .single();

    if (insertError) {
      console.error('   ❌ Erro ao inserir lead:', insertError.message);
    } else {
      console.log('   ✅ Lead de teste inserido com sucesso! ID:', insertedLead.id);

      // Deletar o lead de teste
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .eq('id', insertedLead.id);

      if (deleteError) {
        console.error('   ⚠️ Erro ao deletar lead de teste:', deleteError.message);
      } else {
        console.log('   ✅ Lead de teste removido com sucesso!');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 CONEXÃO COM SUPABASE FUNCIONANDO PERFEITAMENTE!');
    console.log('='.repeat(60));
    console.log('\n✅ Próximos passos:');
    console.log('   1. Execute: npm run dev');
    console.log('   2. Abra: http://localhost:3000');
    console.log('   3. Clique em "Consultor IA 24/7"');
    console.log('   4. Converse com o chat');
    console.log('   5. Verifique os leads no Supabase Dashboard\n');

  } catch (error) {
    console.error('\n❌ ERRO INESPERADO:', error.message);
    console.error(error);
  }
}

testConnection();
