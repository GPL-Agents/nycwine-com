// pages/api/news.js
// ─────────────────────────────────────────────────────────────
// RSS News Aggregator — fetches wine news from 13 sources,
// filters by wine keywords, merges and sorts by date.
//
// Endpoint: GET /api/news
// Returns: JSON array of news items
//
// Uses in-memory cache (60 min) so we don't hammer RSS feeds
// on every page load. Vercel serverless functions restart
// periodically, so worst case the cache refreshes naturally.
// ─────────────────────────────────────────────────────────────

import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'NYCWine.com News Aggregator',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: false }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
      ['enclosure', 'enclosure', { keepArray: false }],
    ],
  },
});

// ── Image extraction helper ─────────────────────────────────
// RSS feeds store images in different places depending on the
// publisher. We check multiple fields in priority order.
function extractImage(item) {
  // 1. media:content (most common — Decanter, Wine Enthusiast, VinePair)
  if (item.mediaContent) {
    const url = item.mediaContent.$ ? item.mediaContent.$.url : item.mediaContent.url;
    if (url) return url;
  }
  // 2. media:thumbnail
  if (item.mediaThumbnail) {
    const url = item.mediaThumbnail.$ ? item.mediaThumbnail.$.url : item.mediaThumbnail.url;
    if (url) return url;
  }
  // 3. enclosure (podcasts and some blogs)
  if (item.enclosure && item.enclosure.url && (item.enclosure.type || '').startsWith('image')) {
    return item.enclosure.url;
  }
  // 4. First <img> in content:encoded or content HTML
  const html = item['content:encoded'] || item.content || '';
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) return imgMatch[1];
  return null;
}

// ── RSS Feed Sources ──────────────────────────────────────────
// filterByKeyword: true = general publication, needs wine filtering
// filterByKeyword: false = wine-only publication, all articles relevant
const FEEDS = [
  {
    name: 'NY Times',
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/DiningandWine.xml',
    emoji: '📰',
    color: '#1a1a1a',
    filterByKeyword: true,
  },
  {
    name: 'NY Post',
    url: 'https://nypost.com/food/feed/',
    emoji: '🗞️',
    color: '#c41200',
    filterByKeyword: true,
  },
  {
    name: 'Eater NY',
    url: 'https://ny.eater.com/rss/index.xml',
    emoji: '🍴',
    color: '#e4002b',
    filterByKeyword: true,
  },
  {
    name: 'Grub St.',
    url: 'https://www.grubstreet.com/feed/rss',
    emoji: '🍽️',
    color: '#333',
    filterByKeyword: true,
  },
  {
    name: 'VinePair',
    url: 'https://vinepair.com/feed/',
    emoji: '🍷',
    color: '#8b0000',
    filterByKeyword: false,
  },
  {
    name: 'Wine Spectator',
    url: 'https://www.winespectator.com/rss/rss',
    emoji: '🏆',
    color: '#800020',
    filterByKeyword: false,
  },
  {
    name: 'Decanter',
    url: 'https://www.decanter.com/feed/',
    emoji: '🥂',
    color: '#722f37',
    filterByKeyword: false,
  },
  {
    name: 'Wine Enthusiast',
    url: 'https://www.winemag.com/feed/',
    emoji: '🍇',
    color: '#4a0e2e',
    filterByKeyword: false,
  },
  // ── NYC-specific sources ──────────────────────────────────
  {
    name: 'Grape Collective',
    url: 'https://grapecollective.com/articles/rss',
    emoji: '🗽',
    color: '#5b2c6f',
    filterByKeyword: false,
    nycLocal: true,
  },
  {
    name: 'Dame Wine',
    url: 'https://damewine.com/feed/',
    emoji: '🌹',
    color: '#c0392b',
    filterByKeyword: false,
    nycLocal: true,
  },
  // ── Additional wine publications ──────────────────────────
  {
    name: 'SevenFifty Daily',
    url: 'https://daily.sevenfifty.com/feed/',
    emoji: '📋',
    color: '#2c3e50',
    filterByKeyword: false,
  },
  {
    name: 'PUNCH',
    url: 'https://punchdrink.com/feed/',
    emoji: '🍸',
    color: '#e74c3c',
    filterByKeyword: true,
  },
  {
    name: 'Wine Folly',
    url: 'https://winefolly.com/feed/',
    emoji: '📚',
    color: '#6c3461',
    filterByKeyword: false,
  },
  {
    name: 'Imbibe',
    url: 'https://imbibemagazine.com/feed/',
    emoji: '🍾',
    color: '#2e7d32',
    filterByKeyword: true,
  },
];

// ── Wine keyword filter ───────────────────────────────────────
const WINE_KEYWORDS = [
  'wine', 'winery', 'vineyard', 'tasting', 'sommelier',
  'champagne', 'rosé', 'rose', 'bordeaux', 'pinot',
  'chardonnay', 'merlot', 'cabernet', 'prosecco', 'cava',
  'riesling', 'sauvignon', 'syrah', 'malbec', 'zinfandel',
  'burgundy', 'barolo', 'chianti', 'rioja', 'moscato',
  'natural wine', 'wine bar', 'wine shop', 'wine store',
];

function matchesWineKeywords(text) {
  const lower = (text || '').toLowerCase();
  return WINE_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── In-memory cache ───────────────────────────────────────────
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes

// ── Time-ago helper ───────────────────────────────────────────
function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ── Fetch a single feed (with error handling) ─────────────────
async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    const items = (feed.items || []).map((item) => ({
      title: (item.title || '').trim(),
      link: item.link || '',
      date: item.isoDate || item.pubDate || '',
      source: source.name,
      emoji: source.emoji,
      color: source.color,
      image: extractImage(item),
      snippet: (item.contentSnippet || '').slice(0, 120).trim() || null,
    }));

    // Apply keyword filter if needed
    if (source.filterByKeyword) {
      return items.filter(
        (item) =>
          matchesWineKeywords(item.title) ||
          matchesWineKeywords(item.contentSnippet || item.content || '')
      );
    }
    return items;
  } catch (err) {
    console.warn(`RSS fetch failed for ${source.name}:`, err.message);
    return [];
  }
}

// ── API Handler ───────────────────────────────────────────────
export default async function handler(req, res) {
  // Return cached data if still fresh
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cache);
  }

  try {
    // Fetch all feeds in parallel
    const results = await Promise.allSettled(
      FEEDS.map((source) => fetchFeed(source))
    );

    // Flatten all items
    const allItems = results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    // Sort by date (newest first)
    allItems.sort((a, b) => {
      const da = new Date(a.date).getTime() || 0;
      const db = new Date(b.date).getTime() || 0;
      return db - da;
    });

    // Add relative time
    const items = allItems.slice(0, 20).map((item) => ({
      ...item,
      ago: item.date ? timeAgo(item.date) : '',
    }));

    // Cache the result
    cache = items;
    cacheTime = Date.now();

    // Cache header for CDN/browser (5 min browser, 60 min CDN)
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=300'
    );
    return res.status(200).json(items);
  } catch (err) {
    console.error('News API error:', err);
    return res.status(500).json({ error: 'Failed to fetch news' });
  }
}
