// pages/api/events-debug.js
// Temporary debug endpoint to diagnose venue extraction
// DELETE THIS FILE after debugging

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchOne(url) {
  const log = { url, status: null, htmlLength: 0, jsonLdCount: 0, eventFound: false, venue: null, organizer: null, locationRaw: null, error: null };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { headers: HEADERS, signal: controller.signal });
    clearTimeout(timeout);
    log.status = response.status;
    if (!response.ok) return log;

    const html = await response.text();
    log.htmlLength = html.length;

    const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    log.jsonLdCount = jsonLdMatches.length;

    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        const items = Array.isArray(data) ? data : data['@graph'] || [data];
        for (const item of items) {
          if (item['@type'] === 'Event') {
            log.eventFound = true;
            log.locationRaw = item.location || null;
            log.organizer = item.organizer || null;
            log.venue = item.location?.name || item.location?.address?.name || null;
            log.descriptionSnippet = item.description ? item.description.substring(0, 300) : null;
          }
        }
      } catch { /* skip */ }
    }
    return log;
  } catch (err) {
    log.error = err.message;
    return log;
  }
}

export default async function handler(req, res) {
  // Test with a few known events
  const testUrls = [
    'https://www.eventbrite.com/e/springtime-cheese-wine-tasting-tickets-1979789108518',
    'https://www.eventbrite.com/e/introduction-to-wine-101-a-guided-wine-tasting-tickets-1983265505515',
    'https://www.eventbrite.com/e/chart-house-orin-swift-wine-dinner-weehawken-tickets-1982927494515',
  ];

  // Also check search page
  const searchLog = { url: 'https://www.eventbrite.com/d/ny--new-york/wine/', status: null, htmlLength: 0, jsonLdCount: 0, eventsFound: 0, sampleEvent: null, error: null };
  try {
    const response = await fetch(searchLog.url, { headers: HEADERS });
    searchLog.status = response.status;
    if (response.ok) {
      const html = await response.text();
      searchLog.htmlLength = html.length;
      const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      searchLog.jsonLdCount = jsonLdMatches.length;
      for (const match of jsonLdMatches) {
        try {
          const data = JSON.parse(match[1]);
          const items = Array.isArray(data) ? data : data['@graph'] || [data];
          for (const item of items) {
            if (item['@type'] === 'Event') {
              searchLog.eventsFound++;
              if (!searchLog.sampleEvent) {
                searchLog.sampleEvent = {
                  name: item.name,
                  location: item.location,
                  organizer: item.organizer,
                  descSnippet: item.description ? item.description.substring(0, 200) : null,
                };
              }
            }
          }
        } catch { /* skip */ }
      }
    }
  } catch (err) {
    searchLog.error = err.message;
  }

  const results = await Promise.allSettled(testUrls.map(fetchOne));
  const details = results.map((r, i) => r.status === 'fulfilled' ? r.value : { url: testUrls[i], error: r.reason?.message });

  res.status(200).json({
    timestamp: new Date().toISOString(),
    searchPage: searchLog,
    individualPages: details,
  });
}
