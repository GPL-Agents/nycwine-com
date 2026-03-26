// pages/api/reddit.js
// ─────────────────────────────────────────────────────────────
// Reddit Wine Feed — combines:
//   1. r/wine hot posts (general wine content, always fresh)
//   2. NYC-focused subreddits (wine-filtered)
//   3. Reddit search for NYC wine queries
//
// RSS-FIRST strategy: Reddit's Atom/RSS endpoints are far more
// permissive than the JSON API for server-side (Vercel) requests.
// JSON API is only used as a fallback for r/wine where scores matter.
// Falls back to daily-cached file, then to static posts.
// 30-minute in-memory cache.
// ─────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';

// ── Search queries for NYC wine content ──────────────────────
const SEARCH_QUERIES = [
  'nyc wine bar',
  'nyc wine tasting',
  'nyc wine store',
  'new york wine',
  'nycwine',
];

const WINE_KEYWORDS = [
  'wine',
  'wine bar', 'wine shop', 'wine store', 'winery', 'vineyard',
  'wine tasting', 'wine event', 'wine class', 'wine dinner',
  'wine festival', 'wine flight', 'corkage',
  'sommelier', 'terroir', 'appellation', 'decant',
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

const NYC_HASHTAGS = ['nycwine', 'nycwinereport', '#nycwine', '#nycwinereport'];

const BLOCKED_SUBREDDITS = [
  'shittyfoodporn', 'washingtondc', 'dc', 'philadelphia', 'boston',
  'chicago', 'losangeles', 'sanfrancisco', 'seattle', 'portland',
  'austin', 'denver', 'atlanta', 'miami', 'houston', 'dallas',
  'mildlyinteresting', 'pics', 'funny', 'todayilearned',
];

const NYC_SUBREDDITS = [
  'nyc', 'asknyc', 'foodnyc', 'nycdrinks', 'nycbars',
  'nycbitcheswithtaste', 'bedstuy', 'astoria', 'brooklyn',
  'manhattan', 'queens', 'bronx', 'statenisland',
  'williamsburg', 'parkslope', 'upperwestside', 'uppereastside',
];

// ── In-memory cache ───────────────────────────────────────────
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ── Shared fetch headers ──────────────────────────────────────
const HEADERS = {
  'User-Agent': 'NYCWine.com/1.0 (wine community aggregator; contact nycwine.com)',
  'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
};

// ── Parse Reddit Atom/RSS feed ────────────────────────────────
// Reddit returns Atom 1.0 feeds. Each post is an <entry>.
function parseRedditAtom(xml, subName, alwaysRelevant) {
  const posts = [];

  // Split on <entry> tags
  const entries = xml.split(/<entry[\s>]/i).slice(1);

  for (const entry of entries) {
    // Title — may be CDATA-wrapped or HTML-encoded
    const titleRaw = (entry.match(/<title(?:[^>]*)>([\s\S]*?)<\/title>/i) || [])[1] || '';
    const title = titleRaw
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&#x27;/g, "'")
      .replace(/\[link\].*$/, '')
      .replace(/\[comments\].*$/, '')
      .trim();

    // Link — <link href="..." rel="alternate"/>
    const linkMatch = entry.match(/<link[^>]+href="([^"]+)"[^>]*rel="alternate"/i)
      || entry.match(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/i)
      || entry.match(/<link[^>]+href="([^"]+)"/i);
    const url = linkMatch ? linkMatch[1].replace(/&amp;/g, '&') : '';

    // Date
    const dateRaw = (entry.match(/<updated>([\s\S]*?)<\/updated>/i) || [])[1]
      || (entry.match(/<published>([\s\S]*?)<\/published>/i) || [])[1]
      || '';
    const timestamp = dateRaw ? new Date(dateRaw.trim()).getTime() : Date.now();

    // Content / self-text — for scoring and filtering
    const contentRaw = (entry.match(/<content[^>]*>([\s\S]*?)<\/content>/i) || [])[1] || '';
    const contentText = contentRaw.replace(/<[^>]+>/g, ' ').toLowerCase();

    // Score and comments from content text
    const scoreMatch = contentRaw.match(/(\d+)\s*point/i);
    const commentsMatch = contentRaw.match(/(\d+)\s*comment/i);

    // Subreddit — from URL or feed name
    const subMatch = url.match(/\/r\/([^/]+)\//i);
    const subreddit = subMatch ? `r/${subMatch[1]}` : (subName ? `r/${subName}` : 'r/wine');

    if (!title || !url) continue;
    if (isNaN(timestamp)) continue;

    posts.push({
      title,
      subreddit,
      url,
      score: scoreMatch ? parseInt(scoreMatch[1], 10) : 1,
      comments: commentsMatch ? parseInt(commentsMatch[1], 10) : 0,
      timestamp,
      _alwaysRelevant: alwaysRelevant,
      _text: `${title} ${contentText}`.toLowerCase(),
    });
  }

  return posts;
}

// ── Fetch a subreddit via RSS (primary method) ────────────────
async function fetchSubredditRSS(subName, sort = 'hot', alwaysRelevant = false) {
  const url = `https://www.reddit.com/r/${subName}/${sort}.rss?limit=25`;
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.log(`RSS r/${subName}/${sort}: HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const posts = parseRedditAtom(xml, subName, alwaysRelevant);
    console.log(`RSS r/${subName}/${sort}: ${posts.length} posts`);
    return posts;
  } catch (err) {
    console.log(`RSS r/${subName}/${sort} error: ${err.message}`);
    return [];
  }
}

// ── Fetch Reddit search via RSS ───────────────────────────────
// Reddit supports search RSS: /search.rss?q=...&sort=relevance
async function fetchSearchRSS(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://www.reddit.com/search.rss?q=${encoded}&sort=relevance&t=year&limit=25`;
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.log(`RSS search "${query}": HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const posts = parseRedditAtom(xml, null, false);
    console.log(`RSS search "${query}": ${posts.length} posts`);
    return posts;
  } catch (err) {
    console.log(`RSS search "${query}" error: ${err.message}`);
    return [];
  }
}

// ── Fallback: fetch r/wine via JSON API (has real scores) ─────
async function fetchWineJSON() {
  const sub = { name: 'wine', alwaysRelevant: true };
  try {
    const res = await fetch(
      `https://www.reddit.com/r/wine/hot.json?limit=25`,
      {
        headers: { 'User-Agent': HEADERS['User-Agent'] },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) {
      console.log(`JSON r/wine: HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return (data.data?.children || [])
      .filter((c) => !c.data.stickied)
      .map((c) => ({
        title: c.data.title,
        subreddit: `r/${c.data.subreddit}`,
        url: `https://reddit.com${c.data.permalink}`,
        score: c.data.score || 0,
        comments: c.data.num_comments || 0,
        timestamp: c.data.created_utc * 1000,
        _alwaysRelevant: true,
        _text: `${c.data.title} ${c.data.selftext || ''}`.toLowerCase(),
      }));
  } catch (err) {
    console.log(`JSON r/wine error: ${err.message}`);
    return [];
  }
}

// ── Relevance filters ─────────────────────────────────────────
function nycRelevanceScore(post) {
  const text = post._text;
  const title = post.title.toLowerCase();
  const sub = post.subreddit.replace('r/', '').toLowerCase();

  if (BLOCKED_SUBREDDITS.includes(sub)) return 0;
  if (NYC_HASHTAGS.some((tag) => text.includes(tag))) return 3;

  const titleHasWine = WINE_KEYWORDS.some((kw) => title.includes(kw));
  const bodyHasWine = WINE_KEYWORDS.some((kw) => text.includes(kw));
  const hasNYC = NYC_KEYWORDS.some((kw) => text.includes(kw));

  if (NYC_SUBREDDITS.includes(sub) && (titleHasWine || bodyHasWine)) return 2;
  if (titleHasWine && hasNYC) return 2;
  if (bodyHasWine && NYC_KEYWORDS.some((kw) => title.includes(kw))) return 1;
  return 0;
}

function isNYCWineRelated(post) { return nycRelevanceScore(post) > 0; }
function isWineRelated(post) {
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

// ── Ranking: recency + engagement ────────────────────────────
function rankScore(post) {
  const ageHours = Math.max(1, (Date.now() - post.timestamp) / 3600000);
  return (post.score + post.comments * 2 + 1) / Math.pow(ageHours, 1.2);
}

// ── Deduplicate + format + sort ───────────────────────────────
const MAX_AGE_WINE = 14 * 24 * 3600 * 1000;   // 14 days
const MAX_AGE_NYC  = 180 * 24 * 3600 * 1000;  // 180 days

function dedupeAndFormat(posts, limit, maxAge) {
  const seen = new Set();
  const now = Date.now();
  return posts
    .filter((post) => {
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

// ── Static fallback posts ─────────────────────────────────────
const FALLBACK = {
  wine: [
    { title: 'What wine are you drinking this weekend?', subreddit: 'r/wine', url: 'https://reddit.com/r/wine', score: 67, comments: 45, ago: 'Popular' },
    { title: 'Best bottles under $20?', subreddit: 'r/wine', url: 'https://reddit.com/r/wine', score: 42, comments: 18, ago: 'Popular' },
    { title: 'First time trying a natural wine — thoughts?', subreddit: 'r/wine', url: 'https://reddit.com/r/wine', score: 35, comments: 22, ago: 'Popular' },
    { title: 'Pinot Noir recommendations for a dinner party', subreddit: 'r/wine', url: 'https://reddit.com/r/wine', score: 28, comments: 31, ago: 'Popular' },
    { title: 'Champagne vs Prosecco — which do you prefer?', subreddit: 'r/wine', url: 'https://reddit.com/r/wine', score: 54, comments: 39, ago: 'Popular' },
  ],
  nyc: [
    { title: 'Best natural wine bars in NYC?', subreddit: 'r/FoodNYC', url: 'https://reddit.com/r/FoodNYC', score: 42, comments: 18, ago: 'Popular' },
    { title: 'Wine store recommendations in Manhattan', subreddit: 'r/nyc', url: 'https://reddit.com/r/nyc', score: 38, comments: 24, ago: 'Popular' },
    { title: 'Good wine shops to visit in NYC?', subreddit: 'r/AskNYC', url: 'https://reddit.com/r/AskNYC', score: 29, comments: 27, ago: 'Popular' },
    { title: 'Wine tasting events happening this month in Brooklyn?', subreddit: 'r/brooklyn', url: 'https://reddit.com/r/brooklyn', score: 15, comments: 12, ago: 'Popular' },
    { title: 'Best BYOB restaurants in Manhattan?', subreddit: 'r/FoodNYC', url: 'https://reddit.com/r/FoodNYC', score: 33, comments: 21, ago: 'Popular' },
  ],
};

// ── API Handler ───────────────────────────────────────────────
export default async function handler(req, res) {
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cache);
  }

  try {
    // ── Fetch via RSS (primary) + JSON fallback for r/wine ──
    console.log('Fetching Reddit feeds via RSS...');

    const [
      wineRSS,        // r/wine hot — RSS
      foodNycRSS,     // r/FoodNYC — RSS
      nycDrinksRSS,   // r/nycdrinks — RSS
      nycBarsRSS,     // r/NYCbars — RSS
      nycRSS,         // r/nyc — RSS
      askNycRSS,      // r/AskNYC — RSS
      ...searchRSS    // search queries — RSS
    ] = await Promise.all([
      fetchSubredditRSS('wine', 'hot', true),
      fetchSubredditRSS('FoodNYC', 'hot', false),
      fetchSubredditRSS('nycdrinks', 'hot', false),
      fetchSubredditRSS('NYCbars', 'hot', false),
      fetchSubredditRSS('nyc', 'hot', false),
      fetchSubredditRSS('AskNYC', 'hot', false),
      ...SEARCH_QUERIES.map((q) => fetchSearchRSS(q)),
    ]);

    // If r/wine RSS came back empty, try JSON API as fallback
    let wineSource = wineRSS;
    if (wineSource.length === 0) {
      console.log('r/wine RSS empty — trying JSON fallback...');
      wineSource = await fetchWineJSON();
    }

    // NYC bucket: all sources filtered for wine + NYC relevance
    const allNycCandidates = [
      ...searchRSS.flat(),
      ...foodNycRSS,
      ...nycDrinksRSS,
      ...nycBarsRSS,
      ...nycRSS,
      ...askNycRSS,
      ...wineSource,   // r/wine posts mentioning NYC also qualify
    ];
    const nycRaw = allNycCandidates.filter(isNYCWineRelated);

    // Wine row: r/wine only, exclude posts already in NYC row
    const nycUrls = new Set(nycRaw.map((p) => p.url));
    const wineOnly = wineSource.filter((p) => !nycUrls.has(p.url));

    const nycFormatted  = dedupeAndFormat(nycRaw, 10, MAX_AGE_NYC);
    const wineFormatted = dedupeAndFormat(wineOnly.filter(isWineRelated), 10, MAX_AGE_WINE);

    const result = {
      wine: wineFormatted.length > 0 ? wineFormatted : FALLBACK.wine,
      nyc:  nycFormatted.length  > 0 ? nycFormatted  : FALLBACK.nyc,
    };

    cache = result;
    cacheTime = Date.now();

    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=300');
    return res.status(200).json(result);

  } catch (err) {
    console.error('Reddit API error:', err);

    // Try daily-cached file before falling back to static posts
    try {
      const cachePath = path.join(process.cwd(), 'public', 'data', 'reddit-cache.json');
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      if (cached.wine?.length || cached.nyc?.length) {
        console.log('Using reddit-cache.json fallback');
        return res.status(200).json({ wine: cached.wine, nyc: cached.nyc });
      }
    } catch { /* cache file missing or invalid */ }

    return res.status(200).json(FALLBACK);
  }
}
