// Temporary: can the public key update an existing submissions row? No-op write.
import { db } from '../../../lib/supabase.js';
const TOKEN = '***';
export default async function handler(req, res) {
  if (String(req.query.token || '') !== TOKEN) return res.status(404).end();
  const out = {};
  try {
    const rows = await db.select('submissions', '?limit=1&select=id,status');
    if (!rows || !rows.length) return res.status(200).json({ update: 'no rows to test' });
    out.row = rows[0].id;
    out.status = rows[0].status;
    await db.update('submissions', { status: rows[0].status }, '?id=eq.' + encodeURIComponent(rows[0].id));
    out.update = 'ok';
  } catch (e) { out.update = String(e && e.message || e).slice(0, 200); }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(out);
}