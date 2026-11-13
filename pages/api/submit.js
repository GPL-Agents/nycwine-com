// pages/api/submit.js
// ─────────────────────────────────────────────────────────────
// Free listing submission handler.
// Validates → AI review → saves to Supabase → publishes if approved.
// Auto-derives logo URLs from submitted website URLs via Clearbit.
//
// POST /api/submit
// Body: { type, name, contactEmail, ...fields }
// Returns: { ok: true } or { error: string }
// ─────────────────────────────────────────────────────────────

import { db } from '../../lib/supabase.js';

// ── Basic validation ──────────────────────────────────────────
function validate(body) {
  const { type, name, contactEmail } = body;
  if (!['event', 'bar', 'store', 'winery'].includes(type)) return 'Invalid listing type.';
  if (!name || name.trim().length < 2)                       return 'A name is required.';
  if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return 'A valid contact email is required.';
  }
  if (type === 'event' && body.url) {
    try { new URL(body.url); } catch { return 'Event URL is not valid.'; }
  }
  return null;
}

// ── Auto-derive logo URL from a website URL via Clearbit ─────
function deriveLogoUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `https://logo.clearbit.com/${parsed.hostname}`;
  } catch {
    return null;
  }
}

// ── Claude AI review ──────────────────────────────────────────

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};

  // 1. Validate
  const validationError = validate(body);
  if (validationError) return res.status(400).json({ error: validationError });

  // 2. Build record
  const id  = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  // 3. AI review
  const review = { verdict: 'escalate', reason: '' }; // no external reviewer: every listing goes to the human queue
  const status = review.verdict === 'post'     ? 'reviewed-posted'
               : review.verdict === 'reject'   ? 'reviewed-rejected'
               :                                 'reviewed-escalated';

  // Auto-derive logo from website/URL for all listing types
  const logoUrl = body.type === 'event'
    ? (body.image || deriveLogoUrl(body.url))
    : deriveLogoUrl(body.website);

  // 4. Save to Supabase submissions table
  const row = {
    id,
    type:          body.type,
    name:          (body.name || '').trim(),
    status,
    contact_email: body.contactEmail,
    ai_verdict:    review.verdict,
    ai_reason:     review.reason || '',
    submitted_at:  now,
    flagged_at:    review.verdict === 'escalate' ? now : null,
    data: {
      venue:        body.venue        || null,
      address:      body.address      || null,
      borough:      body.borough      || null,
      neighborhood: body.neighborhood || null,
      region:       body.region       || null,
      date:         body.date         || null,
      endDate:      body.endDate      || null,
      time:         body.time         || null,
      price:        body.price        || null,
      description:  body.description  || null,
      url:          body.url          || null,
      image:        body.image        || null,
      phone:        body.phone        || null,
      website:      body.website      || null,
      logoUrl,                                    // auto-derived from website/URL
    },
  };

  try {
    await db.insert('submissions', row);
  } catch (err) {
    console.error('Supabase insert error:', err);
    return res.status(500).json({ error: 'Could not save submission.', detail: err.message });
  }

  // 5. If approved, publish to the live feed / venue list
  if (review.verdict === 'post') {
    if (body.type === 'event') {
      try {
        await db.insert('submitted_events', {
          id:            `sub_${id}`,
          title:         (body.name || '').trim(),
          venue:         body.venue        || null,
          venue_address: null,
          date:          body.date         || null,
          time:          body.time         || null,
          price:         body.price        || null,
          description:   body.description  || null,
          url:           body.url          || null,
          image:         logoUrl || body.image || null,
          source:        'NYCWine',
          submitted_at:  now,
        });
      } catch (err) {
        console.error('Could not publish event:', err);
      }
    }
    // Venue types (bar/store/winery) still append to static JSON files
    // until full CMS is built — handled separately at deploy time.
  }

  return res.status(200).json({ ok: true });
}
