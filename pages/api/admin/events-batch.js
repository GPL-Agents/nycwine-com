// pages/api/admin/events-batch.js
// ─────────────────────────────────────────────────────────────
// Batch-insert events into the submitted_events table.
// Protected by the same admin password as the submissions admin.
// POST: insert one or more events
//
// Body: { pw: string, events: [{ id, title, venue, ... }] }
// Returns: { ok: true, inserted: number }
// ─────────────────────────────────────────────────────────────

import { db } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pw, events } = req.body || {};
  const adminPassword = process.env.ADMIN_PASSWORD || 'nycwine-admin';

  if (pw !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'events array required' });
  }

  const now = new Date().toISOString();
  let inserted = 0;
  const errors = [];

  for (const ev of events) {
    try {
      // Check if already exists (by id)
      const existing = await db.select('submitted_events', `?id=eq.${ev.id}`);
      if (existing && existing.length > 0) {
        continue; // skip duplicates
      }

      await db.insert('submitted_events', {
        id:            ev.id,
        title:         ev.title,
        venue:         ev.venue || null,
        venue_address: ev.venue_address || null,
        date:          ev.date || null,
        time:          ev.time || null,
        price:         ev.price || null,
        description:   ev.description || null,
        url:           ev.url || null,
        image:         ev.image || null,
        source:        'NYCWine',
        submitted_at:  now,
      });
      inserted++;
    } catch (err) {
      errors.push({ id: ev.id, error: err.message });
    }
  }

  return res.status(200).json({
    ok: true,
    inserted,
    duplicates: events.length - inserted - errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
