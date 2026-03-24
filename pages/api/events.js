// pages/api/events.js
// Wine Events Aggregator

const WINE_KEYWORDS = [
  'wine', 'winery', 'vineyard', 'tasting', 'sommelier',
  'champagne', 'rosé', 'rose', 'prosecco', 'cava',
  'riesling', 'pinot', 'chardonnay', 'merlot', 'cabernet',
  'wine bar', 'wine class', 'wine dinner', 'wine pairing',
  'natural wine', 'sparkling', 'burgundy', 'bordeaux',
  'viticulture', 'enology', 'oenology',
];

function matchesWine(text) {
  const lower = (text || '').toLowerCase();
  return WINE_KEYWORDS.some((kw) => lower.includes(kw));
}

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000;

function formatDay(dateStr) {
  const d = new Date(dateStr);
  return d.getDate().toString();
}

function formatMonth(dateStr) {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const monthStr = months[d.getMonth()];
  if (d.toDateString() === now.toDateString()) return `${monthStr} · Today`;
  if (d.toDateString() === tomorrow.toDateString()) return `${monthStr} · Tomorrow`;
  return `${monthStr} · ${days[d.getDay()]}`;
}

function getTag(event) {
  const title = (event.title || event.event_name || '').toLowerCase();
  const desc = (event.description || event.short_description || '').toLowerCase();
  const combined = `${title} ${desc}`;

  if (combined.includes('class') || combined.includes('course') || combined.includes('wset') || combined.includes('education')) return 'Class';
  if (combined.includes('dinner') || combined.includes('pairing')) return 'Dinner';
  if (combined.includes('tasting') || combined.includes('sampling')) return 'Tasting';
  if (combined.includes('free') || combined.includes('no cover') || combined.includes('complimentary')) return 'Free';
  if (combined.includes('festival') || combined.includes('celebration')) return 'Festival';
  if (combined.includes('brunch')) return 'Brunch';
  return 'Event';
}

const COLORS = ['c1', 'c2', 'c3', 'c4', 'c5'];

async function fetchNYCOpenData() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const url = `https://data.cityofnewyork.us/resource/tvpp-9vvx.json?$where=start_date_time >= '${today}'&$order=start_date_time ASC&$limit=200`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'NYCWine.com Events/1.0' },
    });

    if (!res.ok) return [];

    const data = await res.json();
    console.log('NYC raw:', data.length);

    return data
      .filter((ev) => {
        const text = `${ev.event_name || ''} ${ev.short_description || ''} ${ev.event_type || ''}`.toLowerCase();
        const location = `${ev.event_location || ''} ${ev.event_borough || ''}`.toLowerCase();

        const isWine = matchesWine(text);
        const isNYC =
          location.includes('nyc') ||
          location.includes('new york') ||
          location.includes('manhattan') ||
          location.includes('brooklyn') ||
          location.includes('queens') ||
          location.includes('bronx') ||
          location.includes('staten island');

        return isWine && isNYC;
      })
      .map((ev) => ({
        title: ev.event_name || 'NYC Wine Event',
        venue: ev.event_location || ev.event_borough || 'NYC',
        date: ev.start_date_time,
        day: formatDay(ev.start_date_time),
        month: formatMonth(ev.start_date_time),
        tag: getTag({ title: ev.event_name, description: ev.short_description }),
        price: null,
        url: ev.event_page_url || null,
        source: 'NYC Open Data',
      }));
  } catch (err) {
    console.warn('NYC Open Data fetch failed:', err.message);
    return [];
  }
}

const EB_SEARCH_TERMS = ['wine', 'wine tasting', 'sommelier', 'vineyard'];

async function fetchEventbriteQuery(apiKey, query) {
  try {
    const params = new URLSearchParams({
      'location.latitude': '40.7580',
      'location.longitude': '-73.9855',
      'location.within': '50mi',
      q: query,
      sort_by: 'date',
      expand: 'venue',
    });

    const res = await fetch(`https://www.eventbriteapi.com/v3/events/search/?${params}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': 'NYCWine.com Events/1.0',
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    console.log('Eventbrite raw:', (data.events || []).length);

    return (data.events || []).map((ev) => {
      const startDate = ev.start?.local || ev.start?.utc;
      const isFree = ev.is_free;
      const logo = ev.logo?.original?.url || ev.logo?.url || null;

      return {
        title: ev.name?.text || 'Wine Event',
        venue: ev.venue?.name || ev.venue?.address?.city || 'NYC',
        date: startDate,
        day: formatDay(startDate),
        month: formatMonth(startDate),
        tag: isFree ? 'Free' : getTag({ title: ev.name?.text, description: ev.description?.text }),
        price: isFree ? null : (ev.ticket_availability?.minimum_ticket_price?.display || null),
        url: ev.url || null,
        image: logo,
        source: 'Eventbrite',
      };
    });
  } catch (err) {
    console.warn(`Eventbrite search "${query}" failed:`, err.message);
    return [];
  }
}

async function fetchEventbrite() {
  const apiKey = process.env.EVENTBRITE_API_KEY;
  if (!apiKey) {
    console.warn('No EVENTBRITE_API_KEY set — skipping Eventbrite.');
    return [];
  }

  const results = await Promise.allSettled(
    EB_SEARCH_TERMS.map((q) => fetchEventbriteQuery(apiKey, q))
  );

  const seen = new Set();
  return results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .filter((ev) => {
      if (seen.has(ev.url)) return false;
      seen.add(ev.url);
      return true;
    });
}

export default async function handler(req, res) {
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cache);
  }

  try {
    const [nycEvents, ebEvents] = await Promise.all([
      fetchNYCOpenData(),
      fetchEventbrite(),
    ]);

    console.log('NYC filtered:', nycEvents.length);
    console.log('Eventbrite filtered:', ebEvents.length);

    const allEvents = [...nycEvents, ...ebEvents]
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const events = allEvents.slice(0, 20).map((ev, i) => ({
      ...ev,
      id: i + 1,
      color: COLORS[i % COLORS.length],
    }));

    cache = events;
    cacheTime = Date.now();

    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=300');
    return res.status(200).json(events);
  } catch (err) {
    console.error('Events API error:', err);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
}