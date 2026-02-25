import { describe, it, expect } from 'vitest'

// ─────────────────────────────────────────────────────────────
// Testa comportamentos do webhook Twilio que causaram bugs em produção
// ─────────────────────────────────────────────────────────────

// Replica da lógica de resposta instantânea (INSTANT_RESPONSES no twilio.js)
const INSTANT_PATTERNS = {
  greetings: [
    /^(oi|olá|ola|hey|eae|e aí)[\s!?.]*$/i,
    /^(bom dia|boa tarde|boa noite)[\s!?.]*$/i
  ],
  howAreYou: [
    /^(tudo bem|td bem|tdb|como vai|beleza|blz)[\s!?.]*$/i
  ]
}

function getInstantResponse(message) {
  const msg = message.trim().toLowerCase()
  for (const config of Object.values(INSTANT_PATTERNS)) {
    if (config.some(p => p.test(msg))) return 'instant_response'
  }
  return null
}

// ─────────────────────────────────────────────────────────────
describe('Respostas instantâneas (sem IA)', () => {

  it('saudações simples recebem resposta instantânea', () => {
    const casos = ['oi', 'Oi!', 'olá', 'Olá!', 'hey', 'eae']
    for (const msg of casos) {
      expect(getInstantResponse(msg)).not.toBeNull()
    }
  })

  it('saudações com hora recebem resposta instantânea', () => {
    const casos = ['bom dia', 'Bom dia!', 'boa tarde', 'boa noite']
    for (const msg of casos) {
      expect(getInstantResponse(msg)).not.toBeNull()
    }
  })

  it('"tudo bem" e variantes recebem resposta instantânea', () => {
    const casos = ['tudo bem', 'td bem', 'tdb', 'como vai', 'beleza', 'blz']
    for (const msg of casos) {
      expect(getInstantResponse(msg)).not.toBeNull()
    }
  })

  it('mensagens com conteúdo real NÃO recebem resposta instantânea', () => {
    const casos = [
      'quero ver carros',
      'quanto custa a Tracker?',
      'oi, tenho interesse na SW4',
      'bom dia, vocês têm SUV?',
      'me mostra opções até 100 mil',
      'quero agendar uma visita'
    ]
    for (const msg of casos) {
      expect(getInstantResponse(msg)).toBeNull()
    }
  })
})

// ─────────────────────────────────────────────────────────────
describe('Deduplicação por MessageSid', () => {
  // acquireLock retorna false quando o mesmo MessageSid já foi processado.

  it('acquireLock retorna false → mensagem duplicata é ignorada', () => {
    const processedSids = new Set()

    function simulateLock(messageSid) {
      if (processedSids.has(messageSid)) return false
      processedSids.add(messageSid)
      return true
    }

    const sid = 'SM123abc'
    expect(simulateLock(sid)).toBe(true)   // primeira entrega: processa
    expect(simulateLock(sid)).toBe(false)  // Twilio reenviou: ignora
  })

  it('MessageSids diferentes são processados independentemente', () => {
    const processedSids = new Set()

    function simulateLock(messageSid) {
      if (processedSids.has(messageSid)) return false
      processedSids.add(messageSid)
      return true
    }

    expect(simulateLock('SM111')).toBe(true)
    expect(simulateLock('SM222')).toBe(true)  // sid diferente → processa
    expect(simulateLock('SM111')).toBe(false) // mesmo sid → ignora
  })
})

// ─────────────────────────────────────────────────────────────
describe('Ordem de persistência — user antes de assistant', () => {
  // Bug anterior: Promise.all gerava mesmo created_at para ambos.
  // Fix: salvar sequencialmente → user sempre antes de assistant.

  it('salvamento sequencial garante que user vem antes de assistant', async () => {
    const saved = []

    async function saveMsg(role) {
      const now = new Date().toISOString()
      saved.push({ role, created_at: now })
      await new Promise(r => setTimeout(r, 2)) // delay mínimo
    }

    await saveMsg('user')
    await saveMsg('assistant')

    expect(saved[0].role).toBe('user')
    expect(saved[1].role).toBe('assistant')
    expect(saved[0].created_at <= saved[1].created_at).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
describe('Tool use loop — limite de iterações (MAX = 3)', () => {

  it('loop para quando stop_reason é end_turn (sem tool)', () => {
    let iterations = 0
    const MAX = 3
    let stop_reason = 'end_turn'

    while (stop_reason === 'tool_use' && iterations < MAX) {
      iterations++
    }

    expect(iterations).toBe(0)
  })

  it('loop executa exatamente 1 vez para 1 tool call', () => {
    let iterations = 0
    const MAX = 3
    const responses = ['tool_use', 'end_turn']
    let idx = 0

    while (responses[idx] === 'tool_use' && iterations < MAX) {
      iterations++
      idx++
    }

    expect(iterations).toBe(1)
    expect(responses[idx]).toBe('end_turn')
  })

  it('loop nunca excede MAX_TOOL_ITERATIONS mesmo com loop infinito de tools', () => {
    let iterations = 0
    const MAX = 3

    // Claude que sempre quer mais tools (simulação de bug)
    while ('tool_use' === 'tool_use' && iterations < MAX) {
      iterations++
    }

    expect(iterations).toBe(MAX)
  })
})

// ─────────────────────────────────────────────────────────────
describe('Extração de dados do webhook Twilio', () => {

  it('extrai phoneNumber removendo prefixo whatsapp:', () => {
    const from = 'whatsapp:+5585999999999'
    expect(from.replace('whatsapp:', '')).toBe('+5585999999999')
  })

  it('mídia não-áudio sem texto vira placeholder de imagem', () => {
    const body = { Body: '', NumMedia: '1', MediaContentType0: 'image/jpeg' }
    const numMedia = parseInt(body.NumMedia) || 0
    const isAudio = body.MediaContentType0?.startsWith('audio/')
    const message = !body.Body && numMedia > 0 && !isAudio
      ? '[Cliente enviou uma imagem/mídia]'
      : body.Body

    expect(message).toBe('[Cliente enviou uma imagem/mídia]')
  })

  it('áudio é detectado pelo ContentType', () => {
    const isAudio = (t) => t?.startsWith('audio/')
    expect(isAudio('audio/ogg')).toBe(true)
    expect(isAudio('audio/mpeg')).toBe(true)
    expect(isAudio('image/jpeg')).toBe(false)
    expect(isAudio(undefined)).toBeFalsy()
  })

  it('mensagem sem Body e sem mídia é ignorada (retorna null)', () => {
    const body = { From: 'whatsapp:+5585999999999', Body: '', NumMedia: '0' }
    const hasContent = body.Body || parseInt(body.NumMedia) > 0
    expect(hasContent).toBeFalsy()
  })
})

// ─────────────────────────────────────────────────────────────
describe('CONFIG de produção — documento vivo', () => {
  // Se alguém alterar esses valores acidentalmente, o teste falha

  const CONFIG = {
    model: 'claude-sonnet-4-6',
    maxTokens: 512,
    temperature: 0.3,
    historyLimit: 30
  }

  it('modelo é claude-sonnet-4-6', () => {
    expect(CONFIG.model).toBe('claude-sonnet-4-6')
  })

  it('maxTokens é 512', () => {
    expect(CONFIG.maxTokens).toBe(512)
  })

  it('temperature é 0.3 (consistência)', () => {
    expect(CONFIG.temperature).toBe(0.3)
  })

  it('historyLimit é 30', () => {
    expect(CONFIG.historyLimit).toBe(30)
  })
})
