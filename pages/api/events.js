export default async function handler(req, res) {
  try {
    const url = 'https://www.eventbrite.com/d/ny--new-york/wine/';

    const response = await fetch(url);
    const html = await response.text();

    // VERY simple extraction: grab event titles from page text
    const matches = [...html.matchAll(/"name":"([^"]+)"/g)];

    const events = matches
      .slice(0, 20)
      .map((m, i) => ({
        id: i + 1,
        title: m[1],
        venue: 'New York City',
        date: null,
        url: url,
        source: 'Eventbrite',
      }));

    return res.status(200).json(events);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}