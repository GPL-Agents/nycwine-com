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
async function aiReview(body) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) return { verdict: 'escalate', reason: 'No AI review configured; needs a human check.' };
  const types = { event: 'Wine Event', bar: 'Wine Bar', store: 'Wine Store', winery: 'Winery' };
  const lines = [
    'You are reviewing a free listing submission for NYCWine.com, a NYC-focused wine website.',
    'Submission type: ' + (types[body.type] || body.type),
    'Name: ' + (body.name || '(none)'),
  ];
  if (body.venue) lines.push('Venue: ' + body.venue);
  if (body.address) lines.push('Address: ' + body.address);
  if (body.website) lines.push('Website: ' + body.website);
  if (body.url) lines.push('URL: ' + body.url);
  if (body.date) lines.push('Date: ' + body.date);
  if (body.region) lines.push('Region: ' + body.region);
  if (body.description) lines.push('Description: ' + String(body.description).slice(0, 800));
  lines.push('Decide one of three things:');
  lines.push('- "post": looks legitimate, wine-related, and NYC or nearby. Approve immediately.');
  lines.push('- "escalate": uncertain: suspicious URL, vague name, or unclear wine relevance.');
  lines.push('- "reject": clearly spam, not wine-related, or inappropriate.');
  lines.push('Respond with ONLY a JSON object: {"verdict":"post","reason":"Looks like a real NYC wine bar."}');
  const prompt = lines.join(String.fromCharCode(10));
  const dsKey = process.env.DEEPSEEK_API_KEY;
  if (dsKey) {
    try {
      const ds = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + dsKey },
        body: JSON.stringify({ model: process.env.DEEPSEEK_MODEL || 'deepseek-flash', messages: [{ role: 'user', content: prompt }], temperature: 0, max_tokens: 256 }),
        signal: AbortSignal.timeout(15000),
      });
      if (ds.ok) {
        const payload = await ds.json();
        const content = (((payload.choices || [])[0] || {}).message || {}).content || '';
        const dsOpen = content.indexOf(String.fromCharCode(123));
        const dsClose = content.lastIndexOf(String.fromCharCode(125));
        if (dsOpen > -1 && dsClose > dsOpen) {
          const parsed = JSON.parse(content.slice(dsOpen, dsClose + 1));
          if (['post', 'escalate', 'reject'].includes(parsed.verdict)) return parsed;
        }
      }
    } catch {}
  }
  const model = process.env.REVIEW_MODEL || 'gemini-2.0-flash-lite';
  const callUrl = (name) => 'https://generativelanguage.googleapis.com/v1beta/models/' + name + ':generateContent?key=' + encodeURIComponent(apiKey);
  const askModel = (name) => fetch(callUrl(name), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: 256 } }),
    signal: AbortSignal.timeout(15000),
  });
  try {
    let res = await askModel(model);
    if (res.status === 404 && model !== 'gemini-2.0-flash') res = await askModel('gemini-2.0-flash');
    if (!res.ok) {
      const detail = String(await res.text().catch(() => '')).slice(0, 200);
      console.error('AI review provider error:', { status: res.status });
      return { verdict: 'escalate', reason: 'Review provider HTTP ' + res.status + (detail ? ': ' + detail : '') + '.' };
    }
    const data = await res.json();
    const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    const text = parts.map((part) => part.text || '').join('').trim();
    const open = text.indexOf(String.fromCharCode(123));
    const close = text.lastIndexOf(String.fromCharCode(125));
    if (open > -1 && close > open) {
      try {
        const parsed = JSON.parse(text.slice(open, close + 1));
        if (['post', 'escalate', 'reject'].includes(parsed.verdict)) return parsed;
      } catch {}
    }
    return { verdict: 'escalate', reason: 'Review response was not valid JSON.' };
  } catch (err) {
    return { verdict: 'escalate', reason: 'Review failed: ' + String((err && err.message) || err).slice(0, 180) };
  }
}
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
