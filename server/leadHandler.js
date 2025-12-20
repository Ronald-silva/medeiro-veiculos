'use strict';
const crypto = require('crypto');
const axios = require('axios');

const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '5599999999999'; // Altere para seu número WhatsApp (código do país + DDD + número)
const WEBHOOK_URL = process.env.LEAD_WEBHOOK_URL || ''; // Opcional: URL do CRM para receber leads

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

async function dispatchLead(lead) {
  // Optional: send to CRM/webhook
  if (WEBHOOK_URL) {
    try {
      await axios.post(WEBHOOK_URL, { lead });
    } catch (err) {
      // ignore webhook failures for now
    }
  }
  const msg = `Olá, tenho interesse em ${lead.interest}. Nome: ${lead.name}. Telefone: ${lead.phone}. LeadID: ${lead.id}`;
  const chatLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  return { chatLink };
}

module.exports = { createLead, qualifyLead, dispatchLead };