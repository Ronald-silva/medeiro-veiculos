import { createClient } from '@supabase/supabase-js';

// Helper para obter env vars tanto no Node.js quanto no Vite
const getEnv = (key) => {
  // No Node.js (servidor API)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  // No browser (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Database features will be disabled.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: false // Não precisamos de autenticação por enquanto
  }
});

// Helper para verificar se Supabase está configurado
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey &&
                 supabaseUrl !== 'your-project-url.supabase.co');
};

// Tabelas do database
export const TABLES = {
  LEADS: 'leads',
  VEHICLES: 'vehicles',
  APPOINTMENTS: 'appointments',
  INTERACTIONS: 'interactions'
};

// Helper functions para operações comuns

/**
 * Salva lead no Supabase
 */
export async function saveLead(leadData) {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, skipping lead save');
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { data, error } = await supabase
      .from(TABLES.LEADS)
      .insert([leadData])
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error saving lead:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Busca veículos disponíveis
 */
export async function getVehicles(filters = {}) {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, returning empty array');
    return { success: true, data: [] };
  }

  try {
    let query = supabase
      .from(TABLES.VEHICLES)
      .select('*')
      .eq('status', 'available');

    // Aplicar filtros
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.maxPrice) {
      query = query.lte('price', filters.maxPrice);
    }

    const { data, error } = await query.order('price', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error getting vehicles:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Salva agendamento
 */
export async function saveAppointment(appointmentData) {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, skipping appointment save');
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { data, error } = await supabase
      .from(TABLES.APPOINTMENTS)
      .insert([appointmentData])
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error saving appointment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Registra interação para analytics
 */
export async function trackInteraction(interactionData) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { data, error } = await supabase
      .from(TABLES.INTERACTIONS)
      .insert([{
        ...interactionData,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error tracking interaction:', error);
    return { success: false, error: error.message };
  }
}
