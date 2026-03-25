#!/usr/bin/env node
// scripts/reddit-fetch.js
// ─────────────────────────────────────────────────────────────
// Scheduled Reddit Wine Feed Fetcher
// Runs daily via GitHub Actions to build a cached JSON file
// at public/data/reddit-cache.json, used as fallback by
// pages/api/reddit.js when live RSS is slow or unavailable.
//
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

const HEADERS = {
  'User-Agent': 'NYCWine.com/1.0 (wine community aggregator; scheduled fetch)',
  'Accept': 'application/rss+xml, application/xml, text/xml, */*',
};

const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'reddit-cache.json');

// ── RSS Parser ──────────────────────────────────────────────
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

// ── Fetch helpers ───────────────────────────────────────────
async function fetchSubredditRSS(sub) {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${sub.name}/hot.rss?limit=25`,
      { headers: HEADERS, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) {
      console.log(`  RSS r/${sub.name}: HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const posts = parseRedditRSS(xml, `r/${sub.name}`, sub.alwaysRelevant);
    console.log(`  RSS r/${sub.name}: ${posts.length} posts`);
    return posts;
  } catch (err) {
    console.log(`  RSS r/${sub.name} error: ${err.message}`);
    return [];
  }
}

// Also fetch "top this week" for higher-engagement posts
async function fetchSubredditTopRSS(sub) {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${sub.name}/top.rss?t=week&limit=25`,
      { headers: HEADERS, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const posts = parseRedditRSS(xml, `r/${sub.name}`, sub.alwaysRelevant);
    console.log(`  TOP r/${sub.name}: ${posts.length} posts`);
    return posts;
  } catch (err) {
    console.log(`  TOP r/${sub.name} error: ${err.message}`);
    return [];
  }
}

async function fetchSearchRSS(query) {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://www.reddit.com/search.rss?q=${encoded}&sort=relevance&t=year&limit=25`,
      { headers: HEADERS, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) {
      console.log(`  Search "${query}": HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const posts = parseRedditRSS(xml, `search: ${query}`, false);
    console.log(`  Search "${query}": ${posts.length} posts`);
    return posts;
  } catch (err) {
    console.log(`  Search "${query}" error: ${err.message}`);
    return [];
  }
}

async function fetchSubredditJSON(sub) {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${sub.name}/hot.json?limit=25`,
      {
        headers: { 'User-Agent': HEADERS['User-Agent'] },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const posts = (data.data?.children || []).map((child) => ({
      title: child.data.title,
      subreddit: `r/${child.data.subreddit}`,
      url: `https://reddit.com${child.data.permalink}`,
      score: child.data.score,
      comments: child.data.num_comments,
      timestamp: child.data.created_utc * 1000,
      _alwaysRelevant: sub.alwaysRelevant,
      _text: `${child.data.title} ${child.data.selftext || ''}`.toLowerCase(),
    }));
    console.log(`  JSON r/${sub.name}: ${posts.length} posts`);
    return posts;
  } catch {
    return [];
  }
}

// ── Relevance filters ───────────────────────────────────────
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

function isNYCWineRelated(post) {
  return nycRelevanceScore(post) > 0;
}

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

// ── Deduplicate + format + sort by engagement ───────────────
function dedupeAndFormat(posts, limit, scoreFn = null) {
  const seen = new Set();
  return posts
    .filter((post) => {
      const key = post.title.toLowerCase().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      // Primary: relevance tier (if provided)
      if (scoreFn) {
        const diff = scoreFn(b) - scoreFn(a);
        if (diff !== 0) return diff;
      }
      // Secondary: engagement (score + comments weighted)
      const engageA = a.score + a.comments * 2;
      const engageB = b.score + b.comments * 2;
      return engageB - engageA;
    })
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

  // Fetch all subreddits (hot + top) and search queries in parallel
  // Small delay between batches to be polite to Reddit
  console.log('\nFetching subreddit hot posts...');
  const subResults = await Promise.all(
    SUBREDDITS.map((sub) => fetchSubredditRSS(sub))
  );

  // Brief pause to avoid rate limiting
  await new Promise((r) => setTimeout(r, 2000));

  console.log('\nFetching subreddit top-of-week...');
  const topResults = await Promise.all(
    SUBREDDITS.map((sub) => fetchSubredditTopRSS(sub))
  );

  await new Promise((r) => setTimeout(r, 2000));

  console.log('\nFetching search queries...');
  const searchResults = await Promise.all(
    SEARCH_QUERIES.map((q) => fetchSearchRSS(q))
  );

  const [wineHot, foodNycHot, nycDrinksHot, nycBarsHot, nycHot, askNycHot] = subResults;
  const [wineTop] = topResults;

  // If RSS failed for r/wine, try JSON fallback
  let winePosts = [...wineHot, ...wineTop];
  if (winePosts.length === 0) {
    console.log('\nRSS failed for r/wine, trying JSON...');
    winePosts = await fetchSubredditJSON({ name: 'wine', alwaysRelevant: true });
  }

  // NYC bucket: exclude r/wine (they have their own row)
  const allNycCandidates = [
    ...searchResults.flat(),
    ...foodNycHot,
    ...nycDrinksHot,
    ...nycBarsHot,
    ...nycHot,
    ...askNycHot,
    // Also include top-of-week for NYC subs
    ...topResults[1], // FoodNYC top
    ...topResults[2], // nycdrinks top
    ...topResults[3], // NYCbars top
    ...topResults[4], // nyc top
    ...topResults[5], // AskNYC top
  ].filter(post => post.subreddit.toLowerCase() !== 'r/wine');

  const nycRaw = allNycCandidates.filter(isNYCWineRelated);

  // Format with engagement-weighted sorting
  const nycFormatted = dedupeAndFormat(nycRaw, 15, nycRelevanceScore);
  const wineFormatted = dedupeAndFormat(winePosts.filter(isWineRelated), 15);

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
