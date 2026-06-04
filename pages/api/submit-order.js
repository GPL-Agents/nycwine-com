// pages/api/submit-order.js
// Ad placement order intake.
// Saves order to Supabase and returns an order ID.
// Replaces Stripe checkout until Stripe account is configured.

import { db } from '../../lib/supabase';

const AD_SLOTS = {
  header:  { name: 'Header Banner Ad',    monthlyRate: 300 },
  event:   { name: 'Featured Event',       monthlyRate: 25  },
  bar:     { name: 'Featured Wine Bar',    monthlyRate: 25  },
  store:   { name: 'Featured Wine Store',  monthlyRate: 25  },
  winery:  { name: 'Featured Winery',      monthlyRate: 25  },
  sidebar: { name: 'Events Sidebar Ad',    monthlyRate: 100 },
  social:  { name: 'Social Page Ad',       monthlyRate: 75  },
};

const TIERS = {
  monthly:   { months: 1,  discount: 0    },
  quarterly: { months: 3,  discount: 0.10 },
  annual:    { months: 12, discount: 0.30 },
};

function calcTotal(rate, months, discount) {
  return Math.round(rate * months * (1 - discount) * 100) / 100;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    slotId, tierKey, startMonth,
    advertiserName, contactEmail, websiteUrl,
    description, logoUrl, adImageUrl,
  } = req.body || {};

  if (!slotId || !AD_SLOTS[slotId])
    return res.status(400).json({ error: 'Invalid ad placement.' });
  if (!advertiserName?.trim())
    return res.status(400).json({ error: 'Advertiser name is required.' });
  if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))
    return res.status(400).json({ error: 'A valid contact email is required.' });
  if (!startMonth)
    return res.status(400).json({ error: 'Start month is required.' });

  const slot  = AD_SLOTS[slotId];
  const tier  = TIERS[tierKey] || TIERS.monthly;
  const total = calcTotal(slot.monthlyRate, tier.months, tier.discount);
  const orderId = 'ADO-' + Date.now().toString(36).slice(-6).toUpperCase();
  const now     = new Date().toISOString();

  const row = {
    id:            `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type:          'ad_order',
    name:          advertiserName.trim(),
    status:        'pending_payment',
    contact_email: contactEmail,
    ai_verdict:    'pending',
    ai_reason:     `Ad order ${orderId} -- awaiting Venmo payment`,
    submitted_at:  now,
    flagged_at:    null,
    data: {
      orderId,
      slotId,
      slotName:    slot.name,
      tierKey,
      months:      tier.months,
      startMonth,
      total,
      websiteUrl:  websiteUrl  || null,
      description: description || null,
      logoUrl:     logoUrl     || null,
      adImageUrl:  adImageUrl  || null,
    },
  };

  try {
    await db.insert('submissions', row);
  } catch (err) {
    console.error('Ad order insert error:', err);
    return res.status(500).json({ error: 'Could not save your order. Please try again.' });
  }

  return res.status(200).json({
    ok: true,
    orderId,
    total,
    slotName: slot.name,
    startMonth,
  });
}
