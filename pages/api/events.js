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

// ── Venue database enrichment ─────────────────────────────────
// Loads wine-bars.json + wine-stores.json and builds two lookup
// maps so we can match an event venue string either way:
//   name  → add address to the event
//   address → replace with proper name + address
let venueDB = null;

function loadVenueDB() {
  if (venueDB) return venueDB;
  const read = (filename) => {
    try {
      const p = path.join(process.cwd(), 'public', 'data', filename);
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch { return []; }
  };
  const all = [...read('wine-bars.json'), ...read('wine-stores.json')]
    .filter((v) => v.name && !(v.notes || '').includes('[CLOSED]'));

  // Map 1: normalized name → entry
  const byName = new Map();
  // Map 2: normalized street fragment → entry (first ~25 chars of address)
  const byAddr = new Map();

  for (const v of all) {
    const nameLow = v.name.toLowerCase().trim();
    byName.set(nameLow, v);

    if (v.address) {
      // Key on just the house number + street portion, lowercase, no commas
      const addrKey = v.address.split(',')[0].toLowerCase().trim();
      byAddr.set(addrKey, v);
    }
  }

  venueDB = { all, byName, byAddr };
  return venueDB;
}

// Normalize a string for fuzzy comparison:
// lower-case, collapse spaces, drop punctuation, expand common abbreviations
function normAddr(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\bst\b/g, 'street').replace(/\bave\b/g, 'avenue')
    .replace(/\bblvd\b/g, 'boulevard').replace(/\bpl\b/g, 'place')
    .replace(/\brd\b/g, 'road').replace(/\bdr\b/g, 'drive')
    .replace(/[.,#]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Try to find a matching venue in our DB and return enriched fields.
// Returns { venue, venueAddress, borough } — unchanged if no match found.
function enrichVenueFromDB(venue) {
  if (!venue || venue === 'NYC') return { venue, venueAddress: null };
  const db = loadVenueDB();

  const vLow = venue.toLowerCase().trim();

  // ── 1. Exact name match ──────────────────────────────────────
  const exactName = db.byName.get(vLow);
  if (exactName) {
    return {
      venue: exactName.name,
      venueAddress: exactName.address || null,
      borough: exactName.borough || exactName.neighborhood || null,
    };
  }

  // ── 2. Venue string looks like a street address (starts with digit) ──
  const isAddress = /^\d/.test(venue.trim());
  if (isAddress) {
    const normV = normAddr(venue.split(',')[0]);  // just the street part
    // Exact address key match
    const exactAddr = db.byAddr.get(venue.split(',')[0].toLowerCase().trim());
    if (exactAddr) {
      return {
        venue: exactAddr.name,
        venueAddress: exactAddr.address || null,
        borough: exactAddr.borough || exactAddr.neighborhood || null,
      };
    }
    // Normalized address match
    for (const [key, entry] of db.byAddr) {
      if (normAddr(key) === normV || normAddr(key).startsWith(normV) || normV.startsWith(normAddr(key))) {
        return {
          venue: entry.name,
          venueAddress: entry.address || null,
          borough: entry.borough || entry.neighborhood || null,
        };
      }
    }
    // No match — keep the address as the venue string
    return { venue, venueAddress: null };
  }

  // ── 3. Partial / fuzzy name match (contains in either direction) ──
  for (const [name, entry] of db.byName) {
    if (vLow.includes(name) || name.includes(vLow)) {
      return {
        venue: entry.name,
        venueAddress: entry.address || null,
        borough: entry.borough || entry.neighborhood || null,
      };
    }
  }

  // ── 4. No match — return unchanged, no address ────────────────
  return { venue, venueAddress: null };
}

// ── Color cycling for cards without images ────────────────────
const COLORS = ['c1', 'c2', 'c3', 'c4', 'c5'];

// ── Fix Eventbrite image URLs ─────────────────────────────────
// Eventbrite returns relative URLs like /e/_next/image?url=<encoded>
// which only work on eventbrite.com. Extract the real CDN URL
// by decoding the url= parameter ONCE (not twice — the inner
// path must stay percent-encoded for img.evbuc.com to work).
function fixImageUrl(url) {
  if (!url) return null;

  // Scraped og:image / JSON-LD values arrive HTML-escaped, e.g.
  //   ...&s=6eff9153&amp;w=940&amp;q=75
  // Eventbrite's image endpoint returns HTTP 400 for those, because it
  // sees a param called "amp;w" instead of "w". Decode entities first.
  url = url
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/gi, '/');

  // Unwrap BEFORE the absolute-URL shortcut below. Eventbrite's proxy URLs
  // are themselves absolute (https://www.eventbrite.com/e/_next/image?...),
  // so checking startsWith('https://') first made this branch unreachable.
  if (url.includes('_next/image') && url.includes('url=')) {
    try {
      const match = url.match(/url=([^&]+)/);
      if (match) {
        const decoded = decodeURIComponent(match[1]); // decode ONCE only
        if (decoded.startsWith('http')) return decoded;
      }
    } catch { /* fall through */ }
  }
  if (url.startsWith('https://')) return url;  // already absolute
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

// ── Junk event filter ─────────────────────────────────────────
// Exclude placeholder/spam Eventbrite listings without blocking
// legitimate events. Signals, strongest first:
//   1. Explicit blocklist (manually removed events)
//   2. Eventbrite's default orange-logo image -- means the listing
//      has NO real event image (virtually all real events do)
//   3. Generic placeholder title ("Wine Tasting", "test") AND no
//      venue/address at all -- nothing real to show
// A generic title alone does NOT block when the event has a real
// venue + address (could be legitimate).
const BLOCKED_EVENT_URLS = new Set([
  // Placeholder listing: shell organizer (no name, 0 events, unverified),
  // no real image, generic title "Wine Tasting" (removed 2026-08-06)
  'https://www.eventbrite.com/e/wine-tasting-tickets-1992952904787',
]);

// Eventbrite default logo image when a listing has no image
const EB_LOGO_IMAGE_RE = /cdn\.evbstatic\.com\/[^"']*\/logos\//i;

// Generic placeholder titles that carry no event identity
const PLACEHOLDER_TITLE_RE = /^(wine tasting|wine tasting event|wine tasing|wine tsting|wine event|wine sampling|tasting|test event|test|testing|event|bla|tbd|tba)$/i;

function isJunkEvent(ev) {
  if (!ev || !ev.url) return false; // never drop events without a URL
  if (BLOCKED_EVENT_URLS.has(ev.url)) return true;
  const img = ev.image || '';
  if (EB_LOGO_IMAGE_RE.test(img)) return true; // default logo = no real image
  const t = (ev.title || '').trim();
  if (PLACEHOLDER_TITLE_RE.test(t) && t.length <= 30 && !ev.venue && !ev.venueAddress) return true;
  return false;
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
  if (t.includes('auction')) return 'Auctions';
  if (t.includes('tasting') || t.includes('sampling')) return 'Tasting';
  if (t.includes('class') || t.includes('course') || t.includes('wset') || t.includes('education')) return 'Class';
  if (t.includes('dinner') || t.includes('pairing') || t.includes('brunch')) return 'Dinner';
  if (t.includes('festival') || t.includes('celebration') || t.includes('fest')) return 'Festival';
  return 'Event';
}

// ── Fetch a single Eventbrite event page ─────────────────────
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

    let venue = null;
    let organizer = null;
    let title = null;
    let date = null;
    let image = null;
    let description = null;
    let address = null;
    let geo = null;

    // ── 1. __NEXT_DATA__ (current Eventbrite pages) ────────────
    // Eventbrite's newer pages embed event details (name, venue,
    // full postal address, geo, start time) in the Next.js payload
    // at props.pageProps.context.basicInfo.
    const ndMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (ndMatch) {
      try {
        const nd = JSON.parse(ndMatch[1]);
        const bi = nd.props?.pageProps?.context?.basicInfo;
        if (bi) {
          if (bi.name) title = bi.name;
          const v = bi.venue;
          if (v && v.name) venue = sanitizeVenue(v.name);
          if (v && v.address) {
            const a = v.address;
            const lines = a.localizedMultiLineAddressDisplay || [];
            const zipMatch = (lines[1] || '').match(/(\d{5}(?:-\d{4})?)/);
            address = {
              street: lines[0] || null,
              city: a.city || null,
              state: a.region || null,
              zip: zipMatch ? zipMatch[1] : null,
            };
            if (a.latitude && a.longitude) {
              geo = { latitude: a.latitude, longitude: a.longitude };
            }
          }
        }
      } catch { /* skip bad JSON */ }
    }

    // ── 2. JSON-LD (older pages / extra fields) ────────────────
    const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        const items = Array.isArray(data) ? data : data['@graph'] || [data];
        for (const item of items) {
          if (item['@type'] && (item['@type'] === 'Event' || item['@type'].includes('Event') || item['@type'].includes('Festival'))) {
            if (!title && item.name) title = item.name;
            if (!venue) {
              if (item.location?.name) venue = sanitizeVenue(item.location.name);
              else if (item.location?.address?.name) venue = sanitizeVenue(item.location.address.name);
            }
            if (!venue && item.location?.address?.streetAddress) {
              const street = item.location.address.streetAddress.trim();
              if (street.length > 3) venue = street;
            }
            if (!organizer && item.organizer?.name) {
              const org = item.organizer.name.trim();
              if (!org.toLowerCase().includes('eventbrite') && org.length > 3) organizer = org;
            }
            if (!date && item.startDate) date = item.startDate;
            if (!image) {
              image = typeof item.image === 'string' ? item.image : (Array.isArray(item.image) ? item.image[0] : null);
            }
            if (!description && item.description) description = item.description.substring(0, 200);
            if (!address && item.location?.address) {
              const addr = item.location.address;
              address = {
                street: addr.streetAddress || null,
                city: addr.addressLocality || null,
                state: addr.addressRegion || null,
                zip: addr.postalCode || null,
              };
            }
            if (!geo && item.location?.geo) {
              geo = { latitude: item.location.geo.latitude, longitude: item.location.geo.longitude };
            }
          }
        }
      } catch { /* skip bad JSON */ }
    }

    // ── 3. Meta/HTML fallback ──────────────────────────────────
    if (!date) {
      const dateMatch = html.match(/<meta[^>]+property="event:start_time"[^>]+content="([^"]+)"/i)
        || html.match(/<time[^>]+datetime="([^"]+)"/i)
        || html.match(/"startDate"\s*:\s*"([^"]+)"/);
      if (dateMatch) date = dateMatch[1];
    }
    if (!image) {
      const imgMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
      if (imgMatch) image = imgMatch[1];
    }
    if (!title) {
      const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
      if (ogTitle) title = ogTitle[1].replace(/&#x27;|&#39;|&amp;/g, "'");
    }
    if (!venue && !address) {
      const venueMatch = html.match(/<meta[^>]+property="event:location"[^>]+content="([^"]+)"/i);
      if (venueMatch) venue = sanitizeVenue(venueMatch[1]);
    }

    if (!title && !venue && !date && !image) return null;

    return { title, venue, organizer, date, image, description, address, geo };
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
            if (item['@type'] && (item['@type'] === 'Event' || item['@type'].includes('Event') || item['@type'].includes('Festival')) && item.url && !seenUrls.has(item.url)) {
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
                    address: {
                      street: item.location?.address?.streetAddress || null,
                      city: item.location?.address?.addressLocality || null,
                      state: item.location?.address?.addressRegion || null,
                      zip: item.location?.address?.postalCode || null,
                    },
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
    const rawVenue = sanitizeVenue(detail?.venue) || sanitizeVenue(partial?.venue) || null;
    const organizer = detail?.organizer || null;
    const date = detail?.date || partial?.date || null;
    const image = fixImageUrl(detail?.image || partial?.image || null);

    // Enrich venue with address/name from our wine bar + store databases
    // Fall back to organizer name ("by Liz's Book Bar") when no venue found
    const enriched = rawVenue ? enrichVenueFromDB(rawVenue) : { venue: null, venueAddress: null };
    const displayVenue = enriched.venue || organizer || null;

    // Full address: prefer Eventbrite JSON-LD (street/city/state/zip),
    // fall back to the venue DB enrichment.
    const ebAddr = (detail && detail.address) || (partial && partial.address) || null;
    const ebStreet = ebAddr?.street || null;
    const ebCity = ebAddr?.city || null;
    const ebState = ebAddr?.state || null;
    const ebZip = ebAddr?.zip || null;
    const hasEbLocation = ebStreet || ebCity;

    let venueAddress = null;
    if (hasEbLocation) {
      const cityState = [ebCity, ebState].filter(Boolean).join(', ');
      const secondLine = ebZip && cityState ? `${cityState} ${ebZip}` : (cityState || ebZip || '');
      venueAddress = [ebStreet, secondLine].filter(Boolean).join(', ') || null;
    } else if (enriched.venueAddress) {
      venueAddress = enriched.venueAddress;
    }
    const geo = (detail && detail.geo) || null;

    allEvents.push({
      title,
      venue: displayVenue,
      venueAddress,
      venueCity: ebCity || null,
      venueState: ebState || null,
      geoLat: geo && geo.latitude ? geo.latitude : null,
      geoLng: geo && geo.longitude ? geo.longitude : null,
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

// ── Read internally submitted events from Supabase ────────────
// These events passed AI review and are merged into the feed
// sorted together with Eventbrite results by date.
async function readSubmittedEvents() {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) return [];

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/submitted_events?order=submitted_at.asc`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((ev) => ({
      ...ev,
      venueAddress: ev.venue_address || null,
      day:          formatDay(ev.date),
      month:        formatMonth(ev.date),
      tag:          getTag(ev.title || ''),
      dateDisplay:  formatDateDisplay(ev.date),
      source:       'NYCWine',
    }));
  } catch (err) {
    console.warn('Could not load submitted events from Supabase:', err.message);
    return [];
  }
}

// ── API Handler ───────────────────────────────────────────────
export default async function handler(req, res) {
  // Return in-memory cached data if fresh
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cache);
  }

  try {
    // ── Internally submitted events ────────────────────────────
    const submittedEvents = await readSubmittedEvents();

    // ── External events from Eventbrite ───────────────────────
    const scrapedEvents = await scrapeEventbrite();
    const cachedEvents = readCachedEvents().map(ev => ({
      ...ev,
      source: 'NYCWine',
    }));

    // Merge: cached events first, then Eventbrite scraped events
    let externalEvents = [...cachedEvents, ...scrapedEvents];

    // ── Dedupe external events by URL ───────────────────────────
    // Cached + freshly scraped events come from the same Eventbrite
    // searches, so the same event can appear twice. Keep the LAST
    // occurrence (the fresh scraped copy), drop earlier cached dupes.
    const dedupMap = new Map();
    for (const ev of externalEvents) {
      if (!ev.url) {
        dedupMap.set(`__nourl_${dedupMap.size}`, ev);
      } else {
        dedupMap.set(ev.url, ev); // later entry overwrites earlier
      }
    }
    externalEvents = [...dedupMap.values()];

    // ── Curated events win over scraped duplicates ────────────────
    // If a submitted (curated) event shares a URL with a scraped/cached
    // Eventbrite event, drop the external copy -- the curated entry has
    // the better title, price, description, and image.
    const curatedUrls = new Set(submittedEvents.map((ev) => ev.url).filter(Boolean));
    if (curatedUrls.size > 0) {
      externalEvents = externalEvents.filter((ev) => !ev.url || !curatedUrls.has(ev.url));
    }

    // ── Drop junk/placeholder events (no real image, shell listings) ──
    externalEvents = externalEvents.filter((ev) => !isJunkEvent(ev));

    // ── Merge all events together (sorted by date below) ──
    let events = [...submittedEvents, ...externalEvents];

    // Remove past events — only show today or future
    // Use parseLocal so UTC servers don't accidentally filter events
    const nowLocal = parseLocal(new Date().toISOString()) || new Date();
    const startOfToday = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate());
    events = events.filter((ev) => {
      if (!ev.date) return true; // keep undated events (can't tell if past)
      const evDate = parseLocal(ev.date);
      return evDate ? evDate >= startOfToday : true;
    });

    // Sort all events together by date (earliest first)
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
