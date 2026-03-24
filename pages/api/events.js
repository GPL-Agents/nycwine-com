// pages/api/events.js

export default async function handler(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const url = `https://data.cityofnewyork.us/resource/tvpp-9vvx.json?$where=start_date_time >= '${today}'&$order=start_date_time ASC&$limit=100`;

    const response = await fetch(url);
    const data = await response.json();

    const events = data
      .filter((ev) => {
        const text = `${ev.event_name || ''} ${ev.short_description || ''}`.toLowerCase();
        return text.includes('wine');
      })
      .map((ev, i) => ({
        id: i + 1,
        title: ev.event_name,
        venue: ev.event_location || ev.event_borough || 'NYC',
        date: ev.start_date_time,
        url: ev.event_page_url || null,
      }));

    return res.status(200).json(events);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}