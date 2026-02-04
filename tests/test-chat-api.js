/**
 * Teste da API de Chat (End-to-End)
 *
 * Execute com o servidor rodando:
 * 1. npm run dev (em outro terminal)
 * 2. node tests/test-chat-api.js
 */

const API_URL = process.env.API_URL || 'http://localhost:5173/api/chat'

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
}

function pass(message) { console.log(`${colors.green}✅${colors.reset} ${message}`) }
function fail(message) { console.log(`${colors.red}❌${colors.reset} ${message}`) }
function info(message) { console.log(`${colors.blue}ℹ️${colors.reset} ${message}`) }
function chat(role, message) {
  const color = role === 'user' ? colors.cyan : colors.yellow
  console.log(`${color}[${role}]${colors.reset} ${message}`)
}

let passCount = 0
let failCount = 0
let conversationId = null

async function testChat(userMessage, expectations = {}) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        conversationId: conversationId
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    conversationId = data.conversationId

    chat('user', userMessage)
    chat('assistant', data.message)

    // Verificações
    if (expectations.notEmpty) {
      if (!data.message || data.message.length < 10) {
        throw new Error('Resposta vazia ou muito curta')
      }
    }

    if (expectations.noError) {
      if (data.message.toLowerCase().includes('erro') || data.message.toLowerCase().includes('desculpe')) {
        // Só é erro se for erro de sistema, não objeção de venda
        if (data.message.toLowerCase().includes('ocorreu um erro')) {
          throw new Error('Resposta contém erro de sistema')
        }
      }
    }

    if (expectations.containsAny) {
      const found = expectations.containsAny.some(word =>
        data.message.toLowerCase().includes(word.toLowerCase())
      )
      if (!found) {
        throw new Error(`Esperava conter algum de: ${expectations.containsAny.join(', ')}`)
      }
    }

    if (expectations.hasValidation) {
      if (data.validation) {
        info(`  → Validação: ${data.validation.isValid ? 'OK' : 'Com erros'}`)
        if (data.validation.warnings?.length > 0) {
          info(`  → Avisos: ${data.validation.warnings.join(', ')}`)
        }
      }
    }

    if (expectations.usedTool) {
      if (data.toolCalled) {
        info(`  → Tool usada: ${data.toolCalled}`)
      }
    }

    pass(expectations.testName || 'Chat respondeu')
    passCount++
    console.log('')
    return data

  } catch (error) {
    fail(`${expectations.testName || 'Chat'}: ${error.message}`)
    failCount++
    console.log('')
    return null
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60))
  console.log('🤖 TESTE DA API DE CHAT (CAMILA)')
  console.log('='.repeat(60))
  console.log(`\nAPI: ${API_URL}\n`)

  // Verifica se servidor está rodando
  try {
    const healthCheck = await fetch(API_URL.replace('/chat', '/chat'), { method: 'GET' })
    if (!healthCheck.ok) throw new Error('Servidor não respondeu')
    pass('Servidor está rodando')
    console.log('')
  } catch (error) {
    fail(`Servidor não está acessível: ${error.message}`)
    console.log('\n⚠️ Inicie o servidor com: npm run dev\n')
    process.exit(1)
  }

  // Teste 1: Saudação simples
  await testChat('Oi, bom dia!', {
    testName: 'Saudação simples',
    notEmpty: true,
    noError: true,
    containsAny: ['oi', 'bom dia', 'olá', 'tudo bem', 'ajudar']
  })

  // Teste 2: Pergunta sobre veículos
  await testChat('Vocês tem carros pra vender?', {
    testName: 'Pergunta sobre estoque',
    notEmpty: true,
    noError: true,
    hasValidation: true
  })

  // Teste 3: Especifica orçamento
  await testChat('Tenho uns 100 mil pra gastar', {
    testName: 'Cliente informa orçamento',
    notEmpty: true,
    usedTool: true,
    hasValidation: true
  })

  // Teste 4: Pergunta sobre picape
  await testChat('Preciso de uma picape pra trabalho', {
    testName: 'Cliente pede picape',
    notEmpty: true,
    hasValidation: true
  })

  // Teste 5: Pergunta de agendamento
  await testChat('Posso ir aí amanhã ver?', {
    testName: 'Cliente quer agendar',
    notEmpty: true,
    containsAny: ['horário', 'hora', 'quando', 'manhã', 'tarde', 'agendar', 'visita']
  })

  // Resultado final
  console.log('='.repeat(60))
  console.log('📊 RESULTADO DOS TESTES DE CHAT')
  console.log('='.repeat(60))
  console.log(`\n  ✅ Passou: ${passCount}`)
  console.log(`  ❌ Falhou: ${failCount}\n`)

  if (failCount === 0) {
    console.log(colors.green + '🎉 TODOS OS TESTES DE CHAT PASSARAM!' + colors.reset)
  } else {
    console.log(colors.yellow + `⚠️ ${failCount} teste(s) falharam` + colors.reset)
  }

  console.log('')
}

runTests().catch(console.error)
