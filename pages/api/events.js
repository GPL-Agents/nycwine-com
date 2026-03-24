export default async function handler(req, res) {
  try {
    const searchUrl = 'https://www.eventbrite.com/d/ny--new-york/wine/';

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const html = await response.text();

    const matches = [...html.matchAll(/https:\\\/\\\/www\.eventbrite\.com\\\/e\\\/[^"]+/g)]
      .map((m) => m[0])
      .map((url) =>
        url
          .replace(/\\\//g, '/')
          .replace(/\?aff=.*$/, '')
      );

    const uniqueUrls = [...new Set(matches)];

    const events = uniqueUrls.slice(0, 20).map((url, i) => {
      const slug = url.split('/e/')[1] || '';
      const cleanTitle = slug
        .replace(/-tickets.*$/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      return {
        id: i + 1,
        title: cleanTitle || 'Wine Event',
        venue: 'New York City',
        date: null,
        url,
        source: 'Eventbrite',
      };
    });

    return res.status(200).json(events);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}