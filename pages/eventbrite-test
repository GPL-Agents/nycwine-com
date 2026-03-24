export default async function handler(req, res) {
  try {
    const apiKey = process.env.EVENTBRITE_API_KEY;

    if (!apiKey) {
      return res.status(200).json({ error: 'Missing EVENTBRITE_API_KEY' });
    }

    const url = 'https://www.eventbriteapi.com/v3/events/search/?q=wine';

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();

    return res.status(200).json({
      ok: response.ok,
      status: response.status,
      count: (data.events || []).length,
      sample: (data.events || []).slice(0, 3),
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}
