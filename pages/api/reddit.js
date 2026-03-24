// pages/api/reddit.js
// ─────────────────────────────────────────────────────────────
// Reddit Wine Feed — fetches wine-related posts using Reddit's
// FREE public JSON endpoints (no API key or account needed).
//
// Endpoint: GET /api/reddit
// Returns: JSON array of reddit posts
//
// Sources: r/wine (all posts), r/nyc + r/FoodNYC (wine-filtered)
//
// Uses in-memory cache (30 min) to be a good citizen.
// Public endpoints are rate-limited but generous for light use.
// ─────────────────────────────────────────────────────────────

const SUBREDDITS = [
  { name: 'wine', alwaysRelevant: true },
  { name: 'nyc', alwaysRelevant: false },
  { name: 'FoodNYC', alwaysRelevant: false },
];

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

// ── Fetch posts from one subreddit (public JSON) ──────────────
async function fetchSubreddit(sub) {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${sub.name}/hot.json?limit=25`,
      {
        headers: {
          // Reddit requires a descriptive User-Agent for public endpoints
          'User-Agent': 'NYCWine.com/1.0 (wine community aggregator)',
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.children || []).map((child) => ({
      ...child.data,
      _alwaysRelevant: sub.alwaysRelevant,
    }));
  } catch {
    return [];
  }
}

// ── Filter for wine-related content ───────────────────────────
function isWineRelated(post) {
  if (post._alwaysRelevant) return true;
  const text = `${post.title} ${post.selftext || ''}`.toLowerCase();
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
  return `${days}d ago`;
}

// ── API Handler ───────────────────────────────────────────────
export default async function handler(req, res) {
  // Return cached data if fresh
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cache);
  }

  try {
    // Fetch all subreddits in parallel
    const results = await Promise.all(
      SUBREDDITS.map((sub) => fetchSubreddit(sub))
    );

    // Flatten, filter for wine content, deduplicate by ID
    const seen = new Set();
    const allPosts = results
      .flat()
      .filter(isWineRelated)
      .filter((post) => {
        if (seen.has(post.id)) return false;
        seen.add(post.id);
        return true;
      });

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
    console.error('Reddit API error:', err);
    return res.status(500).json({ error: 'Failed to fetch Reddit posts' });
  }
}
