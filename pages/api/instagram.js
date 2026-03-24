// pages/api/instagram.js
// ─────────────────────────────────────────────────────────────
// Instagram #nycwine Photos — uses the Instagram Graph API
// to fetch recent public photos tagged #nycwine.
//
// Required environment variables (set in Vercel dashboard):
//   INSTAGRAM_ACCESS_TOKEN  — long-lived User Access Token
//   INSTAGRAM_USER_ID       — your Instagram Business/Creator account ID
//
// The token lasts 60 days. The /api/instagram/refresh endpoint
// can extend it before expiry (call via Vercel Cron monthly).
//
// Endpoint: GET /api/instagram
// Returns: JSON array of { id, imageUrl, permalink, caption, timestamp }
// ─────────────────────────────────────────────────────────────

// ── In-memory cache ───────────────────────────────────────────
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export default async function handler(req, res) {
  // Return cached data if fresh
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cache);
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;

  if (!token || !userId) {
    return res.status(200).json([]);  // Graceful empty — no credentials yet
  }

  try {
    // Step 1: Search for the #nycwine hashtag ID
    const hashtagSearchUrl = `https://graph.facebook.com/v19.0/ig_hashtag_search?user_id=${userId}&q=nycwinereport&access_token=${token}`;
    const hashtagRes = await fetch(hashtagSearchUrl);
    const hashtagData = await hashtagRes.json();

    if (!hashtagData.data || hashtagData.data.length === 0) {
      // Hashtag search failed — fall back to user's own recent media
      const photos = await fetchUserMedia(userId, token);
      cache = photos;
      cacheTime = Date.now();
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
      return res.status(200).json(photos);
    }

    const hashtagId = hashtagData.data[0].id;

    // Step 2: Get recent media for #nycwine
    const recentUrl = `https://graph.facebook.com/v19.0/${hashtagId}/recent_media?user_id=${userId}&fields=id,media_type,media_url,permalink,caption,timestamp&limit=12&access_token=${token}`;
    const recentRes = await fetch(recentUrl);
    const recentData = await recentRes.json();

    let photos = [];

    if (recentData.data) {
      photos = recentData.data
        .filter((item) => item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM')
        .slice(0, 9)
        .map((item) => ({
          id: item.id,
          imageUrl: item.media_url,
          permalink: item.permalink,
          caption: item.caption ? item.caption.substring(0, 120) : '',
          timestamp: item.timestamp,
        }));
    }

    // If hashtag returned few results, supplement with user's own media
    if (photos.length < 6) {
      const userPhotos = await fetchUserMedia(userId, token);
      const existingIds = new Set(photos.map((p) => p.id));
      for (const up of userPhotos) {
        if (!existingIds.has(up.id) && photos.length < 9) {
          photos.push(up);
        }
      }
    }

    cache = photos;
    cacheTime = Date.now();

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    return res.status(200).json(photos);
  } catch (err) {
    console.error('Instagram API error:', err);

    // Try user media as fallback
    try {
      const photos = await fetchUserMedia(userId, token);
      cache = photos;
      cacheTime = Date.now();
      return res.status(200).json(photos);
    } catch {
      return res.status(200).json([]); // Graceful empty
    }
  }
}

// ── Fetch the user's own recent media as fallback ──────────────
async function fetchUserMedia(userId, token) {
  try {
    const url = `https://graph.facebook.com/v19.0/${userId}/media?fields=id,media_type,media_url,permalink,caption,timestamp&limit=9&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.data) return [];

    return data.data
      .filter((item) => item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM')
      .slice(0, 9)
      .map((item) => ({
        id: item.id,
        imageUrl: item.media_url,
        permalink: item.permalink,
        caption: item.caption ? item.caption.substring(0, 120) : '',
        timestamp: item.timestamp,
      }));
  } catch {
    return [];
  }
}
