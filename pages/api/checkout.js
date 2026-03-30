// pages/api/checkout.js
// ─────────────────────────────────────────────────────────────
// Stripe Checkout session creator for ad placements.
// Receives slot / tier / advertiser details, creates a Stripe
// Checkout session, and returns the hosted checkout URL.
//
// POST /api/checkout
// Body: { slotId, tierKey, startMonth, advertiserName,
//         contactEmail, websiteUrl, description,
//         logoUrl, adImageUrl }
// Returns: { checkoutUrl }
// ─────────────────────────────────────────────────────────────

import { db } from '../../lib/supabase';

// ── Stripe price ID map (from env vars) ──────────────────────
const PRICE_IDS = {
  header: {
    monthly:   process.env.STRIPE_PRICE_HEADER_MONTHLY,
    quarterly: process.env.STRIPE_PRICE_HEADER_QUARTERLY,
    annual:    process.env.STRIPE_PRICE_HEADER_ANNUAL,
  },
  event: {
    monthly:   process.env.STRIPE_PRICE_EVENT_MONTHLY,
    quarterly: process.env.STRIPE_PRICE_EVENT_QUARTERLY,
    annual:    process.env.STRIPE_PRICE_EVENT_ANNUAL,
  },
  bar: {
    monthly:   process.env.STRIPE_PRICE_BAR_MONTHLY,
    quarterly: process.env.STRIPE_PRICE_BAR_QUARTERLY,
    annual:    process.env.STRIPE_PRICE_BAR_ANNUAL,
  },
  store: {
    monthly:   process.env.STRIPE_PRICE_STORE_MONTHLY,
    quarterly: process.env.STRIPE_PRICE_STORE_QUARTERLY,
    annual:    process.env.STRIPE_PRICE_STORE_ANNUAL,
  },
  winery: {
    monthly:   process.env.STRIPE_PRICE_WINERY_MONTHLY,
    quarterly: process.env.STRIPE_PRICE_WINERY_QUARTERLY,
    annual:    process.env.STRIPE_PRICE_WINERY_ANNUAL,
  },
  sidebar: {
    monthly:   process.env.STRIPE_PRICE_SIDEBAR_MONTHLY,
    quarterly: process.env.STRIPE_PRICE_SIDEBAR_QUARTERLY,
    annual:    process.env.STRIPE_PRICE_SIDEBAR_ANNUAL,
  },
  social: {
    monthly:   process.env.STRIPE_PRICE_SOCIAL_MONTHLY,
    quarterly: process.env.STRIPE_PRICE_SOCIAL_QUARTERLY,
    annual:    process.env.STRIPE_PRICE_SOCIAL_ANNUAL,
  },
};

// ── Slot display names ────────────────────────────────────────
const SLOT_NAMES = {
  header:  'Header Banner Ad',
  event:   'Featured Event',
  bar:     'Featured Wine Bar',
  store:   'Featured Wine Store',
  winery:  'Featured Winery',
  sidebar: 'Events Sidebar Ad',
  social:  'Social Page Ad',
};

// ── Tier display info ─────────────────────────────────────────
const TIER_LABELS = {
  monthly:   '1 Month',
  quarterly: '3 Months',
  annual:    '12 Months',
};


// ── Low-level Stripe REST helper (no npm package needed) ──────
async function stripeRequest(endpoint, params) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY not configured');

  const body = new URLSearchParams(params).toString();

  const res = await fetch(`https://api.stripe.com${endpoint}`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Stripe: ${data.error.message}`);
  }
  return data;
}

// ── Validate incoming body ────────────────────────────────────
function validate(body) {
  const { slotId, tierKey, startMonth, contactEmail } = body;
  if (!PRICE_IDS[slotId])              return 'Invalid ad slot.';
  if (!TIER_LABELS[tierKey])           return 'Invalid duration.';
  if (!startMonth || !/^\d{4}-\d{2}$/.test(startMonth)) return 'Invalid start month.';
  if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return 'A valid contact email is required.';
  return null;
}

// ── Handler ───────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};

  // 1. Validate
  const err = validate(body);
  if (err) return res.status(400).json({ error: err });

  const { slotId, tierKey, startMonth, advertiserName, contactEmail,
          websiteUrl, description, logoUrl, adImageUrl } = body;

  // 2. Resolve Price ID
  const priceId = PRICE_IDS[slotId]?.[tierKey];
  if (!priceId) {
    return res.status(500).json({ error: `Price ID not configured for ${slotId}/${tierKey}. Check .env.local.` });
  }

  // 3. Determine base URL for success/cancel redirects
  const origin = process.env.NEXT_PUBLIC_SITE_URL
    || (req.headers.host ? `https://${req.headers.host}` : 'https://nycwine.com');

  // 4. Build Stripe Checkout session params
  const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const params = {
    'mode':                          'subscription',
    'line_items[0][price]':          priceId,
    'line_items[0][quantity]':       '1',
    'customer_email':                contactEmail,
    'success_url':                   `${origin}/advertise-success?session_id={CHECKOUT_SESSION_ID}`,
    'cancel_url':                    `${origin}/advertise-buy?slot=${slotId}`,
    'subscription_data[metadata][slot_id]':       slotId,
    'subscription_data[metadata][tier]':          tierKey,
    'subscription_data[metadata][start_month]':   startMonth,
    'subscription_data[metadata][advertiser]':    advertiserName || '',
    'subscription_data[metadata][website_url]':   websiteUrl || '',
    'subscription_data[metadata][internal_id]':   sessionId,
    'metadata[slot_id]':             slotId,
    'metadata[tier]':                tierKey,
    'metadata[start_month]':         startMonth,
    'metadata[internal_id]':         sessionId,
  };

  // Creative asset URLs stored in metadata
  if (adImageUrl) params['metadata[ad_image_url]'] = adImageUrl;
  if (logoUrl)    params['metadata[logo_url]']     = logoUrl;
  if (description) params['metadata[description]'] = description.slice(0, 500);

  try {
    // 5. Create Checkout session via Stripe REST
    const session = await stripeRequest('/v1/checkout/sessions', params);

    // 6. Log pending booking to Supabase
    try {
      await db.insert('ad_bookings', {
        id:                sessionId,
        stripe_session_id: session.id,
        slot_id:           slotId,
        tier_key:          tierKey,
        start_month:       startMonth,
        advertiser_name:   advertiserName || null,
        contact_email:     contactEmail,
        website_url:       websiteUrl     || null,
        status:            'pending_payment',
        created_at:        new Date().toISOString(),
        data: {
          adImageUrl:  adImageUrl   || null,
          logoUrl:     logoUrl      || null,
          description: description  || null,
        },
      });
    } catch (err) {
      // Non-fatal — Stripe session was created; log and continue
      console.error('Supabase booking log error:', err);
    }

    // 7. Return checkout URL to client
    return res.status(200).json({ checkoutUrl: session.url });

  } catch (stripeErr) {
    console.error('Stripe checkout error:', stripeErr);
    return res.status(500).json({ error: stripeErr.message || 'Could not create checkout session.' });
  }
}
