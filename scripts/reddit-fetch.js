#!/usr/bin/env node
// scripts/reddit-fetch.js
// ─────────────────────────────────────────────────────────────
// Scheduled Reddit Wine Feed Fetcher
// Runs daily via GitHub Actions to build a cached JSON file
// at public/data/reddit-cache.json, used as fallback by
// pages/api/reddit.js when live fetching is slow or unavailable.
//
// Uses JSON endpoints (preferred — has scores/comments).
// Falls back to RSS if JSON fails.
// Mirrors the same logic as the API endpoint.
// ─────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

// ── Configuration ───────────────────────────────────────────
const SUBREDDITS = [
  { name: 'wine', alwaysRelevant: true },
  { name: 'FoodNYC', alwaysRelevant: false },
  { name: 'nycdrinks', alwaysRelevant: false },
  { name: 'NYCbars', alwaysRelevant: false },
  { name: 'nyc', alwaysRelevant: false },
  { name: 'AskNYC', alwaysRelevant: false },
];

const SEARCH_QUERIES = [
  'nycwine',
  'nycwinereport',
  'nyc wine bar',
  'nyc wine tasting',
  'nyc wine store',
  'new york wine',
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

const NYC_HASHTAGS = [
  'nycwine', 'nycwinereport', '#nycwine', '#nycwinereport',
];

const NYC_SUBREDDITS = [
  'nyc', 'asknyc', 'foodnyc', 'nycdrinks', 'nycbars',
  'nycbitcheswithtaste', 'bedstuy', 'astoria', 'brooklyn',
  'manhattan', 'queens', 'bronx', 'statenisland',
  'williamsburg', 'parkslope', 'upperwestside', 'uppereastside',
];

const BLOCKED_SUBREDDITS = [
  'shittyfoodporn', 'washingtondc', 'dc', 'philadelphia', 'boston',
  'chicago', 'losangeles', 'sanfrancisco', 'seattle', 'portland',
  'austin', 'denver', 'atlanta', 'miami', 'houston', 'dallas',
  'mildlyinteresting', 'pics', 'funny', 'todayilearned',
];

const UA = 'NYCWine.com/1.0 (wine community aggregator; scheduled fetch)';
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'reddit-cache.json');

const MAX_AGE_WINE = 7 * 24 * 3600 * 1000;   // 7 days
const MAX_AGE_NYC  = 60 * 24 * 3600 * 1000;   // 60 days

// ── JSON fetchers (preferred — has real scores) ─────────────
async function fetchSubredditJSON(sub) {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${sub.name}/hot.json?limit=25`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) { console.log(`  JSON r/${sub.name}: HTTP ${res.status}`); return []; }
    const data = await res.json();
    const posts = (data.data?.children || [])
      .filter((child) => !child.data.stickied)
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
    console.log(`  JSON r/${sub.name}: ${posts.length} posts`);
    return posts;
  } catch (err) {
    console.log(`  JSON r/${sub.name} error: ${err.message}`);
    return [];
  }
}

async function fetchSearchJSON(query) {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://www.reddit.com/search.json?q=${encoded}&sort=new&t=month&limit=25`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) { console.log(`  Search "${query}": HTTP ${res.status}`); return []; }
    const data = await res.json();
    const posts = (data.data?.children || [])
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
    console.log(`  Search "${query}": ${posts.length} posts`);
    return posts;
  } catch (err) {
    console.log(`  Search "${query}" error: ${err.message}`);
    return [];
  }
}

// ── Relevance filters (used as FILTERS, not sort priority) ──
function nycRelevanceScore(post) {
  const text = post._text;
  const title = post.title.toLowerCase();
  const sub = post.subreddit.replace('r/', '').toLowerCase();
  if (BLOCKED_SUBREDDITS.includes(sub)) return 0;
  if (NYC_HASHTAGS.some((tag) => text.includes(tag))) return 3;
  const titleHasWine = WINE_KEYWORDS.some((kw) => title.includes(kw));
  if (!titleHasWine) return 0;
  if (NYC_SUBREDDITS.includes(sub)) return 2;
  const hasNYC = NYC_KEYWORDS.some((kw) => text.includes(kw));
  if (hasNYC) return 2;
  return 0;
}

function isNYCWineRelated(post) { return nycRelevanceScore(post) > 0; }
function isWineRelated(post) {
  return WINE_KEYWORDS.some((kw) => post.title.toLowerCase().includes(kw));
}

// ── Time-ago helper ─────────────────────────────────────────
function timeAgo(ms) {
  const diff = Date.now() - ms;
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// ── Recency + points ranking ────────────────────────────────
function rankScore(post) {
  const ageHours = Math.max(1, (Date.now() - post.timestamp) / 3600000);
  return (post.score + post.comments * 2 + 1) / Math.pow(ageHours, 1.2);
}

// ── Deduplicate + format + sort by recency+points ───────────
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

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log('=== NYCWine Reddit Fetch ===');
  console.log(`Date: ${new Date().toISOString()}`);

  // Fetch all subreddits via JSON + search queries in parallel
  console.log('\nFetching subreddit posts (JSON)...');
  const subResults = await Promise.all(
    SUBREDDITS.map((sub) => fetchSubredditJSON(sub))
  );

  // Brief pause to avoid rate limiting
  await new Promise((r) => setTimeout(r, 2000));

  console.log('\nFetching search queries (JSON)...');
  const searchResults = await Promise.all(
    SEARCH_QUERIES.map((q) => fetchSearchJSON(q))
  );

  const [winePosts, foodNycPosts, nycDrinksPosts, nycBarsPosts, nycPosts, askNycPosts] = subResults;

  // NYC bucket: exclude r/wine (they have their own row)
  const allNycCandidates = [
    ...searchResults.flat(),
    ...foodNycPosts,
    ...nycDrinksPosts,
    ...nycBarsPosts,
    ...nycPosts,
    ...askNycPosts,
  ].filter(post => post.subreddit.toLowerCase() !== 'r/wine');

  const nycRaw = allNycCandidates.filter(isNYCWineRelated);

  // Sort by recency + points (relevance is filter only)
  const nycFormatted = dedupeAndFormat(nycRaw, 15, MAX_AGE_NYC);
  const wineFormatted = dedupeAndFormat(winePosts.filter(isWineRelated), 15, MAX_AGE_WINE);

  const result = {
    wine: wineFormatted,
    nyc: nycFormatted,
    fetchedAt: new Date().toISOString(),
    stats: {
      winePostsFound: wineFormatted.length,
      nycPostsFound: nycFormatted.length,
      totalCandidatesWine: winePosts.length,
      totalCandidatesNyc: allNycCandidates.length,
    },
  };

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(`\n✓ Saved ${OUTPUT_PATH}`);
  console.log(`  Wine posts: ${result.stats.winePostsFound}`);
  console.log(`  NYC posts:  ${result.stats.nycPostsFound}`);
  console.log(`  Fetched at: ${result.fetchedAt}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
