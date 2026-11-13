// Temporary diagnostic: what the public key can actually do on submitted_events.
import { db } from '../../../lib/supabase.js';
const TOKEN = 'diag9c1f2b7e4a';
export default async function handler(req, res) {
  if (String(req.query.token || '') !== TOKEN) return res.status(404).end();
  const out = {};
  try {
    const rows = await db.select('submitted_events', '?limit=1');
    out.select = 'ok:' + (Array.isArray(rows) ? rows.length : 0);
  } catch (e) { out.select = String(e && e.message || e).slice(0, 160); }
  try {
    await db.insert('submitted_events', {});
    out.insert = 'ok (a row was created)';
  } catch (e) { out.insert = String(e && e.message || e).slice(0, 200); }
  try {
    await db.update('submitted_events', {}, '?id=eq.diag_missing');
    out.update = 'ok';
  } catch (e) { out.update = String(e && e.message || e).slice(0, 160); }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(out);
}