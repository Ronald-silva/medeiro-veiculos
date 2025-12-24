'use strict';
const crypto = require('crypto');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const WHATSAPP_NUMBER = process.env.SELLER_WHATSAPP || process.env.WHATSAPP_NUMBER || '5585988852900';
const WEBHOOK_URL = process.env.LEAD_WEBHOOK_URL || '';

// Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

function generateId() {
  const ts = Date.now().toString(36);
  const rnd = crypto.randomBytes(6).toString('hex');
  return `L-${ts}-${rnd}`;
}

function normalizePhone(raw) {
  return String(raw || '').replace(/\D+/g, '');
}

function createLead(data) {
  const lead = {
    id: generateId(),
    name: String(data.name || '').trim(),
    email: String(data.email || '').trim().toLowerCase(),
    phone: normalizePhone(data.phone),
    interest: String(data.interest || '').trim(),
    utm: {
      source: data.utm_source || '',
      medium: data.utm_medium || '',
      campaign: data.utm_campaign || '',
      content: data.utm_content || '',
      term: data.utm_term || '',
      gclid: data.gclid || ''
    },
    createdAt: new Date().toISOString()
  };
  return lead;
}

function qualifyLead(lead) {
  let score = 0;
  if (lead.phone && lead.phone.length >= 10) score += 50;
  if (lead.email) score += 20;
  if (lead.interest) score += 20;
  if (lead.utm.source) score += 5;
  const priority = score >= 80 ? 'hot' : score >= 50 ? 'warm' : 'cold';
  return { score, priority };
}

async function saveToSupabase(lead, qualification) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .insert([{
        nome: lead.name,
        whatsapp: lead.phone,
        email: lead.email || null,
        tipo_carro: lead.interest || 'Não especificado',
        orcamento: null,
        status: 'novo',
        score: qualification.score,
        source: lead.utm.source || 'website',
        notes: JSON.stringify(lead.utm)
      }])
      .select();

    if (error) {
      console.error('Erro ao salvar lead no Supabase:', error);
      return null;
    }

    console.log('✅ Lead salvo no CRM:', data[0]);
    return data[0];
  } catch (err) {
    console.error('Erro ao salvar no Supabase:', err);
    return null;
  }
}

async function dispatchLead(lead) {
  // Qualifica o lead
  const qualification = qualifyLead(lead);

  // Salva automaticamente no Supabase (CRM)
  await saveToSupabase(lead, qualification);

  // Optional: send to CRM/webhook
  if (WEBHOOK_URL) {
    try {
      await axios.post(WEBHOOK_URL, { lead, qualification });
    } catch (err) {
      // ignore webhook failures for now
    }
  }

  const msg = `Olá, tenho interesse em ${lead.interest}. Nome: ${lead.name}. Telefone: ${lead.phone}. LeadID: ${lead.id}`;
  const chatLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  return { chatLink, savedToCRM: true };
}

module.exports = { createLead, qualifyLead, dispatchLead };