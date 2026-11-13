// Temporary: which environment variables exist (names only, never values).
const TOKEN = '***';
export default async function handler(req, res) {
  if (String(req.query.token || '') !== TOKEN) return res.status(404).end();
  const names = Object.keys(process.env).filter(function (k) { return /SUPABASE|SERVICE|SECRET|ANON|DATABASE/i.test(k); }).sort();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ names: names, total: Object.keys(process.env).length });
}