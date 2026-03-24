#!/usr/bin/env node
// scripts/event-fetch.js
// ─────────────────────────────────────────────────────────────
// Daily event fetcher — scrapes Eventbrite for NYC wine events,
// fetches each event page for real dates/venues/images,
// and writes the results to public/data/events-cache.json.
//
// This file serves as a static fallback for the API route,
// so even if the live scrape fails, the site has fresh events.
//
// Run manually:   node scripts/event-fetch.js
// Run via npm:    npm run fetch-events
// Schedule daily: via Vercel Cron, GitHub Actions, or crontab
// ─────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const SEARCH_URLS = [
  'https://www.eventbrite.com/d/ny--new-york/wine/',
  'https://www.eventbrite.com/d/ny--new-york/wine-tasting/',
  'https://www.eventbrite.com/d/ny--new-york/sommelier/',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

const COLORS = ['c1', 'c2', 'c3', 'c4', 'c5'];

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
  if (t.includes('class') || t.includes('course') || t.includes('wset')) return 'Class';
  if (t.includes('dinner') || t.includes('pairing')) return 'Dinner';
  if (t.includes('tasting') || t.includes('sampling')) return 'Tasting';
  if (t.includes('free') || t.includes('complimentary')) return 'Free';
  if (t.includes('festival')) return 'Festival';
  return 'Tasting';
}

// Fetch a single event page for JSON-LD details
async function fetchEventDetails(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { headers: HEADERS, signal: controller.signal });
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
            };
          }
        }
      } catch { /* skip */ }
    }

    // Fallback: meta tags
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
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function main() {
  console.log('=== NYCWine Event Fetch ===');
  console.log(`Date: ${new Date().toISOString()}`);

  const eventUrls = [];
  const seenUrls = new Set();

  // Step 1: Collect event URLs from search pages
  for (const searchUrl of SEARCH_URLS) {
    try {
      console.log(`  Fetching search: ${searchUrl}`);
      const response = await fetch(searchUrl, { headers: HEADERS });
      if (!response.ok) {
        console.warn(`  HTTP ${response.status}`);
        continue;
      }
      const html = await response.text();
      console.log(`  Got ${html.length} bytes`);

      // Extract event links from HTML
      const hrefMatches = [...html.matchAll(/href="([^"]+)"/g)]
        .map((m) => m[1])
        .filter((href) => href.includes('/e/'))
        .map((href) => {
          if (href.startsWith('http')) return href.replace(/\?aff=.*$/, '');
          if (href.startsWith('/')) return `https://www.eventbrite.com${href}`.replace(/\?aff=.*$/, '');
          return href;
        });

      for (const url of hrefMatches) {
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          eventUrls.push(url);
        }
      }
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }

  console.log(`\nFound ${eventUrls.length} unique event URLs`);

  // Step 2: Fetch each event page for details (limit to 25)
  const limited = eventUrls.slice(0, 25);
  console.log(`Fetching details for ${limited.length} events...`);

  const detailResults = await Promise.allSettled(
    limited.map((url) => fetchEventDetails(url))
  );

  // Step 3: Assemble events
  const allEvents = [];
  for (let i = 0; i < limited.length; i++) {
    const url = limited[i];
    const details = detailResults[i].status === 'fulfilled' ? detailResults[i].value : null;

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

    const status = date ? `${formatDateDisplay(date)}` : 'no date';
    console.log(`  [${i + 1}] ${title.substring(0, 50)} — ${status}`);
  }

  // Sort: dated events first, then undated
  allEvents.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
  });

  // Add IDs and colors
  const final = allEvents.slice(0, 30).map((ev, i) => ({
    ...ev,
    id: i + 1,
    color: COLORS[i % COLORS.length],
  }));

  // Write to public/data/events-cache.json
  const outDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, 'events-cache.json');
  fs.writeFileSync(outPath, JSON.stringify(final, null, 2));

  const withDates = final.filter((e) => e.date).length;
  console.log(`\nWrote ${final.length} events (${withDates} with dates) to ${outPath}`);
  console.log('Done!');
}

main().catch(console.error);
