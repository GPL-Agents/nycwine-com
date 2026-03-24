// pages/api/instagram-refresh.js
// ─────────────────────────────────────────────────────────────
// Refreshes the long-lived Instagram access token.
// Call this monthly via Vercel Cron to keep the token alive.
//
// Long-lived tokens last 60 days. Refreshing before expiry
// generates a new 60-day token.
//
// Vercel Cron config (add to vercel.json):
//   { "crons": [{ "path": "/api/instagram-refresh", "schedule": "0 9 1 * *" }] }
//
// IMPORTANT: After refreshing, the NEW token is only logged.
// For true automation, you'd store it in a database or KV store.
// For now, this extends the existing token's life.
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!token) {
    return res.status(400).json({ error: 'No INSTAGRAM_ACCESS_TOKEN set' });
  }

  try {
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=ig_refresh_token&access_token=${token}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.access_token) {
      // Log the new token — in production you'd store this in a KV/database
      console.log('Instagram token refreshed successfully. New token expires in', data.expires_in, 'seconds');
      return res.status(200).json({
        success: true,
        expires_in_days: Math.round(data.expires_in / 86400),
      });
    } else {
      console.error('Instagram token refresh failed:', data);
      return res.status(500).json({ error: 'Token refresh failed', details: data });
    }
  } catch (err) {
    console.error('Instagram refresh error:', err);
    return res.status(500).json({ error: err.message });
  }
}
