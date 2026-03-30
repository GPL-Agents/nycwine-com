// pages/api/submit.js
// ─────────────────────────────────────────────────────────────
// Free listing submission handler.
// Receives event / bar / store / winery data, runs AI review,
// appends to the appropriate data file, and sends email if
// the submission is escalated for human review.
//
// POST /api/submit
// Body: { type, name, contactEmail, ...fields }
// Returns: { ok: true } or { error: string }
// ─────────────────────────────────────────────────────────────

import fs   from 'fs';
import path from 'path';

const DATA_DIR  = path.join(process.cwd(), 'public', 'data');
const SUB_FILE  = path.join(DATA_DIR, 'submitted-listings.json');

// ── Load / save submitted listings ───────────────────────────
function loadSubmissions() {
  try {
    if (fs.existsSync(SUB_FILE)) {
      const raw = fs.readFileSync(SUB_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

function saveSubmissions(list) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SUB_FILE, JSON.stringify(list, null, 2), 'utf8');
}

// ── Basic validation ──────────────────────────────────────────
function validate(body) {
  const { type, name, contactEmail } = body;
  if (!['event', 'bar', 'store', 'winery'].includes(type)) {
    return 'Invalid listing type.';
  }
  if (!name || name.trim().length < 2) {
    return 'A name is required.';
  }
  if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return 'A valid contact email is required.';
  }
  // Events need a URL
  if (type === 'event' && body.url) {
    try { new URL(body.url); } catch { return 'Event URL is not valid.'; }
  }
  return null;
}

// ── Claude AI review ──────────────────────────────────────────
// Calls the Anthropic Messages API to check if the submission
// looks like a legitimate, wine-related NYC listing.
// Returns: { verdict: 'post' | 'reject' | 'escalate', reason }
async function aiReview(body) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No API key configured — auto-escalate for human review
    return { verdict: 'escalate', reason: 'No AI review configured; needs human check.' };
  }

  const typeLabels = { event: 'Wine Event', bar: 'Wine Bar', store: 'Wine Store', winery: 'Winery' };
  const prompt = `You are reviewing a free listing submission for NYCWine.com, a NYC-focused wine website.

Submission type: ${typeLabels[body.type] || body.type}
Name: ${body.name || '(none)'}
${body.venue   ? `Venue: ${body.venue}`       : ''}
${body.address ? `Address: ${body.address}`   : ''}
${body.website ? `Website: ${body.website}`   : ''}
${body.url     ? `URL: ${body.url}`           : ''}
${body.description ? `Description: ${body.description}` : ''}
${body.date    ? `Date: ${body.date}`         : ''}
${body.region  ? `Region: ${body.region}`     : ''}

Decide one of three things:
- "post"     — Submission looks legitimate, wine-related, and NYC/nearby. Approve immediately.
- "escalate" — Uncertain: suspicious URL, vague name, or unclear wine relevance. Flag for human review.
- "reject"   — Clearly spam, not wine-related, or inappropriate.

Respond with ONLY a JSON object like: {"verdict":"post","reason":"Looks like a real NYC wine bar."}
No other text.`;

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
    if (!res.ok) {
      console.error('Anthropic API error:', res.status);
      return { verdict: 'escalate', reason: 'AI review failed; needs human check.' };
    }
    const data  = await res.json();
    const text  = data.content?.[0]?.text?.trim() || '';
    // Extract JSON from response (strip any markdown fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (['post', 'escalate', 'reject'].includes(parsed.verdict)) {
        return parsed;
      }
    }
    return { verdict: 'escalate', reason: 'Could not parse AI verdict.' };
  } catch (err) {
    console.error('AI review error:', err);
    return { verdict: 'escalate', reason: 'AI review threw an error; needs human check.' };
  }
}

// ── Log escalated submission to flagged queue ─────────────────
// No external service needed — flagged items appear in the
// /admin page where they can be reviewed and approved/rejected.
function flagForReview(submission) {
  const flagFile = path.join(DATA_DIR, 'flagged-submissions.json');
  let flagged = [];
  try {
    if (fs.existsSync(flagFile)) {
      flagged = JSON.parse(fs.readFileSync(flagFile, 'utf8'));
    }
  } catch {}
  // Only add if not already present
  if (!flagged.find((s) => s.id === submission.id)) {
    flagged.push({ ...submission, flaggedAt: new Date().toISOString() });
  }
  fs.writeFileSync(flagFile, JSON.stringify(flagged, null, 2), 'utf8');
}

// ── Append approved events to events feed ────────────────────
// Events get written to submitted-events.json which the events
// API reads and prepends before Eventbrite results.
function appendSubmittedEvent(submission) {
  const eventsFile = path.join(DATA_DIR, 'submitted-events.json');
  let events = [];
  try {
    if (fs.existsSync(eventsFile)) {
      events = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
    }
  } catch {}

  events.push({
    id:           `sub_${submission.id}`,
    title:        submission.name,
    venue:        submission.venue || null,
    venueAddress: null,
    date:         submission.date || null,
    time:         submission.time || null,
    price:        submission.price || null,
    description:  submission.description || null,
    url:          submission.url || null,
    image:        submission.image || null,
    source:       'NYCWine',
    submittedAt:  submission.submittedAt,
  });

  fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2), 'utf8');
}

// ── Append approved venues to correct data file ──────────────
function appendSubmittedVenue(submission) {
  const fileMap = { bar: 'wine-bars.json', store: 'wine-stores.json', winery: 'wineries.json' };
  const filename = fileMap[submission.type];
  if (!filename) return;

  const venueFile = path.join(DATA_DIR, filename);
  let venues = [];
  try {
    venues = JSON.parse(fs.readFileSync(venueFile, 'utf8'));
  } catch {}

  venues.push({
    name:         submission.name,
    address:      submission.address || null,
    borough:      submission.borough || null,
    neighborhood: submission.neighborhood || null,
    region:       submission.region || null,
    phone:        submission.phone || null,
    website:      submission.website || null,
    description:  submission.description || null,
    submittedAt:  submission.submittedAt,
    source:       'submission',
  });

  fs.writeFileSync(venueFile, JSON.stringify(venues, null, 2), 'utf8');
}

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};

  // 1. Validate
  const validationError = validate(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  // 2. Build submission record
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const submission = {
    id,
    type:         body.type,
    name:         (body.name || '').trim(),
    submittedAt:  new Date().toISOString(),
    contactEmail: body.contactEmail,
    status:       'new',
    // Event-specific
    venue:        body.venue       || null,
    date:         body.date        || null,
    endDate:      body.endDate     || null,
    time:         body.time        || null,
    price:        body.price       || null,
    description:  body.description || null,
    url:          body.url         || null,
    image:        body.image       || null,
    // Venue-specific
    address:      body.address     || null,
    borough:      body.borough     || null,
    neighborhood: body.neighborhood|| null,
    region:       body.region      || null,
    phone:        body.phone       || null,
    website:      body.website     || null,
  };

  // 3. AI review
  const review = await aiReview(submission);
  submission.aiVerdict = review.verdict;
  submission.aiReason  = review.reason || '';
  submission.status    = review.verdict === 'post' ? 'reviewed-posted'
                       : review.verdict === 'reject' ? 'reviewed-rejected'
                       : 'reviewed-escalated';

  // 4. Persist to submissions log
  const all = loadSubmissions();
  all.push(submission);
  saveSubmissions(all);

  // 5. Act on verdict
  if (review.verdict === 'post') {
    // Immediately add to the live data files
    if (submission.type === 'event') {
      appendSubmittedEvent(submission);
    } else {
      appendSubmittedVenue(submission);
    }
  } else if (review.verdict === 'escalate') {
    flagForReview(submission);
  }
  // 'reject' → logged but not surfaced anywhere

  return res.status(200).json({ ok: true });
}
