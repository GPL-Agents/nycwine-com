// pages/api/reddit.js
// ─────────────────────────────────────────────────────────────
// Reddit Wine Feed — combines:
//   1. r/wine hot posts (general wine content, always fresh)
//   2. r/nyc + r/FoodNYC (wine-filtered)
//   3. Reddit search for "nyc wine" and "new york city wine"
//      (less frequent but more targeted)
//
// Uses RSS feeds (more permissive than JSON on Vercel IPs).
// Falls back to JSON, then to static posts.
// 30-minute in-memory cache.
// ─────────────────────────────────────────────────────────────

const SUBREDDITS = [
  { name: 'wine', alwaysRelevant: true },
  { name: 'nyc', alwaysRelevant: false },
  { name: 'FoodNYC', alwaysRelevant: false },
];

// Reddit search queries for NYC-specific wine content
const SEARCH_QUERIES = [
  'nyc wine',
  'new york city wine',
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

// ── Parse RSS XML for Reddit posts ──────────────────────────
function parseRedditRSS(xml, sourceName, alwaysRelevant) {
  const posts = [];
  const entries = xml.split('<entry>').slice(1);

  for (const entry of entries) {
    const title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    const link = (entry.match(/<link href="([^"]*)"/) || [])[1] || '';
    const updated = (entry.match(/<updated>([\s\S]*?)<\/updated>/) || [])[1] || '';
    const content = (entry.match(/<content[^>]*>([\s\S]*?)<\/content>/) || [])[1] || '';

    const cleanTitle = title
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\[link\].*$/, '')
      .replace(/\[comments\].*$/, '')
      .trim();

    if (!cleanTitle || !link) continue;

    const scoreMatch = content.match(/(\d+)\s*point/i);
    const commentsMatch = content.match(/(\d+)\s*comment/i);

    // Try to extract subreddit from the link URL
    const subMatch = link.match(/\/r\/([^/]+)\//);
    const subreddit = subMatch ? `r/${subMatch[1]}` : sourceName;

    posts.push({
      title: cleanTitle,
      subreddit,
      url: link,
      score: scoreMatch ? parseInt(scoreMatch[1], 10) : 0,
      comments: commentsMatch ? parseInt(commentsMatch[1], 10) : 0,
      timestamp: updated ? new Date(updated).getTime() : Date.now(),
      _alwaysRelevant: alwaysRelevant,
      _text: `${cleanTitle} ${content}`.toLowerCase(),
    });
  }

  return posts;
}

// ── Fetch RSS from one subreddit ────────────────────────────
async function fetchSubredditRSS(sub) {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${sub.name}/hot.rss?limit=25`,
      {
        headers: {
          'User-Agent': 'NYCWine.com/1.0 (wine community aggregator)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) {
      console.log(`Reddit RSS r/${sub.name}: HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    return parseRedditRSS(xml, `r/${sub.name}`, sub.alwaysRelevant);
  } catch (err) {
    console.log(`Reddit RSS r/${sub.name} error:`, err.message);
    return [];
  }
}

// ── Fetch Reddit search RSS for a query ─────────────────────
async function fetchSearchRSS(query) {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://www.reddit.com/search.rss?q=${encoded}&sort=relevance&t=year&limit=25`,
      {
        headers: {
          'User-Agent': 'NYCWine.com/1.0 (wine community aggregator)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) {
      console.log(`Reddit search "${query}": HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    // Search results are always relevant (they matched our query)
    return parseRedditRSS(xml, `search: ${query}`, true);
  } catch (err) {
    console.log(`Reddit search "${query}" error:`, err.message);
    return [];
  }
}

// ── Fallback: try JSON endpoint ─────────────────────────────
async function fetchSubredditJSON(sub) {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${sub.name}/hot.json?limit=25`,
      {
        headers: {
          'User-Agent': 'NYCWine.com/1.0 (wine community aggregator)',
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.children || []).map((child) => ({
      title: child.data.title,
      subreddit: `r/${child.data.subreddit}`,
      url: `https://reddit.com${child.data.permalink}`,
      score: child.data.score,
      comments: child.data.num_comments,
      timestamp: child.data.created_utc * 1000,
      _alwaysRelevant: sub.alwaysRelevant,
      _text: `${child.data.title} ${child.data.selftext || ''}`.toLowerCase(),
    }));
  } catch {
    return [];
  }
}

// ── Filter for wine-related content ───────────────────────────
function isWineRelated(post) {
  if (post._alwaysRelevant) return true;
  return WINE_KEYWORDS.some((kw) => post._text.includes(kw));
}

// ── Time-ago helper ───────────────────────────────────────────
function timeAgo(ms) {
  const diff = Date.now() - ms;
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// ── Static fallback posts (shown when Reddit is unreachable) ──
const FALLBACK_POSTS = [
  {
    title: 'Best natural wine bars in NYC?',
    subreddit: 'r/wine',
    url: 'https://reddit.com/r/wine',
    score: 42,
    comments: 18,
    ago: 'Popular',
  },
  {
    title: 'Wine store recommendations in Manhattan',
    subreddit: 'r/nyc',
    url: 'https://reddit.com/r/nyc',
    score: 38,
    comments: 24,
    ago: 'Popular',
  },
  {
    title: 'What wine are you drinking this weekend?',
    subreddit: 'r/wine',
    url: 'https://reddit.com/r/wine',
    score: 67,
    comments: 45,
    ago: 'Popular',
  },
];

// ── API Handler ───────────────────────────────────────────────
export default async function handler(req, res) {
  // Return cached data if fresh
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cache);
  }

  try {
    // Fetch subreddit RSS + search RSS in parallel
    const [subResults, searchResults] = await Promise.all([
      // Subreddit feeds
      Promise.all(SUBREDDITS.map((sub) => fetchSubredditRSS(sub))),
      // Search feeds for NYC-specific content
      Promise.all(SEARCH_QUERIES.map((q) => fetchSearchRSS(q))),
    ]);

    let allPosts = [...subResults.flat(), ...searchResults.flat()];

    // If RSS returned nothing, try JSON fallback for subreddits
    if (allPosts.length === 0) {
      console.log('Reddit RSS returned no posts, trying JSON fallback...');
      const jsonResults = await Promise.all(
        SUBREDDITS.map((sub) => fetchSubredditJSON(sub))
      );
      allPosts = jsonResults.flat();
    }

    // If still nothing, return static fallback
    if (allPosts.length === 0) {
      console.log('Reddit feeds unreachable, using static fallback');
      cache = FALLBACK_POSTS;
      cacheTime = Date.now();
      return res.status(200).json(FALLBACK_POSTS);
    }

    // Filter, deduplicate, sort
    const seen = new Set();
    const filtered = allPosts
      .filter(isWineRelated)
      .filter((post) => {
        const key = post.title.toLowerCase().slice(0, 60);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    // Sort by score (most popular first)
    filtered.sort((a, b) => b.score - a.score);

    // Format for frontend
    const posts = filtered.slice(0, 10).map((post) => ({
      title: post.title,
      subreddit: post.subreddit,
      url: post.url,
      score: post.score,
      comments: post.comments,
      ago: timeAgo(post.timestamp),
    }));

    // If filtering removed everything, use unfiltered subset
    const finalPosts = posts.length > 0 ? posts : allPosts.slice(0, 5).map((post) => ({
      title: post.title,
      subreddit: post.subreddit,
      url: post.url,
      score: post.score,
      comments: post.comments,
      ago: timeAgo(post.timestamp),
    }));

    cache = finalPosts;
    cacheTime = Date.now();

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=1800, stale-while-revalidate=300'
    );
    return res.status(200).json(finalPosts);
  } catch (err) {
    console.error('Reddit API error:', err);
    return res.status(200).json(FALLBACK_POSTS);
  }
}
