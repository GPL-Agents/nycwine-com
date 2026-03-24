export default async function handler(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const url = `https://data.cityofnewyork.us/resource/tvpp-9vvx.json?$where=start_date_time >= '${today}'&$order=start_date_time ASC&$limit=20`;

    const response = await fetch(url);
    const text = await response.text();

    return res.status(200).json({
      ok: response.ok,
      status: response.status,
      url,
      preview: text.slice(0, 2000)
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}