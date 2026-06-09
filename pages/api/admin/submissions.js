// pages/api/admin/submissions.js
// Admin API -- read and act on flagged submissions via Supabase.
// Password-protected via ADMIN_PASSWORD env var.
//
// GET   /api/admin/submissions?pw=xxx          -> list flagged (escalated only)
// GET   /api/admin/submissions?pw=xxx&all=true -> full review log (last 100)
// GET   /api/admin/submissions?key=<CRON_API_KEY>&type=ad_order&status=pending_payment
//       -> list pending payment ad orders (for cron job)
// POST  /api/admin/submissions                 -> approve or reject
//       Body: { pw, id, action: 'approve'|'reject' }
// PATCH /api/admin/submissions                 -> update submission data
//       Body: { pw, id, data: { ...fields to merge into data } }

import { db } from '../../../lib/supabase';

const ADMIN_PW  = process.env.ADMIN_PASSWORD  || 'nycwine-admin';
const CRON_KEY  = process.env.CRON_API_KEY    || 'nycwine-cron-2026';

// Publish an approved event to submitted_events table
async function publishEvent(submission) {
  const d = submission.data || {};
  await db.insert('submitted_events', {
    id:            `sub_${submission.id}`,
    title:         submission.name,
    venue:         d.venue         || null,
    venue_address: null,
    date:          d.date          || null,
    time:          d.time          || null,
    price:         d.price         || null,
    description:   d.description   || null,
    url:           d.url           || null,
    image:         d.image         || null,
    source:        'NYCWine',
    submitted_at:  submission.submitted_at,
  });
}

function buildFilterQuery(params) {
  if (params.type) {
    let q = `?type=eq.${encodeURIComponent(params.type)}`;
    q += `&order=submitted_at.desc`;
    if (params.status) {
      q += `&status=eq.${encodeURIComponent(params.status)}`;
    }
    return q;
  }
  return '?status=eq.reviewed-escalated&order=submitted_at.desc';
}

export default async function handler(req, res) {
  // -- GET: list submissions -----------------------------------------
  if (req.method === 'GET') {
    const pw  = req.query.pw;
    const key = req.query.key;
    const authenticated = (pw === ADMIN_PW) || (key === CRON_KEY);
    if (!authenticated) return res.status(401).json({ error: 'Unauthorized' });

    let query;
    if (pw === ADMIN_PW && req.query.all === 'true') {
      query = '?order=submitted_at.desc&limit=100';
    } else {
      query = buildFilterQuery(req.query);
    }

    try {
      const rows = await db.select('submissions', query);
      return res.status(200).json(rows || []);
    } catch (err) {
      console.error('Admin fetch error:', err);
      return res.status(500).json({ error: 'Could not fetch submissions.' });
    }
  }

  // -- POST: approve or reject ---------------------------------------
  if (req.method === 'POST') {
    const { pw, id, action } = req.body || {};
    const authenticatedPatch = (pw === ADMIN_PW) || (key === CRON_KEY);
    if (!authenticatedPatch) return res.status(401).json({ error: 'Unauthorized' });
    if (!id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'id and action (approve|reject) required' });
    }

    try {
      const rows = await db.select('submissions', `?id=eq.${encodeURIComponent(id)}`);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Submission not found' });
      }
      const submission = rows[0];

      const now = new Date().toISOString();

      if (action === 'approve') {
        await db.update(
          'submissions',
          { status: 'reviewed-posted', approved_at: now },
          `?id=eq.${encodeURIComponent(id)}`
        );
        if (submission.type === 'event') {
          await publishEvent(submission);
        }
      } else {
        await db.update(
          'submissions',
          { status: 'reviewed-rejected', rejected_at: now },
          `?id=eq.${encodeURIComponent(id)}`
        );
      }

      return res.status(200).json({ ok: true, status: action === 'approve' ? 'reviewed-posted' : 'reviewed-rejected' });
    } catch (err) {
      console.error('Admin action error:', err);
      return res.status(500).json({ error: 'Action failed.' });
    }
  }

  // -- PATCH: update submission data (fix typos, etc.) ---------------
  if (req.method === 'PATCH') {
    const { pw, id, data } = req.body || {};
    const key = req.query.key;
    const authenticatedPatch = (pw === ADMIN_PW) || (key === CRON_KEY);
    if (!authenticatedPatch) return res.status(401).json({ error: 'Unauthorized' });
    if (!id || !data) {
      return res.status(400).json({ error: 'id and data (object with fields to merge) required' });
    }

    try {
      const rows = await db.select('submissions', `?id=eq.${encodeURIComponent(id)}`);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      const existing = rows[0];
      const mergedData = { ...(existing.data || {}), ...data };
      await db.update(
        'submissions',
        { data: mergedData },
        `?id=eq.${encodeURIComponent(id)}`
      );

      return res.status(200).json({ ok: true, message: 'Data updated' });
    } catch (err) {
      console.error('Admin PATCH error:', err);
      return res.status(500).json({ error: 'Update failed.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
