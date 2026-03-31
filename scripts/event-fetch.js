#!/usr/bin/env node
// scripts/event-fetch.js

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

// ─── FIX 1: Normalize dates without timezone to Eastern time ───
function normalizeDate(dateStr) {
  if (!dateStr) return null;
  // If no timezone info, treat as Eastern time (not UTC)
  if (!/Z|[+-]\d{2}:?\d{2}$/.test(dateStr)) {
    // Use EST offset; EDT (-04:00) applies Mar-Nov but -05:00 is safe default
    return dateStr + '-05:00';
  }
  return dateStr;
}

function formatDay(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(normalizeDate(dateStr));
  return isNaN(d) ? '—' : d.getDate().toString();
}

function formatMonth(dateStr) {
  if (!dateStr) return 'Upcoming';
  const d = new Date(normalizeDate(dateStr));
  if (isNaN(d)) return 'Upcoming';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${months[d.getMonth()]} · ${days[d.getDay()]}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return null;
  const d = new Date(normalizeDate(dateStr));
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

// Fix Eventbrite image URLs — extract actual CDN URL from their image proxy
function fixImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('https://')) return url;  // already absolute
  if (url.includes('_next/image') && url.includes('url=')) {
    try {
      const match = url.match(/url=([^&]+)/);
      if (match) {
        const decoded = decodeURIComponent(match[1]); // decode ONCE only
        if (decoded.startsWith('http')) return decoded;
      }
    } catch { /* fall through */ }
  }
  if (url.startsWith('/')) return `https://www.eventbrite.com${url}`;
  return url;
}

async function fetchEventDetails(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { headers: HEADERS, signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const html = await response.text();

    const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        const items = Array.isArray(data) ? data : data['@graph'] || [data];
        for (const item of items) {
          if (item['@type'] && (item['@type'] === 'Event' || item['@type'].includes('Event') || item['@type'].includes('Festival'))) {
            // Try multiple sources for venue — never fall back to city name
            let venue = null;
            if (item.location?.name) {
              venue = item.location.name;
            } else if (item.location?.address?.name) {
              venue = item.location.address.name;
            } else if (item.organizer?.name) {
              const orgName = item.organizer.name;
              if (!orgName.toLowerCase().includes('eventbrite') && orgName.length > 0) {
                venue = orgName;
              }
            }

            // Try extracting venue from description ("at Venue Name")
            if (!venue && item.description) {
              const m = item.description.match(/(?:at|@)\s+((?:[A-Z][A-Za-z0-9''.\-]*(?:\s*[&]\s*[A-Z][A-Za-z0-9''.\-]*)*(?:\s+[A-Z][A-Za-z0-9''.\-]*(?:\s*[&]\s*[A-Z][A-Za-z0-9''.\-]*)*)*))/);
              if (m) {
                let v = m[1].trim()
                  .replace(/\s+(for|in|on|from|with|this|where|featuring|doors|tickets)\b.*/i, '')
                  .replace(/[.,;:]+$/, '')
                  .trim();
                if (v.length > 3 && !v.toLowerCase().includes('eventbrite')) {
                  venue = v;
                }
              }
            }

            return {
              title: item.name || null,
              venue,
              date: item.startDate || null,
              image: typeof item.image === 'string' ? item.image : (Array.isArray(item.image) ? item.image[0] : null),
            };
          }
        }
      } catch { /* skip */ }
    }

    const dateMatch = html.match(/<meta[^>]+property="event:start_time"[^>]+content="([^"]+)"/i)
      || html.match(/<time[^>]+datetime="([^"]+)"/i)
      || html.match(/"startDate"\s*:\s*"([^"]+)"/);
    const imgMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    const venueMatch = html.match(/<meta[^>]+property="event:location"[^>]+content="([^"]+)"/i);

    // Try HTML structure for venue if meta tags didn't find it
    let htmlVenue = null;
    if (!venueMatch) {
      const htmlVenueMatch = html.match(
        /<(?:h[2-3]|div|section|span)[^>]*class="[^"]*(?:venue|location-info)[^"]*"[^>]*>\s*([^<]+)/i
      );
      if (htmlVenueMatch) {
        htmlVenue = htmlVenueMatch[1].trim();
      }
      if (!htmlVenue) {
        const structuredMatch = html.match(
          /<(?:div|section|p)[^>]*data-testid="[^"]*location[^"]*"[^>]*>\s*([^<]+)/i
        );
        if (structuredMatch) {
          htmlVenue = structuredMatch[1].trim();
        }
      }
    }

    if (dateMatch || imgMatch) {
      return {
        title: null,
        venue: venueMatch ? venueMatch[1] : htmlVenue,
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
      console.error(`  Search error: ${err.message}`);
    }
  }

  console.log(`\n  Found ${eventUrls.length} unique event URLs`);

  // Step 2: Fetch details for each event (with rate limiting)
  const allEvents = [];
  let colorIdx = 0;

  for (const url of eventUrls.slice(0, 30)) { // limit to 30 events
    console.log(`  Fetching: ${url.split('/e/')[1]?.slice(0, 50) || url}`);
    const details = await fetchEventDetails(url);

    // Build title from slug as fallback
    const slug = url.split('/e/')[1] || '';
    const slugTitle = slug
      .replace(/-tickets.*$/, '')
      .replace(/-\d+$/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const title = details?.title || slugTitle || 'Wine Event';
    // Only use a venue we actually found — null means "unknown" and the
    // component will omit the venue line rather than show "New York City".
    const venue = details?.venue || null;
    const date = details?.date || null;
    const image = fixImageUrl(details?.image || null);

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
      id: allEvents.length + 1,
      color: COLORS[colorIdx % COLORS.length],
    });
    colorIdx++;

    // Brief pause to be polite to Eventbrite
    await new Promise((r) => setTimeout(r, 500));
  }

  // Sort by date
  allEvents.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(normalizeDate(a.date)) - new Date(normalizeDate(b.date));
  });

  // Write cache file
  const outputPath = path.join(__dirname, '..', 'public', 'data', 'events-cache.json');
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(allEvents, null, 2));
  console.log(`\n✓ Saved ${allEvents.length} events to ${outputPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
