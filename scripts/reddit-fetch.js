#!/usr/bin/env node
// scripts/reddit-fetch.js
// ─────────────────────────────────────────────────────────────
// Scheduled Reddit Wine Feed Fetcher
// Runs daily via GitHub Actions to build a cached JSON file
// at public/data/reddit-cache.json, used as fallback by
// pages/api/reddit.js when live fetching is slow or unavailable.
//
// RSS-FIRST strategy: Reddit's Atom/RSS feeds are far more
// permissive than the JSON API for server-side requests.
// JSON API is tried as a fallback for r/wine only.
// ─────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

// ── Configuration ────────────────────────────────────────────
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

const UA = 'NYCWine.com/1.0 (wine community aggregator; contact nycwine.com)';
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'reddit-cache.json');

const MAX_AGE_WINE = 14 * 24 * 3600 * 1000;
const MAX_AGE_NYC  = 180 * 24 * 3600 * 1000;

// ── Parse Reddit Atom feed ────────────────────────────────────
function parseRedditAtom(xml, subName, alwaysRelevant) {
  const posts = [];
  const entries = xml.split(/<entry[\s>]/i).slice(1);

  for (const entry of entries) {
    const titleRaw = (entry.match(/<title(?:[^>]*)>([\s\S]*?)<\/title>/i) || [])[1] || '';
    const title = titleRaw
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
      .replace(/\[link\].*$/, '').replace(/\[comments\].*$/, '')
      .trim();

    const linkMatch = entry.match(/<link[^>]+href="([^"]+)"[^>]*rel="alternate"/i)
      || entry.match(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/i)
      || entry.match(/<link[^>]+href="([^"]+)"/i);
    const url = linkMatch ? linkMatch[1].replace(/&amp;/g, '&') : '';

    const dateRaw = (entry.match(/<updated>([\s\S]*?)<\/updated>/i) || [])[1]
      || (entry.match(/<published>([\s\S]*?)<\/published>/i) || [])[1] || '';
    const timestamp = dateRaw ? new Date(dateRaw.trim()).getTime() : Date.now();

    const contentRaw = (entry.match(/<content[^>]*>([\s\S]*?)<\/content>/i) || [])[1] || '';
    const contentText = contentRaw.replace(/<[^>]+>/g, ' ').toLowerCase();

    const scoreMatch = contentRaw.match(/(\d+)\s*point/i);
    const commentsMatch = contentRaw.match(/(\d+)\s*comment/i);

    const subMatch = url.match(/\/r\/([^/]+)\//i);
    const subreddit = subMatch ? `r/${subMatch[1]}` : (subName ? `r/${subName}` : 'r/wine');

    if (!title || !url || isNaN(timestamp)) continue;

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

// ── Fetch a subreddit via RSS ────────────────────────────────
async function fetchSubredditRSS(subName, sort, alwaysRelevant) {
  sort = sort || 'hot';
  alwaysRelevant = alwaysRelevant || false;
  const url = 'https://www.reddit.com/r/' + subName + '/' + sort + '.rss?limit=25';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, text/xml, */*' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) { console.log('  RSS r/' + subName + '/' + sort + ': HTTP ' + res.status); return []; }
    const xml = await res.text();
    const posts = parseRedditAtom(xml, subName, alwaysRelevant);
    console.log('  RSS r/' + subName + '/' + sort + ': ' + posts.length + ' posts');
    return posts;
  } catch (err) {
    console.log('  RSS r/' + subName + '/' + sort + ' error: ' + err.message);
    return [];
  }
}

// ── Fetch Reddit search via RSS ──────────────────────────────
async function fetchSearchRSS(query) {
  const encoded = encodeURIComponent(query);
  const url = 'https://www.reddit.com/search.rss?q=' + encoded + '&sort=relevance&t=year&limit=25';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, text/xml, */*' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) { console.log('  RSS search "' + query + '": HTTP ' + res.status); return []; }
    const xml = await res.text();
    const posts = parseRedditAtom(xml, null, false);
    console.log('  RSS search "' + query + '": ' + posts.length + ' posts');
    return posts;
  } catch (err) {
    console.log('  RSS search "' + query + '" error: ' + err.message);
    return [];
  }
}

// ── JSON fallback for r/wine (has real scores) ───────────────
async function fetchWineJSON() {
  try {
    const res = await fetch('https://www.reddit.com/r/wine/hot.json?limit=25', {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) { console.log('  JSON r/wine: HTTP ' + res.status); return []; }
    const data = await res.json();
    return (data.data && data.data.children || [])
      .filter(function(c) { return !c.data.stickied; })
      .map(function(c) { return {
        title: c.data.title,
        subreddit: 'r/' + c.data.subreddit,
        url: 'https://reddit.com' + c.data.permalink,
        score: c.data.score || 0,
        comments: c.data.num_comments || 0,
        timestamp: c.data.created_utc * 1000,
        _alwaysRelevant: true,
        _text: (c.data.title + ' ' + (c.data.selftext || '')).toLowerCase(),
      }; });
  } catch (err) {
    console.log('  JSON r/wine error: ' + err.message);
    return [];
  }
}

// ── Relevance filters ────────────────────────────────────────
function nycRelevanceScore(post) {
  const text = post._text;
  const title = post.title.toLowerCase();
  const sub = post.subreddit.replace('r/', '').toLowerCase();
  if (BLOCKED_SUBREDDITS.indexOf(sub) >= 0) return 0;
  if (NYC_HASHTAGS.some(function(tag) { return text.indexOf(tag) >= 0; })) return 3;
  const titleHasWine = WINE_KEYWORDS.some(function(kw) { return title.indexOf(kw) >= 0; });
  const bodyHasWine  = WINE_KEYWORDS.some(function(kw) { return text.indexOf(kw) >= 0; });
  const hasNYC       = NYC_KEYWORDS.some(function(kw) { return text.indexOf(kw) >= 0; });
  if (NYC_SUBREDDITS.indexOf(sub) >= 0 && (titleHasWine || bodyHasWine)) return 2;
  if (titleHasWine && hasNYC) return 2;
  if (bodyHasWine && NYC_KEYWORDS.some(function(kw) { return title.indexOf(kw) >= 0; })) return 1;
  return 0;
}

function isNYCWineRelated(post) { return nycRelevanceScore(post) > 0; }
function isWineRelated(post) {
  return WINE_KEYWORDS.some(function(kw) { return post.title.toLowerCase().indexOf(kw) >= 0; });
}

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return hrs + 'h ago';
  if (days === 1) return 'Yesterday';
  return days + 'd ago';
}

function rankScore(post) {
  const ageHours = Math.max(1, (Date.now() - post.timestamp) / 3600000);
  return (post.score + post.comments * 2 + 1) / Math.pow(ageHours, 1.2);
}

function dedupeAndFormat(posts, limit, maxAge) {
  const seen = new Set();
  const now = Date.now();
  return posts
    .filter(function(post) {
      if (now - post.timestamp > maxAge) return false;
      const key = post.title.toLowerCase().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(function(a, b) { return rankScore(b) - rankScore(a); })
    .slice(0, limit)
    .map(function(post) { return {
      title: post.title,
      subreddit: post.subreddit,
      url: post.url,
      score: post.score,
      comments: post.comments,
      ago: timeAgo(post.timestamp),
    }; });
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('=== NYCWine Reddit Fetch (RSS-first) ===');
  console.log('Date: ' + new Date().toISOString());

  console.log('\nFetching via RSS...');
  const allResults = await Promise.all([
    fetchSubredditRSS('wine', 'hot', true),
    fetchSubredditRSS('FoodNYC', 'hot', false),
    fetchSubredditRSS('nycdrinks', 'hot', false),
    fetchSubredditRSS('NYCbars', 'hot', false),
    fetchSubredditRSS('nyc', 'hot', false),
    fetchSubredditRSS('AskNYC', 'hot', false),
  ].concat(SEARCH_QUERIES.map(fetchSearchRSS)));

  let wineRSS     = allResults[0];
  const foodNyc   = allResults[1];
  const nycDrinks = allResults[2];
  const nycBars   = allResults[3];
  const nycR      = allResults[4];
  const askNyc    = allResults[5];
  const searches  = allResults.slice(6);

  let wineSource = wineRSS;
  if (wineSource.length === 0) {
    console.log('\nr/wine RSS empty — trying JSON fallback...');
    wineSource = await fetchWineJSON();
  }

  const allNycCandidates = searches.reduce(function(acc, s) { return acc.concat(s); }, [])
    .concat(foodNyc, nycDrinks, nycBars, nycR, askNyc, wineSource);
  const nycRaw = allNycCandidates.filter(isNYCWineRelated);
  const nycUrls = new Set(nycRaw.map(function(p) { return p.url; }));
  const wineOnly = wineSource.filter(function(p) { return !nycUrls.has(p.url); });

  const nycFormatted  = dedupeAndFormat(nycRaw, 15, MAX_AGE_NYC);
  const wineFormatted = dedupeAndFormat(wineOnly.filter(isWineRelated), 15, MAX_AGE_WINE);

  const result = {
    wine: wineFormatted,
    nyc: nycFormatted,
    fetchedAt: new Date().toISOString(),
    stats: {
      winePostsFound: wineFormatted.length,
      nycPostsFound: nycFormatted.length,
      totalCandidatesWine: wineSource.length,
      totalCandidatesNyc: allNycCandidates.length,
    },
  };

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));

  console.log('\n✓ Saved ' + OUTPUT_PATH);
  console.log('  Wine posts: ' + result.stats.winePostsFound);
  console.log('  NYC posts:  ' + result.stats.nycPostsFound);
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  try {
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
      wine: [], nyc: [],
      fetchedAt: new Date().toISOString(),
      error: err.message,
      stats: { winePostsFound: 0, nycPostsFound: 0, totalCandidatesWine: 0, totalCandidatesNyc: 0 },
    }, null, 2));
    console.log('  Wrote empty cache due to error.');
  } catch(e2) { /* ignore */ }
  process.exit(1);
});
