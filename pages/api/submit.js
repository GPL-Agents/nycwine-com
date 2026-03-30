// pages/api/submit.js
// ─────────────────────────────────────────────────────────────
// Free listing submission handler.
// Validates → AI review → saves to Supabase → publishes if approved.
//
// POST /api/submit
// Body: { type, name, contactEmail, ...fields }
// Returns: { ok: true } or { error: string }
// ─────────────────────────────────────────────────────────────

import { db } from '../../lib/supabase';

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

// ── Claude AI review ──────────────────────────────────────────
async function aiReview(body) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { verdict: 'escalate', reason: 'No AI review configured; needs human check.' };
  }

  const typeLabels = { event: 'Wine Event', bar: 'Wine Bar', store: 'Wine Store', winery: 'Winery' };
  const prompt = `You are reviewing a free listing submission for NYCWine.com, a NYC-focused wine website.

Submission type: ${typeLabels[body.type] || body.type}
Name: ${body.name || '(none)'}
${body.venue       ? `Venue: ${body.venue}`       : ''}
${body.address     ? `Address: ${body.address}`   : ''}
${body.website     ? `Website: ${body.website}`   : ''}
${body.url         ? `URL: ${body.url}`           : ''}
${body.description ? `Description: ${body.description}` : ''}
${body.date        ? `Date: ${body.date}`         : ''}
${body.region      ? `Region: ${body.region}`     : ''}

Decide one of three things:
- "post"     — Looks legitimate, wine-related, and NYC/nearby. Approve immediately.
- "escalate" — Uncertain: suspicious URL, vague name, or unclear wine relevance.
- "reject"   — Clearly spam, not wine-related, or inappropriate.

Respond with ONLY a JSON object: {"verdict":"post","reason":"Looks like a real NYC wine bar."}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 128,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return { verdict: 'escalate', reason: 'AI review failed.' };
    const data  = await res.json();
    const text  = data.content?.[0]?.text?.trim() || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (['post', 'escalate', 'reject'].includes(parsed.verdict)) return parsed;
    }
    return { verdict: 'escalate', reason: 'Could not parse AI verdict.' };
  } catch (err) {
    console.error('AI review error:', err);
    return { verdict: 'escalate', reason: 'AI review error; needs human check.' };
  }
}

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
  const review = await aiReview(body);
  const status = review.verdict === 'post'     ? 'reviewed-posted'
               : review.verdict === 'reject'   ? 'reviewed-rejected'
               :                                 'reviewed-escalated';

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
    },
  };

  try {
    await db.insert('submissions', row);
  } catch (err) {
    console.error('Supabase insert error:', err);
    return res.status(500).json({ error: 'Could not save submission.' });
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
          image:         body.image        || null,
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
