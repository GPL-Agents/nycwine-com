#!/usr/bin/env node
// scripts/event-fetch.js
// ─────────────────────────────────────────────────────────────
// Daily event fetcher — scrapes Eventbrite for NYC wine events
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
  if (t.includes('class') || t.includes('course') || t.includes('wset')) return 'Class';
  if (t.includes('dinner') || t.includes('pairing')) return 'Dinner';
  if (t.includes('tasting') || t.includes('sampling')) return 'Tasting';
  if (t.includes('free') || t.includes('complimentary')) return 'Free';
  if (t.includes('festival')) return 'Festival';
  return 'Tasting';
}

async function scrapeSearch(searchUrl) {
  const events = [];

  try {
    console.log(`  Fetching: ${searchUrl}`);
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.warn(`  HTTP ${response.status} for ${searchUrl}`);
      return [];
    }

    const html = await response.text();
    console.log(`  Got ${html.length} bytes`);

    // Strategy 1: JSON-LD structured data
    const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        const items = Array.isArray(data) ? data : data['@graph'] || [data];
        for (const item of items) {
          if (item['@type'] === 'Event' && item.url) {
            events.push({
              title: item.name || 'Wine Event',
              venue: item.location?.name || item.location?.address?.addressLocality || 'New York City',
              date: item.startDate || null,
              dateDisplay: formatDateDisplay(item.startDate),
              day: formatDay(item.startDate),
              month: formatMonth(item.startDate),
              tag: getTag(item.name),
              url: item.url.replace(/\?aff=.*$/, ''),
              image: typeof item.image === 'string' ? item.image : (Array.isArray(item.image) ? item.image[0] : null),
              source: 'Eventbrite',
            });
          }
        }
      } catch { /* skip */ }
    }

    // Strategy 2: Fallback — parse links + slugs
    if (events.length === 0) {
      console.log('  No JSON-LD found, falling back to link parsing');
      const hrefMatches = [...html.matchAll(/href="([^"]+)"/g)]
        .map((m) => m[1])
        .filter((href) => href.includes('/e/'))
        .map((href) => {
          if (href.startsWith('http')) return href.replace(/\?aff=.*$/, '');
          if (href.startsWith('/')) return `https://www.eventbrite.com${href}`.replace(/\?aff=.*$/, '');
          return href;
        });

      const imgMatches = [...html.matchAll(/data-src="(https:\/\/img\.evbuc\.com[^"]+)"/g)]
        .map((m) => m[1]);

      const uniqueUrls = [...new Set(hrefMatches)];

      for (let i = 0; i < uniqueUrls.length; i++) {
        const url = uniqueUrls[i];
        const slug = url.split('/e/')[1] || '';
        const cleanTitle = slug
          .replace(/-tickets.*$/, '')
          .replace(/-\d+$/, '')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        events.push({
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

    console.log(`  Found ${events.length} events`);
  } catch (err) {
    console.error(`  Error scraping ${searchUrl}:`, err.message);
  }

  return events;
}

async function main() {
  console.log('=== NYCWine Event Fetch ===');
  console.log(`Date: ${new Date().toISOString()}`);

  const allEvents = [];
  const seenUrls = new Set();

  for (const url of SEARCH_URLS) {
    const events = await scrapeSearch(url);
    for (const ev of events) {
      if (!seenUrls.has(ev.url)) {
        seenUrls.add(ev.url);
        allEvents.push(ev);
      }
    }
  }

  // Sort: dated events first (chronological), then undated
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

  console.log(`\nWrote ${final.length} events to ${outPath}`);
  console.log('Done!');
}

main().catch(console.error);
