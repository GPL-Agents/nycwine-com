// pages/api/events.js
// ─────────────────────────────────────────────────────────────
// Wine Events — scrapes Eventbrite search results for NYC wine
// events, then fetches each event page to get real dates,
// venues, and images from the per-page JSON-LD structured data.
//
// Also reads from a cached events JSON file (written daily by
// scripts/event-fetch.js) as a fallback/supplement.
//
// Endpoint: GET /api/events
// Returns: JSON array of event objects
// ─────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';

// ── In-memory cache ───────────────────────────────────────────
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ── Color cycling for cards without images ────────────────────
const COLORS = ['c1', 'c2', 'c3', 'c4', 'c5'];


// ── Shared fetch headers ──────────────────────────────────────
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ── Date helpers ──────────────────────────────────────────────
function formatDay(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d) ? '—' : d.getDate().toString();
}

function formatMonth(dateStr) {
  if (!dateStr) return 'Upcoming';
  const d = new Date(dateStr);
  if (isNaN(d)) return 'Upcoming';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === now.toDateString()) return `${months[d.getMonth()]} · Today`;
  if (d.toDateString() === tomorrow.toDateString()) return `${months[d.getMonth()]} · Tomorrow`;
  return `${months[d.getMonth()]} · ${days[d.getDay()]}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getTag(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('tasting') || t.includes('sampling')) return 'Tasting';
  if (t.includes('class') || t.includes('course') || t.includes('wset') || t.includes('education')) return 'Class';
  if (t.includes('dinner') || t.includes('pairing') || t.includes('brunch')) return 'Dinner';
  if (t.includes('festival') || t.includes('celebration') || t.includes('fest')) return 'Festival';
  return 'Event';
}

// ── Fetch a single Eventbrite event page for JSON-LD data ─────
async function fetchEventDetails(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      headers: HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const html = await response.text();

    // Extract JSON-LD
    const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        const items = Array.isArray(data) ? data : data['@graph'] || [data];
        for (const item of items) {
          if (item['@type'] === 'Event') {
            return {
              title: item.name || null,
              venue: item.location?.name || item.location?.address?.addressLocality || null,
              date: item.startDate || null,
              image: typeof item.image === 'string' ? item.image : (Array.isArray(item.image) ? item.image[0] : null),
              description: item.description ? item.description.substring(0, 200) : null,
            };
          }
        }
      } catch { /* skip bad JSON */ }
    }

    // Fallback: try to extract date from meta tags or page content
    const dateMatch = html.match(/<meta[^>]+property="event:start_time"[^>]+content="([^"]+)"/i)
      || html.match(/<time[^>]+datetime="([^"]+)"/i)
      || html.match(/"startDate"\s*:\s*"([^"]+)"/);
    const imgMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    const venueMatch = html.match(/<meta[^>]+property="event:location"[^>]+content="([^"]+)"/i);

    if (dateMatch || imgMatch) {
      return {
        title: null,
        venue: venueMatch ? venueMatch[1] : null,
        date: dateMatch ? dateMatch[1] : null,
        image: imgMatch ? imgMatch[1] : null,
        description: null,
      };
    }

    return null;
  } catch {
    return null;
  }
}

// ── Scrape Eventbrite search results ──────────────────────────
// Step 1: Get event URLs from search pages
// Step 2: Fetch each event page in parallel for dates/details
async function scrapeEventbrite() {
  const searchUrls = [
    'https://www.eventbrite.com/d/ny--new-york/wine/',
    'https://www.eventbrite.com/d/ny--new-york/wine-tasting/',
  ];

  const eventUrls = [];
  const seenUrls = new Set();

  // Step 1: Collect event URLs from search results
  for (const searchUrl of searchUrls) {
    try {
      const response = await fetch(searchUrl, { headers: HEADERS });
      if (!response.ok) continue;
      const html = await response.text();

      // First try JSON-LD on search page (sometimes works)
      const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      for (const match of jsonLdMatches) {
        try {
          const data = JSON.parse(match[1]);
          const items = Array.isArray(data) ? data : data['@graph'] || [data];
          for (const item of items) {
            if (item['@type'] === 'Event' && item.url && !seenUrls.has(item.url)) {
              const cleanUrl = item.url.replace(/\?aff=.*$/, '');
              seenUrls.add(cleanUrl);
              // If JSON-LD on search page has dates, use it directly
              if (item.startDate) {
                eventUrls.push({
                  url: cleanUrl,
                  prefetched: {
                    title: item.name || null,
                    venue: item.location?.name || item.location?.address?.addressLocality || null,
                    date: item.startDate,
                    image: typeof item.image === 'string' ? item.image : (Array.isArray(item.image) ? item.image[0] : null),
                  },
                });
              } else {
                eventUrls.push({ url: cleanUrl, prefetched: null });
              }
            }
          }
        } catch { /* skip bad JSON */ }
      }

      // Also extract event links from HTML
      const hrefMatches = [...html.matchAll(/href="([^"]+)"/g)]
        .map((m) => m[1])
        .filter((href) => href.includes('/e/') || href.includes('eventbrite.com/e/'))
        .map((href) => {
          if (href.startsWith('http')) return href.replace(/\?aff=.*$/, '');
          if (href.startsWith('/')) return `https://www.eventbrite.com${href}`.replace(/\?aff=.*$/, '');
          return href;
        });

      for (const url of hrefMatches) {
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          eventUrls.push({ url, prefetched: null });
        }
      }
    } catch (err) {
      console.warn(`Search scrape failed for ${searchUrl}:`, err.message);
    }
  }

  // Cap at 20 events to stay within serverless time limits
  const limited = eventUrls.slice(0, 20);

  // Step 2: For events without prefetched data, fetch individual pages in parallel
  const needsFetch = limited.filter((e) => !e.prefetched);
  const detailResults = await Promise.allSettled(
    needsFetch.map((e) => fetchEventDetails(e.url))
  );

  // Build a map of url → details
  const detailsMap = new Map();
  needsFetch.forEach((e, i) => {
    if (detailResults[i].status === 'fulfilled' && detailResults[i].value) {
      detailsMap.set(e.url, detailResults[i].value);
    }
  });

  // Step 3: Assemble final events
  const allEvents = [];
  for (const entry of limited) {
    const details = entry.prefetched || detailsMap.get(entry.url);
    const url = entry.url;

    // Build title from slug as fallback
    const slug = url.split('/e/')[1] || '';
    const slugTitle = slug
      .replace(/-tickets.*$/, '')
      .replace(/-\d+$/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const title = details?.title || slugTitle || 'Wine Event';
    const venue = details?.venue || 'New York City';
    const date = details?.date || null;
    const image = details?.image || null;

    allEvents.push({
      title,
      venue,
      date,
      dateDisplay: formatDateDisplay(date),
      day: formatDay(date),
      month: formatMonth(date),
      tag: getTag(title),
      url,
      image,
      source: 'Eventbrite',
    });
  }

  return allEvents;
}

// ── Read cached events file (from daily script) ───────────────
function readCachedEvents() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'events-cache.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return Array.isArray(data) ? data : [];
    }
  } catch {}
  return [];
}

// ── API Handler ───────────────────────────────────────────────
export default async function handler(req, res) {
  // Return in-memory cached data if fresh
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cache);
  }

  try {
    // Try live scrape first
    let events = await scrapeEventbrite();

    // If scrape returned nothing, fall back to cached file
    if (events.length === 0) {
      events = readCachedEvents();
    }

    // Remove past events — only show today or future
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    events = events.filter((ev) => {
      if (!ev.date) return true; // keep undated events (can't tell if past)
      return new Date(ev.date) >= startOfToday;
    });

    // Sort by date (events with dates first, then undated)
    events.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });

    // Add IDs and color cycling
    events = events.slice(0, 30).map((ev, i) => ({
      ...ev,
      id: i + 1,
      color: COLORS[i % COLORS.length],
    }));

    // Cache
    cache = events;
    cacheTime = Date.now();

    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=300');
    return res.status(200).json(events);
  } catch (err) {
    console.error('Events API error:', err);
    // Last resort: try cached file
    const fallback = readCachedEvents();
    if (fallback.length > 0) {
      return res.status(200).json(fallback);
    }
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
}
