/**
 * Testes do Módulo Supervisor
 *
 * Execute: node tests/test-supervisor.js
 */

// Simula as funções do supervisor para teste
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

function pass(message) { console.log(`${colors.green}✅${colors.reset} ${message}`) }
function fail(message) { console.log(`${colors.red}❌${colors.reset} ${message}`) }
function info(message) { console.log(`${colors.blue}ℹ️${colors.reset} ${message}`) }

let passCount = 0
let failCount = 0

function test(name, fn) {
  try {
    fn()
    pass(name)
    passCount++
  } catch (error) {
    fail(`${name}: ${error.message}`)
    failCount++
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

// ============================================
// FUNÇÕES DO SUPERVISOR (COPIADAS PARA TESTE)
// ============================================

function parsePrice(priceStr) {
  if (!priceStr) return 0
  const cleaned = priceStr.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')
  const price = parseFloat(cleaned)
  if (price > 0 && price < 1000) return price * 1000
  return price || 0
}

function extractVehicleMentions(text) {
  const mentions = []
  const patterns = [
    /(?:tenho|temos|tem)\s+(?:uma?|o|a)?\s*([A-Za-zÀ-ÿ0-9\-\s]+?)\s+(?:por|de|a partir de)?\s*R\$\s*([\d.,]+)/gi,
    /R\$\s*([\d.,]+)[^\d]*?([A-Za-zÀ-ÿ0-9\-\s]{3,30})/gi,
    /([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ0-9]+)?)\s+(\d{4})\s*[-–]?\s*R\$\s*([\d.,]+)/gi
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1]?.trim().replace(/\s+/g, ' ')
      const priceStr = match[2] || match[3]
      const price = parsePrice(priceStr)
      if (name && name.length > 2 && price > 0) {
        mentions.push({ name, price })
      }
    }
  }
  return mentions
}

function validateResponseQuality(responseText) {
  const result = { isValid: true, errors: [], warnings: [] }

  if (responseText.length > 600) {
    result.warnings.push('Resposta muito longa (>600 caracteres)')
  }

  const questionMarks = (responseText.match(/\?/g) || []).length
  if (questionMarks > 2) {
    result.warnings.push(`Muitas perguntas na resposta (${questionMarks}). Ideal é 1 por vez.`)
  }

  if (/[1-3]\)|\d\.\s+\w+/g.test(responseText)) {
    result.warnings.push('Evitar listar opções numeradas (1, 2, 3)')
  }

  if (/não entendi|não compreendi|pode repetir/i.test(responseText)) {
    result.errors.push('Resposta contém "não entendi" - PROIBIDO')
    result.isValid = false
  }

  return result
}

// ============================================
// TESTES DE PARSE DE PREÇO
// ============================================

console.log('\n💰 TESTANDO PARSE DE PREÇO\n')

test('Parse "99.900" = 99900', () => {
  assert(parsePrice('99.900') === 99900, `Esperado 99900, obteve ${parsePrice('99.900')}`)
})

test('Parse "135.000" = 135000', () => {
  assert(parsePrice('135.000') === 135000, `Esperado 135000, obteve ${parsePrice('135.000')}`)
})

test('Parse "99 mil" = 99000', () => {
  assert(parsePrice('99') === 99000, `Esperado 99000, obteve ${parsePrice('99')}`)
})

test('Parse "115" (milhares) = 115000', () => {
  assert(parsePrice('115') === 115000, `Esperado 115000, obteve ${parsePrice('115')}`)
})

test('Parse "71.900,00" = 71900', () => {
  const result = parsePrice('71.900,00')
  assert(result === 71900, `Esperado 71900, obteve ${result}`)
})

// ============================================
// TESTES DE EXTRAÇÃO DE VEÍCULOS
// ============================================

console.log('\n🚗 TESTANDO EXTRAÇÃO DE VEÍCULOS\n')

test('Extrai "tenho uma L200 por R$ 99.900"', () => {
  const mentions = extractVehicleMentions('Olha, tenho uma L200 Triton por R$ 99.900 que é perfeita pra trabalho.')
  assert(mentions.length > 0, 'Nenhum veículo encontrado')
  info(`  → Encontrado: ${JSON.stringify(mentions[0])}`)
})

test('Extrai "Hilux SW4 por R$ 135.000"', () => {
  const mentions = extractVehicleMentions('Tenho a Hilux SW4 por R$ 135.000, é um SUV 7 lugares.')
  assert(mentions.length > 0, 'Nenhum veículo encontrado')
  const hilux = mentions.find(m => m.name.toLowerCase().includes('hilux'))
  assert(hilux, 'Hilux não encontrada')
  info(`  → Encontrado: ${JSON.stringify(hilux)}`)
})

test('Extrai múltiplos veículos', () => {
  const text = 'Tenho a Ranger por R$ 115.000 e também a L200 por R$ 99.900.'
  const mentions = extractVehicleMentions(text)
  assert(mentions.length >= 2, `Esperado 2+ veículos, encontrou ${mentions.length}`)
  info(`  → Encontrados: ${mentions.length} veículos`)
})

// ============================================
// TESTES DE VALIDAÇÃO DE QUALIDADE
// ============================================

console.log('\n📝 TESTANDO VALIDAÇÃO DE QUALIDADE\n')

test('Resposta curta é válida', () => {
  const result = validateResponseQuality('Oi! Tudo bem? O que te traz aqui hoje?')
  assert(result.isValid, 'Deveria ser válida')
  assert(result.errors.length === 0, 'Não deveria ter erros')
})

test('Detecta resposta muito longa', () => {
  const longText = 'a'.repeat(700)
  const result = validateResponseQuality(longText)
  assert(result.warnings.some(w => w.includes('longa')), 'Deveria avisar sobre tamanho')
})

test('Detecta múltiplas perguntas', () => {
  const text = 'Qual seu orçamento? Você prefere carro ou moto? Quando pretende comprar? É pra você?'
  const result = validateResponseQuality(text)
  assert(result.warnings.some(w => w.includes('perguntas')), 'Deveria avisar sobre perguntas')
})

test('Detecta "não entendi" como erro', () => {
  const result = validateResponseQuality('Desculpe, não entendi. Pode repetir?')
  assert(!result.isValid, 'Deveria ser inválida')
  assert(result.errors.some(e => e.includes('não entendi')), 'Deveria ter erro de "não entendi"')
})

test('Detecta lista numerada', () => {
  const text = 'Tenho as opções: 1) Hilux, 2) Ranger, 3) L200'
  const result = validateResponseQuality(text)
  assert(result.warnings.some(w => w.includes('numeradas')), 'Deveria avisar sobre lista')
})

test('Resposta ideal passa sem avisos', () => {
  const text = 'Olha, tenho a L200 Triton por R$ 99.900, perfeita pra trabalho. Quer agendar uma visita?'
  const result = validateResponseQuality(text)
  assert(result.isValid, 'Deveria ser válida')
  assert(result.warnings.length === 0, `Não deveria ter avisos: ${result.warnings.join(', ')}`)
})

// ============================================
// RESULTADO FINAL
// ============================================

console.log('\n' + '='.repeat(50))
console.log('📊 RESULTADO DOS TESTES DO SUPERVISOR')
console.log('='.repeat(50))
console.log(`\n  ✅ Passou: ${passCount}`)
console.log(`  ❌ Falhou: ${failCount}\n`)

if (failCount === 0) {
  console.log(colors.green + '🎉 TODOS OS TESTES DO SUPERVISOR PASSARAM!' + colors.reset)
} else {
  console.log(colors.red + `⚠️ ${failCount} TESTE(S) FALHARAM` + colors.reset)
}

console.log('')
process.exit(failCount > 0 ? 1 : 0)
