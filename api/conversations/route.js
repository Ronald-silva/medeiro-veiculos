// API Route: Histórico de Conversas da Camila
import { supabase, isSupabaseConfigured } from '../../src/lib/supabaseClient.js'
import logger from '../../src/lib/logger.js'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  try {
    const {
      limit = '20',
      offset = '0',
      status,
      withAppointment,
      conversationId,
      startDate,
      endDate
    } = req.query

    // Se conversationId foi fornecido, busca mensagens dessa conversa
    if (conversationId) {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        logger.error('Error fetching messages:', error)
        return res.status(500).json({ error: 'Failed to fetch messages' })
      }

      return res.status(200).json({
        success: true,
        messages: messages || []
      })
    }

    // Busca lista de conversas
    let query = supabase
      .from('conversations')
      .select(`
        id,
        whatsapp,
        channel,
        status,
        messages_count,
        user_messages_count,
        assistant_messages_count,
        resulted_in_appointment,
        resulted_in_sale,
        overall_sentiment,
        vehicle_interest,
        started_at,
        last_message_at,
        ended_at,
        leads (
          id,
          name,
          score
        )
      `)
      .order('last_message_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (withAppointment === 'true') {
      query = query.eq('resulted_in_appointment', true)
    } else if (withAppointment === 'false') {
      query = query.eq('resulted_in_appointment', false)
    }

    if (startDate) {
      query = query.gte('started_at', startDate)
    }

    if (endDate) {
      query = query.lte('started_at', endDate)
    }

    const { data: conversations, error, count } = await query

    if (error) {
      logger.error('Error fetching conversations:', error)
      return res.status(500).json({ error: 'Failed to fetch conversations' })
    }

    // Busca primeira e última mensagem de cada conversa
    const conversationsWithMessages = await Promise.all(
      (conversations || []).map(async (conv) => {
        // Primeira mensagem do usuário
        const { data: firstMsg } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', conv.id)
          .eq('role', 'user')
          .order('created_at', { ascending: true })
          .limit(1)
          .single()

        // Última mensagem
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, role')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return {
          ...conv,
          first_user_message: firstMsg?.content || null,
          last_message: lastMsg?.content || null,
          last_message_role: lastMsg?.role || null
        }
      })
    )

    return res.status(200).json({
      success: true,
      conversations: conversationsWithMessages,
      total: count
    })
  } catch (error) {
    logger.error('Error in conversations API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
