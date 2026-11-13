// Temporary diagnostic: proves whether the public Supabase client can UPDATE.
// Removed as soon as the answer is known.
import { db } from '../../../lib/supabase.js';
const TOKEN = 'diag7f3ac91b5e2d4c6a';
export default async function handler(req, res) {
  if (String(req.query.token || '') !== TOKEN) return res.status(404).end();
  const missing = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasSecret = Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  let out = { missing_url_or_anon: missing, has_secret: hasSecret };
  try {
    await db.update('submissions', { status: 'reviewed-posted' }, '?id=eq.00000000-0000-0000-0000-000000000000');
    out.anon_update = 'ok';
  } catch (e) {
    out.anon_update = String(e && e.message || e).slice(0, 200);
  }
  res.status(200).json(out);
}