export default async function handler(req, res) {
  try {
    const searchUrl = 'https://www.eventbrite.com/d/ny--new-york/wine/';

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const html = await response.text();

    const hrefMatches = [...html.matchAll(/href="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((href) => href.includes('/e/') || href.includes('eventbrite.com/e/'));

    return res.status(200).json({
      count: hrefMatches.length,
      sample: hrefMatches.slice(0, 20),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}