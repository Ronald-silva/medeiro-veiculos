/**
 * Testes de Validação do Sistema
 *
 * Execute: node tests/validate-system.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carrega variáveis de ambiente
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Configure SUPABASE_URL e SUPABASE_ANON_KEY no .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

function log(color, symbol, message) {
  console.log(`${colors[color]}${symbol}${colors.reset} ${message}`)
}

function pass(message) { log('green', '✅', message) }
function fail(message) { log('red', '❌', message) }
function warn(message) { log('yellow', '⚠️', message) }
function info(message) { log('blue', 'ℹ️', message) }

let passCount = 0
let failCount = 0

async function test(name, fn) {
  try {
    await fn()
    pass(name)
    passCount++
  } catch (error) {
    fail(`${name}: ${error.message}`)
    failCount++
  }
}

async function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

// ============================================
// TESTES DE ESTRUTURA DO BANCO
// ============================================

async function testDatabaseStructure() {
  console.log('\n📊 TESTANDO ESTRUTURA DO BANCO DE DADOS\n')

  // Teste 1: Tabela vehicles existe
  await test('Tabela "vehicles" existe', async () => {
    const { data, error } = await supabase.from('vehicles').select('id').limit(1)
    assert(!error, error?.message || 'Tabela não encontrada')
  })

  // Teste 2: Tabela supervision_logs existe
  await test('Tabela "supervision_logs" existe', async () => {
    const { data, error } = await supabase.from('supervision_logs').select('id').limit(1)
    assert(!error, error?.message || 'Tabela não encontrada')
  })

  // Teste 3: Tabela successful_conversations existe
  await test('Tabela "successful_conversations" existe', async () => {
    const { data, error } = await supabase.from('successful_conversations').select('id').limit(1)
    assert(!error, error?.message || 'Tabela não encontrada')
  })

  // Teste 4: Tabela conversations existe
  await test('Tabela "conversations" existe', async () => {
    const { data, error } = await supabase.from('conversations').select('id').limit(1)
    assert(!error, error?.message || 'Tabela não encontrada')
  })

  // Teste 5: Tabela leads existe
  await test('Tabela "leads" existe', async () => {
    const { data, error } = await supabase.from('leads').select('id').limit(1)
    assert(!error, error?.message || 'Tabela não encontrada')
  })

  // Teste 6: Tabela appointments existe
  await test('Tabela "appointments" existe', async () => {
    const { data, error } = await supabase.from('appointments').select('id').limit(1)
    assert(!error, error?.message || 'Tabela não encontrada')
  })
}

// ============================================
// TESTES DE VEÍCULOS (Leitura)
// ============================================

async function testVehiclesCRUD() {
  console.log('\n🚗 TESTANDO ACESSO A VEÍCULOS\n')

  // Teste 1: Listar veículos
  await test('Listar veículos disponíveis', async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'available')

    assert(!error, error?.message)
    assert(data.length > 0, 'Nenhum veículo disponível')
    info(`  → ${data.length} veículos disponíveis`)
  })

  // Teste 2: Verificar estrutura
  await test('Veículos têm campos obrigatórios', async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, name, price, status')
      .eq('status', 'available')
      .limit(1)
      .single()

    assert(!error, error?.message)
    assert(data.id, 'Veículo sem ID')
    assert(data.name, 'Veículo sem nome')
    assert(data.price > 0, 'Veículo sem preço válido')
    info(`  → Exemplo: ${data.name} - R$ ${data.price.toLocaleString('pt-BR')}`)
  })

  // Teste 3: Filtrar por preço
  await test('Filtro por preço funciona', async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('name, price')
      .eq('status', 'available')
      .lte('price', 100000)

    assert(!error, error?.message)
    info(`  → ${data.length} veículos até R$ 100.000`)
  })

  // Teste 4: Ordenação funciona
  await test('Ordenação por preço funciona', async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('name, price')
      .eq('status', 'available')
      .order('price', { ascending: true })
      .limit(3)

    assert(!error, error?.message)
    if (data.length > 0) {
      info(`  → Mais barato: ${data[0].name} - R$ ${data[0].price.toLocaleString('pt-BR')}`)
    }
  })
}

// ============================================
// TESTES DO SUPERVISOR
// ============================================

async function testSupervisor() {
  console.log('\n🛡️ TESTANDO SISTEMA DE SUPERVISÃO\n')

  let testLogId = null

  // Teste 1: Inserir log de supervisão
  await test('Inserir log de supervisão', async () => {
    const { data, error } = await supabase
      .from('supervision_logs')
      .insert({
        conversation_id: 'test_' + Date.now(),
        response_text: 'Esta é uma resposta de teste para validar o sistema de supervisão.',
        is_valid: true,
        errors: [],
        warnings: ['Aviso de teste']
      })
      .select()
      .single()

    assert(!error, error?.message)
    assert(data?.id, 'Log não retornou ID')
    testLogId = data.id
    info(`  → Criado log ID: ${testLogId}`)
  })

  // Teste 2: Inserir log com erro
  await test('Inserir log com erro', async () => {
    const { data, error } = await supabase
      .from('supervision_logs')
      .insert({
        conversation_id: 'test_error_' + Date.now(),
        response_text: 'Resposta com erro de preço.',
        is_valid: false,
        errors: ['Preço incorreto: mencionado R$ 100.000, correto é R$ 95.000'],
        warnings: []
      })
      .select()
      .single()

    assert(!error, error?.message)
    assert(data.is_valid === false, 'is_valid deveria ser false')
  })

  // Teste 3: Consultar métricas de supervisão
  await test('Consultar view supervision_metrics', async () => {
    const { data, error } = await supabase
      .from('supervision_metrics')
      .select('*')
      .limit(7)

    // View pode não ter dados ainda, mas não deve dar erro
    if (error && !error.message.includes('does not exist')) {
      throw error
    }

    info(`  → ${data?.length || 0} dias com métricas`)
  })

  // Limpeza
  if (testLogId) {
    await supabase.from('supervision_logs').delete().eq('id', testLogId)
  }
}

// ============================================
// TESTES DO SISTEMA DE APRENDIZADO
// ============================================

async function testLearningSystem() {
  console.log('\n🧠 TESTANDO SISTEMA DE APRENDIZADO\n')

  // Teste 1: Estrutura da tabela successful_conversations
  await test('Estrutura tabela successful_conversations', async () => {
    const { data, error } = await supabase
      .from('successful_conversations')
      .select('id, conversation_summary, customer_segment, vehicle_type, budget_range, winning_strategy, conversion_type')
      .limit(1)

    assert(!error, error?.message)
    info(`  → ${data.length} conversas bem-sucedidas registradas`)
  })

  // Teste 2: Inserir conversa de teste
  await test('Inserir conversa de aprendizado', async () => {
    const { data, error } = await supabase
      .from('successful_conversations')
      .insert({
        conversation_summary: 'Cliente interessado em picape para trabalho, fechou agendamento',
        customer_segment: 'trabalhador_rural',
        vehicle_type: 'picape',
        budget_range: '100k-150k',
        winning_strategy: 'foco_em_durabilidade',
        conversion_type: 'appointment',
        total_messages: 8,
        messages_sample: [
          { role: 'user', content: 'Preciso de uma picape pra trabalho' },
          { role: 'assistant', content: 'Ótimo! Tenho algumas opções robustas...' }
        ]
      })
      .select()
      .single()

    assert(!error, error?.message)
    assert(data?.id, 'Conversa não retornou ID')

    // Limpa teste
    await supabase.from('successful_conversations').delete().eq('id', data.id)
  })

  // Teste 3: View learning_metrics
  await test('Consultar view learning_metrics', async () => {
    const { data, error } = await supabase
      .from('learning_metrics')
      .select('*')
      .limit(10)

    // View pode não ter dados ainda
    if (error && !error.message.includes('does not exist')) {
      throw error
    }

    info(`  → ${data?.length || 0} estratégias registradas`)
  })
}

// ============================================
// TESTES DE INTEGRAÇÃO
// ============================================

async function testIntegration() {
  console.log('\n🔗 TESTANDO INTEGRAÇÕES\n')

  // Teste 1: Veículos disponíveis têm todos os campos necessários
  await test('Veículos têm campos obrigatórios', async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, name, price, status')
      .eq('status', 'available')
      .limit(5)

    assert(!error, error?.message)
    assert(data && data.length > 0, 'Nenhum veículo retornado')

    for (const vehicle of data) {
      assert(vehicle.name, `Veículo ${vehicle.id} sem nome`)
      assert(vehicle.price > 0, `Veículo ${vehicle.id} sem preço válido`)
    }

    info(`  → ${data.length} veículos validados`)
  })

  // Teste 2: Verificar se há veículos no catálogo
  await test('Catálogo tem veículos', async () => {
    const { data, error, count } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact' })
      .eq('status', 'available')

    assert(!error, error?.message)
    assert(count > 0, 'Nenhum veículo disponível no catálogo!')
    info(`  → ${count} veículos no catálogo`)
  })
}

// ============================================
// EXECUÇÃO DOS TESTES
// ============================================

async function runAllTests() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 VALIDAÇÃO COMPLETA DO SISTEMA MEDEIROS VEÍCULOS')
  console.log('='.repeat(60))

  const startTime = Date.now()

  try {
    await testDatabaseStructure()
    await testVehiclesCRUD()
    await testSupervisor()
    await testLearningSystem()
    await testIntegration()
  } catch (error) {
    fail(`Erro fatal: ${error.message}`)
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)

  console.log('\n' + '='.repeat(60))
  console.log('📊 RESULTADO FINAL')
  console.log('='.repeat(60))
  console.log(`\n  ✅ Passou: ${passCount}`)
  console.log(`  ❌ Falhou: ${failCount}`)
  console.log(`  ⏱️ Tempo: ${duration}s\n`)

  if (failCount === 0) {
    console.log(colors.green + '🎉 TODOS OS TESTES PASSARAM!' + colors.reset)
  } else {
    console.log(colors.red + `⚠️ ${failCount} TESTE(S) FALHARAM` + colors.reset)
  }

  console.log('')
  process.exit(failCount > 0 ? 1 : 0)
}

runAllTests()
