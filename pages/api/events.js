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

// ── Fix Eventbrite image URLs ─────────────────────────────────
// Eventbrite returns relative URLs like /e/_next/image?url=<encoded>
// which only work on eventbrite.com. Extract the real CDN URL
// by decoding the url= parameter ONCE (not twice — the inner
// path must stay percent-encoded for img.evbuc.com to work).
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

// ── Shared fetch headers ──────────────────────────────────────
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ── Venue sanitizer ───────────────────────────────────────────
// Returns null if the venue string is just a city/region name (not a real venue).
const CITY_ONLY_VENUES = new Set([
  'new york city', 'new york', 'ny', 'n.y.', 'new york, ny', 'new york, new york',
  'new york city, ny', 'new york city, new york', 'nyc', 'manhattan',
  'brooklyn', 'queens', 'bronx', 'the bronx', 'staten island',
  'online', 'online event', 'virtual', 'virtual event', 'tba', 'tbd', 'venue tba',
]);

function sanitizeVenue(v) {
  if (!v) return null;
  const trimmed = v.trim();
  if (CITY_ONLY_VENUES.has(trimmed.toLowerCase())) return null;
  if (trimmed.length < 3) return null;
  return trimmed;
}

// ── Date helpers ──────────────────────────────────────────────
// Parse the LOCAL time components from an ISO string like
// "2026-05-01T18:30:00-04:00" without converting to UTC.
// This ensures times display correctly regardless of server timezone.
function parseLocal(dateStr) {
  if (!dateStr) return null;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) {
    const d = new Date(dateStr);
    return isNaN(d) ? null : d;
  }
  // Construct a Date using local components (month is 0-based)
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

function formatDay(dateStr) {
  const d = parseLocal(dateStr);
  return d ? d.getDate().toString() : '—';
}

function formatMonth(dateStr) {
  const d = parseLocal(dateStr);
  if (!d) return 'Upcoming';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  // Compare date-only (ignore time)
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(nowDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dDate.getTime() === nowDate.getTime()) return `${months[d.getMonth()]} · Today`;
  if (dDate.getTime() === tomorrow.getTime()) return `${months[d.getMonth()]} · Tomorrow`;
  return `${months[d.getMonth()]} · ${days[d.getDay()]}`;
}

function formatDateDisplay(dateStr) {
  const d = parseLocal(dateStr);
  if (!d) return null;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let hour = d.getHours();
  const min = d.getMinutes().toString().padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${hour}:${min} ${ampm}`;
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
            // Try multiple sources for venue name
            let venue = null;

            // 1. location.name — the most reliable source
            if (item.location?.name) venue = sanitizeVenue(item.location.name);

            // 2. location.address.name — sometimes has venue
            if (!venue && item.location?.address?.name) venue = sanitizeVenue(item.location.address.name);

            // 3. streetAddress signals a real venue even if name is city-only
            //    Build "Name, Neighborhood" from address parts
            if (!venue && item.location?.address?.streetAddress) {
              const street = item.location.address.streetAddress.trim();
              const locality = item.location.address.addressLocality || '';
              // Use organizer as proxy for venue name + address
              const locName = item.location?.name || '';
              if (sanitizeVenue(locName)) {
                venue = sanitizeVenue(locName);
              } else {
                // Show street address as venue hint (e.g. "123 W 72nd St")
                venue = street.length > 3 ? street : null;
              }
            }

            // 4. organizer name as last resort (often the venue for self-hosted events)
            if (!venue && item.organizer?.name) {
              const org = item.organizer.name.trim();
              if (!org.toLowerCase().includes('eventbrite') && org.length > 3) {
                venue = org;
              }
            }

            // 5. Extract venue from description ("at The Venue Name")
            if (!venue && item.description) {
              const m = item.description.match(/(?:at|@)\s+((?:[A-Z][A-Za-z0-9''.\-]*(?:\s*[&]\s*[A-Z][A-Za-z0-9''.\-]*)*(?:\s+[A-Z][A-Za-z0-9''.\-]*(?:\s*[&]\s*[A-Z][A-Za-z0-9''.\-]*)*)*))/);
              if (m) {
                let v = m[1].trim()
                  .replace(/\s+(for|in|on|from|with|this|where|featuring|doors|tickets)\b.*/i, '')
                  .replace(/[.,;:]+$/, '')
                  .trim();
                if (v.length > 3 && !v.toLowerCase().includes('eventbrite')) {
                  venue = sanitizeVenue(v) || v;
                }
              }
            }

            return {
              title: item.name || null,
              venue,
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
              // Save search-page data as partial, but always fetch the
              // individual event page too — search results often lack
              // the real venue name (only have city).
              if (item.startDate) {
                // Use sanitizeVenue to avoid storing bare city strings as venue
                const rawVenue = item.location?.name || item.location?.address?.name || null;
                eventUrls.push({
                  url: cleanUrl,
                  partial: {
                    title: item.name || null,
                    venue: sanitizeVenue(rawVenue),
                    city: item.location?.address?.addressLocality || null,
                    date: item.startDate,
                    image: typeof item.image === 'string' ? item.image : (Array.isArray(item.image) ? item.image[0] : null),
                  },
                  prefetched: null, // force individual page fetch
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

  // Step 3: Assemble final events — merge partial (search) + detail (page)
  const allEvents = [];
  for (const entry of limited) {
    const detail = detailsMap.get(entry.url);   // from individual page
    const partial = entry.partial || null;       // from search page JSON-LD
    const url = entry.url;

    // Build title from slug as fallback
    const slug = url.split('/e/')[1] || '';
    const slugTitle = slug
      .replace(/-tickets.*$/, '')
      .replace(/-\d+$/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    // Prefer individual page data, fall back to search page partial
    // Use sanitizeVenue to discard bare city names (e.g. "New York City")
    // Fall back to 'NYC' so there's always some location shown
    const title = detail?.title || partial?.title || slugTitle || 'Wine Event';
    const venue = sanitizeVenue(detail?.venue) || sanitizeVenue(partial?.venue) || 'NYC';
    const date = detail?.date || partial?.date || null;
    const image = fixImageUrl(detail?.image || partial?.image || null);

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
    // Use parseLocal so UTC servers don't accidentally filter events
    const nowLocal = parseLocal(new Date().toISOString()) || new Date();
    const startOfToday = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate());
    events = events.filter((ev) => {
      if (!ev.date) return true; // keep undated events (can't tell if past)
      const evDate = parseLocal(ev.date);
      return evDate ? evDate >= startOfToday : true;
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
