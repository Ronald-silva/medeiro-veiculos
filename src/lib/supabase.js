import { createClient } from '@supabase/supabase-js'

// Compatível com Vite (frontend) e Node.js (servidor)
const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_SUPABASE_URL
  : process.env.VITE_SUPABASE_URL
const supabaseAnonKey = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variáveis do Supabase não configuradas. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

// Funções auxiliares para o CRM

// LEADS
export async function getLeads(filters = {}) {
  let query = supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function updateLeadStatus(leadId, status, notes = '') {
  const { data, error } = await supabase
    .from('leads')
    .update({
      status,
      last_contact_at: new Date().toISOString(),
      notes: notes || undefined
    })
    .eq('id', leadId)
    .select()

  if (error) throw error
  return data[0]
}

// VENDAS
export async function getSales(filters = {}) {
  let query = supabase
    .from('sales')
    .select(`
      *,
      lead:leads(name, whatsapp, email)
    `)
    .order('sale_date', { ascending: false })

  if (filters.startDate) {
    query = query.gte('sale_date', filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte('sale_date', filters.endDate)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createSale(saleData) {
  // Remove campos vazios antes de inserir
  const cleanData = { ...saleData }
  if (!cleanData.lead_id || cleanData.lead_id === '') {
    delete cleanData.lead_id
  }

  const { data, error } = await supabase
    .from('sales')
    .insert([cleanData])
    .select()

  if (error) throw error

  // Atualiza o status do lead para 'fechado'
  if (saleData.lead_id && saleData.lead_id !== '') {
    await updateLeadStatus(saleData.lead_id, 'fechado')
  }

  return data[0]
}

export async function markCommissionAsPaid(saleId) {
  const { data, error } = await supabase
    .from('sales')
    .update({
      commission_paid: true,
      commission_paid_at: new Date().toISOString()
    })
    .eq('id', saleId)
    .select()

  if (error) throw error
  return data[0]
}

// DASHBOARD METRICS
export async function getDashboardMetrics() {
  const { data, error } = await supabase
    .from('dashboard_metrics')
    .select('*')
    .single()

  if (error) throw error
  return data
}

// SALES FUNNEL
export async function getSalesFunnel() {
  const { data, error } = await supabase
    .from('sales_funnel')
    .select('*')

  if (error) throw error
  return data
}

// AGENDAMENTOS
export async function getTodaysAppointments() {
  const { data, error } = await supabase
    .from('todays_appointments')
    .select('*')

  if (error) throw error
  return data
}

export async function getAppointments(filters = {}) {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      lead:leads(name, whatsapp, budget_text)
    `)
    .order('scheduled_date', { ascending: false })
    .order('scheduled_time', { ascending: true })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.startDate) {
    query = query.gte('scheduled_date', filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte('scheduled_date', filters.endDate)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function updateAppointmentStatus(appointmentId, status, notes = '') {
  const updateData = {
    status,
    updated_at: new Date().toISOString()
  }

  if (notes) {
    updateData.seller_notes = notes
  }

  if (status === 'compareceu') {
    updateData.attended_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('appointments')
    .update(updateData)
    .eq('id', appointmentId)
    .select()

  if (error) throw error

  // Se compareceu, atualizar status do lead para 'visitou'
  if (status === 'compareceu' && data[0]?.lead_id) {
    await updateLeadStatus(data[0].lead_id, 'visitou', notes)
  }

  return data[0]
}

export async function deleteAppointment(appointmentId) {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', appointmentId)

  if (error) throw error
  return true
}

// VEÍCULOS (Catálogo)
export async function getVehicles(filters = {}) {
  let query = supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.type) {
    query = query.eq('type', filters.type)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getAvailableVehicles() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'available')
    .order('price', { ascending: true })

  if (error) throw error
  return data
}

export async function createVehicle(vehicleData) {
  const { data, error } = await supabase
    .from('vehicles')
    .insert([{
      ...vehicleData,
      status: vehicleData.status || 'available',
      created_at: new Date().toISOString()
    }])
    .select()

  if (error) throw error
  return data[0]
}

export async function updateVehicle(vehicleId, vehicleData) {
  const { data, error } = await supabase
    .from('vehicles')
    .update({
      ...vehicleData,
      updated_at: new Date().toISOString()
    })
    .eq('id', vehicleId)
    .select()

  if (error) throw error
  return data[0]
}

export async function deleteVehicle(vehicleId) {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', vehicleId)

  if (error) throw error
  return true
}

export async function markVehicleAsSold(vehicleId) {
  return updateVehicle(vehicleId, { status: 'sold' })
}

// UPLOAD DE IMAGENS
const STORAGE_BUCKET = 'vehicle-images'

export async function uploadVehicleImage(file, vehicleId = null) {
  try {
    // Gera nome único para o arquivo
    const fileExt = file.name.split('.').pop()
    const fileName = `${vehicleId || 'new'}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `vehicles/${fileName}`

    // Faz upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // Retorna URL pública da imagem
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath)

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('Erro ao fazer upload:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export async function deleteVehicleImage(imagePath) {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([imagePath])

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Erro ao deletar imagem:', error)
    return { success: false, error: error.message }
  }
}

// MÉTRICAS DA CAMILA (Conversas WhatsApp)
export async function getCamilaMetrics(days = 7) {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateISO = startDate.toISOString()

    // Busca conversas do período
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, resulted_in_appointment, messages_count, started_at, last_message_at')
      .not('whatsapp', 'is', null)
      .gte('started_at', startDateISO)

    if (convError) throw convError

    // Busca mensagens para calcular tempo médio de resposta
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('role, response_time_ms, created_at')
      .gte('created_at', startDateISO)
      .not('response_time_ms', 'is', null)
      .eq('role', 'assistant')

    if (msgError) throw msgError

    // Calcula métricas
    const totalConversas = conversations?.length || 0
    const conversasComAgendamento = conversations?.filter(c => c.resulted_in_appointment)?.length || 0
    const taxaConversao = totalConversas > 0 ? (conversasComAgendamento / totalConversas) * 100 : 0

    // Tempo médio de resposta
    const temposResposta = messages?.map(m => m.response_time_ms).filter(t => t > 0) || []
    const tempoMedioMs = temposResposta.length > 0
      ? temposResposta.reduce((a, b) => a + b, 0) / temposResposta.length
      : 0
    const tempoMedioSegundos = Math.round(tempoMedioMs / 1000)

    // Total de mensagens
    const totalMensagens = conversations?.reduce((sum, c) => sum + (c.messages_count || 0), 0) || 0

    return {
      totalConversas,
      conversasComAgendamento,
      taxaConversao: Math.round(taxaConversao * 10) / 10,
      tempoMedioResposta: tempoMedioSegundos,
      totalMensagens,
      periodo: days
    }
  } catch (error) {
    console.error('Erro ao buscar métricas da Camila:', error)
    return {
      totalConversas: 0,
      conversasComAgendamento: 0,
      taxaConversao: 0,
      tempoMedioResposta: 0,
      totalMensagens: 0,
      periodo: days
    }
  }
}
