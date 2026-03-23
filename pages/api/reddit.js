// pages/api/reddit.js
// ─────────────────────────────────────────────────────────────
// Reddit Wine Feed — fetches wine-related posts from
// r/wine, r/nyc, and r/FoodNYC using the free Reddit API.
//
// Endpoint: GET /api/reddit
// Returns: JSON array of reddit posts
//
// Requires env vars: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET
// Register at: https://www.reddit.com/prefs/apps (script type)
//
// Uses in-memory cache (30 min) to stay well within rate limits.
// Free tier: 100 requests/minute — we only need a few per hour.
// ─────────────────────────────────────────────────────────────

const SUBREDDITS = ['wine', 'nyc', 'FoodNYC'];
const WINE_KEYWORDS = [
  'wine', 'winery', 'vineyard', 'tasting', 'sommelier',
  'champagne', 'rosé', 'rose', 'bordeaux', 'pinot',
  'chardonnay', 'merlot', 'cabernet', 'prosecco', 'riesling',
  'wine bar', 'wine shop', 'wine store', 'natural wine',
  'bottle', 'cellar', 'vintage', 'pairing',
];

// ── In-memory cache ───────────────────────────────────────────
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ── Reddit OAuth token ────────────────────────────────────────
let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('REDDIT_CREDENTIALS_MISSING');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'NYCWine.com/1.0',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error('Reddit auth failed');
  const data = await res.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return accessToken;
}

// ── Fetch posts from one subreddit ────────────────────────────
async function fetchSubreddit(subreddit, token) {
  try {
    const res = await fetch(
      `https://oauth.reddit.com/r/${subreddit}/hot?limit=25`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'NYCWine.com/1.0',
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.children || []).map((child) => child.data);
  } catch {
    return [];
  }
}

// ── Filter for wine-related content ───────────────────────────
function isWineRelated(post) {
  const text = `${post.title} ${post.selftext || ''}`.toLowerCase();
  // Posts from r/wine are always relevant
  if (post.subreddit.toLowerCase() === 'wine') return true;
  // Others need wine keywords
  return WINE_KEYWORDS.some((kw) => text.includes(kw));
}

// ── Time-ago helper ───────────────────────────────────────────
function timeAgo(utcSeconds) {
  const diff = Date.now() - utcSeconds * 1000;
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return `${days}d ago`;
}

// ── API Handler ───────────────────────────────────────────────
export default async function handler(req, res) {
  // Return cached data if fresh
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cache);
  }

  try {
    const token = await getAccessToken();

    // Fetch all subreddits in parallel
    const results = await Promise.all(
      SUBREDDITS.map((sub) => fetchSubreddit(sub, token))
    );

    // Flatten, filter for wine content, deduplicate
    const allPosts = results.flat().filter(isWineRelated);

    // Sort by score (most popular first)
    allPosts.sort((a, b) => b.score - a.score);

    // Format for frontend
    const posts = allPosts.slice(0, 10).map((post) => ({
      title: post.title,
      subreddit: `r/${post.subreddit}`,
      url: `https://reddit.com${post.permalink}`,
      score: post.score,
      comments: post.num_comments,
      ago: timeAgo(post.created_utc),
      thumbnail:
        post.thumbnail && post.thumbnail.startsWith('http')
          ? post.thumbnail
          : null,
    }));

    cache = posts;
    cacheTime = Date.now();

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=1800, stale-while-revalidate=300'
    );
    return res.status(200).json(posts);
  } catch (err) {
    if (err.message === 'REDDIT_CREDENTIALS_MISSING') {
      return res.status(200).json({ needsSetup: true });
    }
    console.error('Reddit API error:', err);
    return res.status(500).json({ error: 'Failed to fetch Reddit posts' });
  }
}
