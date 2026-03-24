// pages/api/events.js
// ─────────────────────────────────────────────────────────────
// Wine Events — scrapes Eventbrite search results for NYC wine
// events. Extracts titles, dates, venues, images, and URLs.
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

// ── Date helpers ──────────────────────────────────────────────
function formatDay(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d) ? '—' : d.getDate().toString();
}

function formatMonth(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === now.toDateString()) return `${months[d.getMonth()]} · Today`;
  if (d.toDateString() === tomorrow.toDateString()) return `${months[d.getMonth()]} · Tomorrow`;
  return `${months[d.getMonth()]} ${d.getDate()} · ${days[d.getDay()]}`;
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
  if (t.includes('class') || t.includes('course') || t.includes('wset') || t.includes('education')) return 'Class';
  if (t.includes('dinner') || t.includes('pairing')) return 'Dinner';
  if (t.includes('tasting') || t.includes('sampling')) return 'Tasting';
  if (t.includes('free') || t.includes('complimentary')) return 'Free';
  if (t.includes('festival') || t.includes('celebration')) return 'Festival';
  if (t.includes('brunch')) return 'Brunch';
  return 'Tasting';
}

// ── Scrape Eventbrite search results ──────────────────────────
// Eventbrite embeds structured data as JSON-LD in the HTML.
// We also parse the server-rendered HTML for additional data.
async function scrapeEventbrite() {
  const searchUrls = [
    'https://www.eventbrite.com/d/ny--new-york/wine/',
    'https://www.eventbrite.com/d/ny--new-york/wine-tasting/',
  ];

  const allEvents = [];
  const seenUrls = new Set();

  for (const searchUrl of searchUrls) {
    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (!response.ok) continue;
      const html = await response.text();

      // Strategy 1: Extract JSON-LD structured data (most reliable)
      const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      for (const match of jsonLdMatches) {
        try {
          const data = JSON.parse(match[1]);
          const items = Array.isArray(data) ? data : data['@graph'] || [data];
          for (const item of items) {
            if (item['@type'] === 'Event' && item.url && !seenUrls.has(item.url)) {
              seenUrls.add(item.url);
              allEvents.push({
                title: item.name || 'Wine Event',
                venue: item.location?.name || item.location?.address?.addressLocality || 'New York City',
                date: item.startDate || null,
                dateDisplay: formatDateDisplay(item.startDate),
                day: formatDay(item.startDate),
                month: formatMonth(item.startDate),
                tag: getTag(item.name),
                url: item.url.replace(/\?aff=.*$/, ''),
                image: item.image || (Array.isArray(item.image) ? item.image[0] : null) || null,
                source: 'Eventbrite',
              });
            }
          }
        } catch { /* skip bad JSON */ }
      }

      // Strategy 2: Fallback — parse event links from HTML and extract
      // what we can from the surrounding markup
      if (allEvents.length === 0) {
        // Extract event URLs
        const hrefMatches = [...html.matchAll(/href="([^"]+)"/g)]
          .map((m) => m[1])
          .filter((href) => href.includes('/e/') || href.includes('eventbrite.com/e/'))
          .map((href) => {
            if (href.startsWith('http')) return href.replace(/\?aff=.*$/, '');
            if (href.startsWith('/')) return `https://www.eventbrite.com${href}`.replace(/\?aff=.*$/, '');
            return href;
          });

        const uniqueUrls = [...new Set(hrefMatches)].filter((u) => !seenUrls.has(u));

        // Try to extract image URLs near event links
        const imgMatches = [...html.matchAll(/data-src="(https:\/\/img\.evbuc\.com[^"]+)"/g)]
          .map((m) => m[1]);

        for (let i = 0; i < uniqueUrls.length; i++) {
          const url = uniqueUrls[i];
          seenUrls.add(url);

          // Build title from slug
          const slug = url.split('/e/')[1] || '';
          const cleanTitle = slug
            .replace(/-tickets.*$/, '')
            .replace(/-\d+$/, '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());

          allEvents.push({
            title: cleanTitle || 'Wine Event',
            venue: 'New York City',
            date: null,
            dateDisplay: null,
            day: '—',
            month: 'Upcoming',
            tag: getTag(cleanTitle),
            url,
            image: imgMatches[i] || null,
            source: 'Eventbrite',
          });
        }
      }
    } catch (err) {
      console.warn(`Scrape failed for ${searchUrl}:`, err.message);
    }
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
