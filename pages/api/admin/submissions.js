// pages/api/admin/submissions.js
// ─────────────────────────────────────────────────────────────
// Admin API for reading and acting on flagged submissions.
// Password-protected via ADMIN_PASSWORD env var.
//
// GET  /api/admin/submissions?pw=xxx         → list flagged
// POST /api/admin/submissions                → approve or reject
//      Body: { pw, id, action: 'approve'|'reject' }
// ─────────────────────────────────────────────────────────────

import fs   from 'fs';
import path from 'path';

const DATA_DIR     = path.join(process.cwd(), 'public', 'data');
const FLAG_FILE    = path.join(DATA_DIR, 'flagged-submissions.json');
const SUB_FILE     = path.join(DATA_DIR, 'submitted-listings.json');
const EVENTS_FILE  = path.join(DATA_DIR, 'submitted-events.json');
const ADMIN_PW     = process.env.ADMIN_PASSWORD || 'nycwine-admin';

// File helpers
function readJson(file) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {}
  return [];
}
function writeJson(file, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// Append an approved event to submitted-events.json
function publishEvent(submission) {
  const events = readJson(EVENTS_FILE);
  if (events.find((e) => e.id === `sub_${submission.id}`)) return; // already there
  events.push({
    id:           `sub_${submission.id}`,
    title:        submission.name,
    venue:        submission.venue        || null,
    venueAddress: null,
    date:         submission.date         || null,
    time:         submission.time         || null,
    price:        submission.price        || null,
    description:  submission.description  || null,
    url:          submission.url          || null,
    image:        submission.image        || null,
    source:       'NYCWine',
    submittedAt:  submission.submittedAt,
  });
  writeJson(EVENTS_FILE, events);
}

// Append an approved venue to its data file
function publishVenue(submission) {
  const fileMap = { bar: 'wine-bars.json', store: 'wine-stores.json', winery: 'wineries.json' };
  const filename = fileMap[submission.type];
  if (!filename) return;
  const venueFile = path.join(DATA_DIR, filename);
  const venues = readJson(venueFile);
  if (venues.find((v) => v.name === submission.name && v.submittedAt === submission.submittedAt)) return;
  venues.push({
    name:         submission.name,
    address:      submission.address      || null,
    borough:      submission.borough      || null,
    neighborhood: submission.neighborhood || null,
    region:       submission.region       || null,
    phone:        submission.phone        || null,
    website:      submission.website      || null,
    description:  submission.description  || null,
    submittedAt:  submission.submittedAt,
    source:       'submission',
  });
  writeJson(venueFile, venues);
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    const pw = req.query.pw;
    if (pw !== ADMIN_PW) return res.status(401).json({ error: 'Unauthorized' });

    const flagged = readJson(FLAG_FILE).filter((s) => s.status === 'reviewed-escalated');
    return res.status(200).json(flagged);
  }

  if (req.method === 'POST') {
    const { pw, id, action } = req.body || {};
    if (pw !== ADMIN_PW) return res.status(401).json({ error: 'Unauthorized' });
    if (!id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'id and action (approve|reject) required' });
    }

    // Find in flagged list
    const flagged = readJson(FLAG_FILE);
    const idx = flagged.findIndex((s) => s.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Submission not found' });

    const submission = flagged[idx];

    if (action === 'approve') {
      submission.status    = 'reviewed-posted';
      submission.approvedAt = new Date().toISOString();
      if (submission.type === 'event') {
        publishEvent(submission);
      } else {
        publishVenue(submission);
      }
    } else {
      submission.status     = 'reviewed-rejected';
      submission.rejectedAt = new Date().toISOString();
    }

    // Update flagged file (keep record but mark status)
    flagged[idx] = submission;
    writeJson(FLAG_FILE, flagged);

    // Also update master submissions log
    const allSubs = readJson(SUB_FILE);
    const subIdx  = allSubs.findIndex((s) => s.id === id);
    if (subIdx !== -1) {
      allSubs[subIdx] = { ...allSubs[subIdx], ...submission };
      writeJson(SUB_FILE, allSubs);
    }

    return res.status(200).json({ ok: true, status: submission.status });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
