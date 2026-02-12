/**
 * Transcrição de áudio do WhatsApp usando OpenAI Whisper
 *
 * Fluxo: Twilio envia MediaUrl → download com auth → Whisper transcreve → texto
 */
import logger from '../../src/lib/logger.js'

// Cliente OpenAI inicializado sob demanda (evita crash se key não está configurada)
let openai = null

/**
 * Baixa áudio do Twilio e transcreve com Whisper
 *
 * @param {string} mediaUrl - URL do áudio no Twilio
 * @param {string} mediaType - MIME type (ex: audio/ogg)
 * @returns {Promise<string|null>} Texto transcrito ou null se falhar
 */
export async function transcribeAudio(mediaUrl, mediaType) {
  if (!process.env.OPENAI_API_KEY) {
    logger.warn('[Audio] OpenAI API key not configured, cannot transcribe')
    return null
  }

  try {
    // Importa OpenAI sob demanda
    if (!openai) {
      const { default: OpenAI } = await import('openai')
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    }

    const hasTwilioCreds = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
    logger.info(`[Audio] Downloading audio from Twilio... URL: ${mediaUrl}, hasCreds: ${hasTwilioCreds}, type: ${mediaType}`)

    // Download do áudio com autenticação Twilio
    const fetchOptions = hasTwilioCreds ? {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64')
      }
    } : {}

    const response = await fetch(mediaUrl, fetchOptions)

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'no body')
      logger.error(`[Audio] Failed to download: status=${response.status}, statusText=${response.statusText}, body=${errorBody.substring(0, 200)}`)
      return null
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer())
    logger.info(`[Audio] Downloaded ${audioBuffer.length} bytes`)

    // Determina extensão do arquivo baseado no MIME type
    const ext = getExtension(mediaType)

    // Cria File object para a API do OpenAI
    const audioFile = new File([audioBuffer], `audio.${ext}`, { type: mediaType })

    // Transcreve com Whisper
    logger.info('[Audio] Transcribing with Whisper...')
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'pt'
    })

    const text = transcription.text?.trim()

    if (text) {
      logger.info(`[Audio] Transcribed: "${text.substring(0, 100)}..."`)
    } else {
      logger.warn('[Audio] Empty transcription')
    }

    return text || null
  } catch (error) {
    logger.error('[Audio] Transcription error:', error.message)
    return null
  }
}

/**
 * Retorna extensão do arquivo baseado no MIME type
 */
function getExtension(mimeType) {
  const map = {
    'audio/ogg': 'ogg',
    'audio/oga': 'ogg',
    'audio/opus': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/amr': 'amr'
  }
  return map[mimeType] || 'ogg'
}
