// pages/api/admin/submissions.js
// Admin API -- read and act on flagged submissions via Supabase.
// Password-protected via ADMIN_PASSWORD env var.
//
// GET   /api/admin/submissions?pw=xxx                                     -> list flagged (escalated only)
// GET   /api/admin/submissions?pw=xxx&all=true                            -> full review log (last 100)
// GET   /api/admin/submissions?key=<CRON_API_KEY>&all=true
//       -> all submissions (last 100, for cron job)
// GET   /api/admin/submissions?key=<CRON_API_KEY>&all=true&hide_processed=true
//       -> all unprocessed submissions (excludes reviewed-posted and reviewed-rejected)
// GET   /api/admin/submissions?key=<CRON_API_KEY>&type=ad_order&status=pending_payment
//       -> list pending payment ad orders
// POST  /api/admin/submissions                  -> approve or reject
//       Body: { pw, id, action: 'approve'|'reject' }
// PATCH /api/admin/submissions                  -> update submission data
//       Body: { pw, id, data: { ...fields to merge into data } }

import { db } from '../../../lib/supabase.js';
import { adminDb } from '../../../lib/supabase-admin.js';

function isAdminAuthorized(pw) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  return Boolean(adminPassword) && pw === adminPassword;
}

function isReadAuthorized(pw, key) {
  // Preserve the existing daily checker as read-only. This fallback is never
  // accepted by POST/PATCH, which require the configured admin password.
  const cronKey = process.env.CRON_API_KEY || 'nycwine-cron-2026';
  return isAdminAuthorized(pw) || (Boolean(key) && key === cronKey);
}

// Publish an approved event to submitted_events table
async function publishEvent(submission) {
  const d = submission.data || {};
  await adminDb.upsert('submitted_events', {
    id:            `sub_${submission.id}`,
    title:         submission.name,
    venue:         d.venue         || null,
    venue_address: d.address       || null,
    date:          d.date          || null,
    time:          d.time          || null,
    price:         d.price         || null,
    description:   d.description   || null,
    url:           d.url           || null,
    image:         d.logoUrl       || d.image || null,
    source:        'NYCWine',
    submitted_at:  submission.submitted_at,
  }, 'id');
}

function databaseStatus(error) {
  const match = String(error?.message || '').match(/→\s*(\d{3}):/);
  return match ? Number(match[1]) : null;
}

function hasAdminSupabaseKey() {
  return Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function actionErrorMessage(error, phase, published) {
  const status = databaseStatus(error);
  if (published) {
    return 'The event was published, but the review status could not be saved. Retrying is safe and will not create a duplicate.';
  }
  if (phase === 'publish') {
    return `Could not publish this event${status ? ` (database HTTP ${status})` : ''}. It remains available for review.`;
  }
  if (phase === 'load') {
    return `Could not load this submission${status ? ` (database HTTP ${status})` : ''}. No change was made.`;
  }
  return `Could not save the review decision${status ? ` (database HTTP ${status})` : ''}. No approval or rejection was recorded.`;
}

function buildFilterQuery(params) {
  if (params.type) {
    let q = `?type=eq.${encodeURIComponent(params.type)}`;
    q += '&order=submitted_at.desc';
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
    const authenticated = isReadAuthorized(pw, key);
    if (!authenticated) return res.status(401).json({ error: 'Unauthorized' });

    let query;
    if (req.query.all === 'true' && authenticated) {
      query = '?order=submitted_at.desc&limit=100';
    } else {
      query = buildFilterQuery(req.query);
    }

    // Exclude processed items when hide_processed=true (cron uses this to skip old reviewed-posted/rejected)
    if (req.query.hide_processed === 'true') {
      query += '&status=neq.reviewed-posted&status=neq.reviewed-rejected';
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
    if (!isAdminAuthorized(pw)) return res.status(401).json({ error: 'Unauthorized' });
    if (!id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'id and action (approve|reject) required' });
    }
    if (!hasAdminSupabaseKey()) {
      return res.status(503).json({
        error: 'Admin writes are not configured. Set the server-only SUPABASE_SECRET_KEY (preferred) or legacy SUPABASE_SERVICE_ROLE_KEY in Vercel; the public anon key cannot publish approved events.',
      });
    }

    let phase = 'load';
    let eventPublished = false;
    try {
      const rows = await adminDb.select('submissions', `?id=eq.${encodeURIComponent(id)}`);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Submission not found' });
      }
      const submission = rows[0];

      const now = new Date().toISOString();
      const status = action === 'approve' ? 'reviewed-posted' : 'reviewed-rejected';
      const history = Array.isArray(submission.data?.admin_review_history)
        ? submission.data.admin_review_history
        : [];
      const adminReviewHistory = [
        ...history,
        {
          action,
          at: now,
          previous_status: submission.status,
          previous_ai_verdict: submission.ai_verdict || null,
        },
      ];

      // Publish first. If publication fails, the submission stays in its
      // current review state; the idempotent upsert makes retries safe.
      if (action === 'approve' && submission.type === 'event') {
        phase = 'publish';
        await publishEvent(submission);
        eventPublished = true;
      }

      phase = 'save review status';
      await adminDb.update(
        'submissions',
        {
          status,
          [action === 'approve' ? 'approved_at' : 'rejected_at']: now,
          data: { ...(submission.data || {}), admin_review_history: adminReviewHistory },
        },
        `?id=eq.${encodeURIComponent(id)}`
      );

      return res.status(200).json({
        ok: true,
        status,
        reviewed_at: now,
        admin_review_history: adminReviewHistory,
        published: action === 'approve' && submission.type === 'event',
      });
    } catch (err) {
      console.error('Admin action error:', { id, action, error: err });
      return res.status(500).json({ error: actionErrorMessage(err, phase, eventPublished) });
    }
  }

  // -- PATCH: update submission data (fix typos, etc.) ---------------
  if (req.method === 'PATCH') {
    const { pw, id, data } = req.body || {};
    if (!isAdminAuthorized(pw)) return res.status(401).json({ error: 'Unauthorized' });
    if (!id || !data) {
      return res.status(400).json({ error: 'id and data (object with fields to merge) required' });
    }
    if (!hasAdminSupabaseKey()) {
      return res.status(503).json({
        error: 'Admin writes are not configured. Set the server-only SUPABASE_SECRET_KEY (preferred) or legacy SUPABASE_SERVICE_ROLE_KEY in Vercel.',
      });
    }

    try {
      const rows = await adminDb.select('submissions', `?id=eq.${encodeURIComponent(id)}`);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      const existing = rows[0];
      const mergedData = { ...(existing.data || {}), ...data };
      await adminDb.update(
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
