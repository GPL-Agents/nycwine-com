export default async function handler(req, res) {
  try {
    const searchUrl = 'https://www.eventbrite.com/d/ny--new-york/wine/';

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const html = await response.text();

    const titleMatches = [...html.matchAll(/"name":"([^"]+)"/g)];
    const linkMatches = [...html.matchAll(/"url":"(https:\\\/\\\/www\.eventbrite\.com\\\/e\\\/[^"]+)"/g)];

    const events = titleMatches.slice(0, 20).map((m, i) => {
      let eventUrl = linkMatches[i]?.[1] || searchUrl;

      eventUrl = eventUrl
        .replace(/\\\//g, '/')
        .replace(/\\\\u002[Ff]/g, '/');

      return {
        id: i + 1,
        title: m[1],
        venue: 'New York City',
        date: null,
        url: eventUrl,
        source: 'Eventbrite',
      };
    });

    return res.status(200).json(events);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}