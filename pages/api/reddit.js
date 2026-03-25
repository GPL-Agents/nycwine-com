// pages/api/reddit.js
// ─────────────────────────────────────────────────────────────
// Reddit Wine Feed — combines:
//   1. r/wine hot posts (general wine content, always fresh)
//   2. NYC-focused subreddits (wine-filtered)
//   3. Reddit search for NYC wine queries
//
// Uses RSS feeds (more permissive than JSON on Vercel IPs).
// Falls back to JSON, then to cached file, then to static posts.
// 30-minute in-memory cache.
// ─────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';

const SUBREDDITS = [
  { name: 'wine', alwaysRelevant: true },
  { name: 'FoodNYC', alwaysRelevant: false },
  { name: 'nycdrinks', alwaysRelevant: false },
  { name: 'NYCbars', alwaysRelevant: false },
  { name: 'nyc', alwaysRelevant: false },
  { name: 'AskNYC', alwaysRelevant: false },
];

// Reddit search queries for NYC-specific wine content
const SEARCH_QUERIES = [
  'nycwine',
  'nycwinereport',
  'nyc wine bar',
  'nyc wine tasting',
  'nyc wine store',
  'new york wine',
];

const WINE_KEYWORDS = [
  // The word itself
  'wine',
  // Venues & retail
  'wine bar', 'wine shop', 'wine store', 'winery', 'vineyard',
  // Events & experiences
  'wine tasting', 'wine event', 'wine class', 'wine dinner',
  'wine festival', 'wine flight', 'corkage',
  // Expertise
  'sommelier', 'terroir', 'appellation', 'decant',
  // Varietals people actually drink in NYC
  'champagne', 'prosecco', 'rosé', 'pinot noir', 'pinot grigio',
  'chardonnay', 'merlot', 'cabernet', 'sauvignon blanc',
  'riesling', 'bordeaux', 'burgundy', 'chianti', 'barolo',
];

const NYC_KEYWORDS = [
  'nyc', 'new york', 'manhattan', 'brooklyn', 'queens',
  'bronx', 'staten island', 'east village', 'west village',
  'lower east side', 'upper east side', 'upper west side',
  'soho', 'tribeca', 'chelsea', 'midtown', 'harlem',
];

const NYC_HASHTAGS = [
  'nycwine', 'nycwinereport', '#nycwine', '#nycwinereport',
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

// ── Fetch JSON from one subreddit (preferred — has scores) ──
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
    if (!res.ok) {
      console.log(`Reddit JSON r/${sub.name}: HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return (data.data?.children || [])
      .filter((child) => !child.data.stickied) // skip pinned/stickied posts
      .map((child) => ({
        title: child.data.title,
        subreddit: `r/${child.data.subreddit}`,
        url: `https://reddit.com${child.data.permalink}`,
        score: child.data.score || 0,
        comments: child.data.num_comments || 0,
        timestamp: child.data.created_utc * 1000,
        _alwaysRelevant: sub.alwaysRelevant,
        _text: `${child.data.title} ${child.data.selftext || ''}`.toLowerCase(),
      }));
  } catch (err) {
    console.log(`Reddit JSON r/${sub.name} error:`, err.message);
    return [];
  }
}

// ── Fetch Reddit search JSON for a query ────────────────────
async function fetchSearchJSON(query) {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://www.reddit.com/search.json?q=${encoded}&sort=new&t=month&limit=25`,
      {
        headers: {
          'User-Agent': 'NYCWine.com/1.0 (wine community aggregator)',
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) {
      console.log(`Reddit search "${query}": HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return (data.data?.children || [])
      .filter((child) => !child.data.stickied)
      .map((child) => ({
        title: child.data.title,
        subreddit: `r/${child.data.subreddit}`,
        url: `https://reddit.com${child.data.permalink}`,
        score: child.data.score || 0,
        comments: child.data.num_comments || 0,
        timestamp: child.data.created_utc * 1000,
        _alwaysRelevant: false,
        _text: `${child.data.title} ${child.data.selftext || ''}`.toLowerCase(),
      }));
  } catch (err) {
    console.log(`Reddit search "${query}" error:`, err.message);
    return [];
  }
}

// ── Fallback: try RSS endpoint ──────────────────────────────
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
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRedditRSS(xml, `r/${sub.name}`, sub.alwaysRelevant);
  } catch {
    return [];
  }
}

// ── Subreddits that should NEVER appear in the NYC row ───────
const BLOCKED_SUBREDDITS = [
  'shittyfoodporn', 'washingtondc', 'dc', 'philadelphia', 'boston',
  'chicago', 'losangeles', 'sanfrancisco', 'seattle', 'portland',
  'austin', 'denver', 'atlanta', 'miami', 'houston', 'dallas',
  'mildlyinteresting', 'pics', 'funny', 'todayilearned',
];

// ── NYC-focused subreddits (posts here only need a wine keyword) ──
const NYC_SUBREDDITS = [
  'nyc', 'asknyc', 'foodnyc', 'nycdrinks', 'nycbars',
  'nycbitcheswithtaste', 'bedstuy', 'astoria', 'brooklyn',
  'manhattan', 'queens', 'bronx', 'statenisland',
  'williamsburg', 'parkslope', 'upperwestside', 'uppereastside',
];

// ── Relevance scoring for NYC wine content ───────────────────
function nycRelevanceScore(post) {
  const text = post._text;
  const title = post.title.toLowerCase();

  // Block irrelevant subreddits entirely
  const sub = post.subreddit.replace('r/', '').toLowerCase();
  if (BLOCKED_SUBREDDITS.includes(sub)) return 0;

  // Highest priority: explicit hashtags
  if (NYC_HASHTAGS.some((tag) => text.includes(tag))) return 3;

  // Title must contain a wine keyword — body-only matches are too noisy
  const titleHasWine = WINE_KEYWORDS.some((kw) => title.includes(kw));
  if (!titleHasWine) return 0;

  // If from an NYC-focused subreddit, wine in the title is enough
  if (NYC_SUBREDDITS.includes(sub)) return 2;

  // Otherwise, need NYC keyword somewhere in the post too
  const hasNYC = NYC_KEYWORDS.some((kw) => text.includes(kw));
  if (hasNYC) return 2;

  return 0;
}

function isNYCWineRelated(post) {
  return nycRelevanceScore(post) > 0;
}

function isWineRelated(post) {
  // For the general wine row, require wine keyword in the TITLE
  return WINE_KEYWORDS.some((kw) => post.title.toLowerCase().includes(kw));
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

// ── Static fallback posts ────────────────────────────────────
const FALLBACK = {
  wine: [
    { title: 'What wine are you drinking this weekend?', subreddit: 'r/wine', url: 'https://reddit.com/r/wine', score: 67, comments: 45, ago: 'Popular' },
    { title: 'Best bottles under $20?', subreddit: 'r/wine', url: 'https://reddit.com/r/wine', score: 42, comments: 18, ago: 'Popular' },
  ],
  nyc: [
    { title: 'Best natural wine bars in NYC?', subreddit: 'r/FoodNYC', url: 'https://reddit.com/r/FoodNYC', score: 42, comments: 18, ago: 'Popular' },
    { title: 'Wine store recommendations in Manhattan', subreddit: 'r/nyc', url: 'https://reddit.com/r/nyc', score: 38, comments: 24, ago: 'Popular' },
    { title: 'Good wine shops to visit in NYC?', subreddit: 'r/wine', url: 'https://reddit.com/r/wine', score: 8, comments: 27, ago: 'Popular' },
  ],
};

// ── Max age filters ─────────────────────────────────────────
const MAX_AGE_WINE = 7 * 24 * 3600 * 1000;  // 7 days for r/wine
const MAX_AGE_NYC  = 60 * 24 * 3600 * 1000;  // 60 days for NYC (less frequent)

// ── Recency + points ranking ────────────────────────────────
// Newer posts rank higher; high-score posts get a boost.
// This gives a "hot" feel without showing stale content.
function rankScore(post) {
  const ageHours = Math.max(1, (Date.now() - post.timestamp) / 3600000);
  // Reddit-style gravity: score decays with age
  return (post.score + post.comments * 2 + 1) / Math.pow(ageHours, 1.2);
}

// ── Deduplicate + format helper ─────────────────────────────
function dedupeAndFormat(posts, limit, maxAge) {
  const seen = new Set();
  const now = Date.now();
  return posts
    .filter((post) => {
      // Filter out posts older than max age
      if (now - post.timestamp > maxAge) return false;
      const key = post.title.toLowerCase().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => rankScore(b) - rankScore(a))
    .slice(0, limit)
    .map((post) => ({
      title: post.title,
      subreddit: post.subreddit,
      url: post.url,
      score: post.score,
      comments: post.comments,
      ago: timeAgo(post.timestamp),
    }));
}

// ── API Handler ───────────────────────────────────────────────
// Returns: { wine: [...], nyc: [...] }
// wine = r/wine hot posts (general wine content)
// nyc  = NYC-specific wine discussions, hashtag posts floated to top
export default async function handler(req, res) {
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cache);
  }

  try {
    // Fetch all subreddits (JSON first) + search queries in parallel
    const [winePosts, foodNycPosts, nycDrinksPosts, nycBarsPosts, nycPosts, askNycPosts, ...searchPosts] =
      await Promise.all([
        fetchSubredditJSON({ name: 'wine', alwaysRelevant: true }),
        fetchSubredditJSON({ name: 'FoodNYC', alwaysRelevant: false }),
        fetchSubredditJSON({ name: 'nycdrinks', alwaysRelevant: false }),
        fetchSubredditJSON({ name: 'NYCbars', alwaysRelevant: false }),
        fetchSubredditJSON({ name: 'nyc', alwaysRelevant: false }),
        fetchSubredditJSON({ name: 'AskNYC', alwaysRelevant: false }),
        ...SEARCH_QUERIES.map((q) => fetchSearchJSON(q)),
      ]);

    // If JSON failed for r/wine, try RSS fallback
    let wineSource = winePosts;
    if (wineSource.length === 0) {
      wineSource = await fetchSubredditRSS({ name: 'wine', alwaysRelevant: true });
    }

    // NYC bucket: all sources filtered for relevance (wine + NYC keywords).
    // Relevance is a FILTER only — sorting is by recency + points.
    // Exclude r/wine posts — they have their own dedicated row.
    const allNycCandidates = [
      ...searchPosts.flat(),
      ...foodNycPosts,
      ...nycDrinksPosts,
      ...nycBarsPosts,
      ...nycPosts,
      ...askNycPosts,
    ].filter(post => post.subreddit.toLowerCase() !== 'r/wine');
    const nycRaw = allNycCandidates.filter(isNYCWineRelated);

    // Both rows: sorted by recency + points, relevance is filter only
    const nycFormatted = dedupeAndFormat(nycRaw, 10, MAX_AGE_NYC);
    const wineFormatted = dedupeAndFormat(wineSource.filter(isWineRelated), 10, MAX_AGE_WINE);

    const result = {
      wine: wineFormatted.length > 0 ? wineFormatted : FALLBACK.wine,
      nyc: nycFormatted.length > 0 ? nycFormatted : FALLBACK.nyc,
    };

    cache = result;
    cacheTime = Date.now();

    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=300');
    return res.status(200).json(result);
  } catch (err) {
    console.error('Reddit API error:', err);

    // Try the daily-cached file before falling back to static posts
    try {
      const cachePath = path.join(process.cwd(), 'public', 'data', 'reddit-cache.json');
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      if (cached.wine?.length || cached.nyc?.length) {
        console.log('Using reddit-cache.json fallback');
        return res.status(200).json({ wine: cached.wine, nyc: cached.nyc });
      }
    } catch { /* cache file missing or invalid, fall through */ }

    return res.status(200).json(FALLBACK);
  }
}