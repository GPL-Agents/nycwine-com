// pages/api/events.js

const COLORS = ['c1', 'c2', 'c3', 'c4', 'c5'];

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
  const title = (event.title || '').toLowerCase();
  const desc = (event.description || '').toLowerCase();
  const combined = `${title} ${desc}`;

  if (combined.includes('class') || combined.includes('course') || combined.includes('wset')) return 'Class';
  if (combined.includes('dinner') || combined.includes('pairing')) return 'Dinner';
  if (combined.includes('tasting') || combined.includes('sampling')) return 'Tasting';
  if (combined.includes('free') || combined.includes('complimentary')) return 'Free';
  if (combined.includes('festival')) return 'Festival';
  return 'Event';
}

async function fetchEventbrite() {
  const apiKey = process.env.EVENTBRITE_API_KEY;

  if (!apiKey) {
    console.warn('No EVENTBRITE_API_KEY set');
    return [];
  }

  const params = new URLSearchParams({
  q: 'wine',
  'location.within': '50mi',
  'location.latitude': '40.7128',
  'location.longitude': '-74.0060',
  sort_by: 'date',
  expand: 'venue',
});

  try {
    const res = await fetch(`https://www.eventbriteapi.com/v3/events/search/?${params}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': 'NYCWine.com Events/1.0',
      },
    });

    if (!res.ok) {
      console.warn('Eventbrite fetch failed with status:', res.status);
      return [];
    }

    const data = await res.json();
    console.warn('Eventbrite raw count:', (data.events || []).length);

    const seen = new Set();

    return (data.events || [])
      .filter((ev) => {
        const url = ev.url || '';
        if (!url) return true;
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
      })
      .map((ev) => {
        const startDate = ev.start?.local || ev.start?.utc;
        const isFree = ev.is_free;
        const logo = ev.logo?.original?.url || ev.logo?.url || null;

        return {
          title: ev.name?.text || 'Wine Event',
          venue: ev.venue?.name || ev.venue?.address?.localized_address_display || ev.venue?.address?.city || 'New York City',
          date: startDate,
          day: formatDay(startDate),
          month: formatMonth(startDate),
          tag: isFree
            ? 'Free'
            : getTag({
                title: ev.name?.text,
                description: ev.description?.text,
              }),
          price: isFree ? null : null,
          url: ev.url || null,
          image: logo,
          source: 'Eventbrite',
        };
      });
  } catch (err) {
    console.warn('Eventbrite fetch error:', err.message);
    return [];
  }
}

export default async function handler(req, res) {
  console.warn('EVENTS API EVENTBRITE ONLY');

  try {
    const events = await fetchEventbrite();
    console.warn('Eventbrite mapped count:', events.length);

    const sorted = events
      .filter((ev) => ev.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 20)
      .map((ev, i) => ({
        ...ev,
        id: i + 1,
        color: COLORS[i % COLORS.length],
      }));

    return res.status(200).json(sorted);
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to fetch events',
      message: err.message,
    });
  }
}