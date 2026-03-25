#!/usr/bin/env node
// scripts/auction-fetch.js
// ─────────────────────────────────────────────────────────────
// Scrapes upcoming wine auctions from Acker Wines.
// Runs weekly via GitHub Actions, saves to
// public/data/auctions-cache.json.
// ─────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const SOURCE_URL = 'https://www.ackerwines.com/wine-auctions/';
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'auctions-cache.json');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Month names for date formatting
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function determineStatus(startDate, endDate) {
  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;

  if (now >= start && now <= end) return 'live';
  if (now < start) return 'upcoming';
  return 'past';
}

function extractLocation(text) {
  const t = text.toLowerCase();
  if (t.includes('hong kong')) return 'Hong Kong';
  if (t.includes('delaware')) return 'Delaware';
  if (t.includes('swiss') || t.includes('switzerland')) return 'Switzerland';
  if (t.includes('web') || t.includes('online')) return 'Online';
  return 'TBD';
}

async function main() {
  console.log('=== NYCWine Auction Fetch ===');
  console.log(`Date: ${new Date().toISOString()}`);

  try {
    const res = await fetch(SOURCE_URL, {
      headers: HEADERS,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`HTTP ${res.status}`);
      process.exit(1);
    }

    const html = await res.text();
    console.log(`  Got ${html.length} bytes`);

    const auctions = [];

    // Pattern 1: Structured auction cards with dates
    // Look for auction sections with titles and date information
    // Acker uses a pattern: TYPE header, TITLE, DATE(s), DESCRIPTION
    const auctionBlocks = html.split(/LIVE AUCTION OF FINE & RARE WINE|GLOBAL WEB AUCTION/i).slice(1);

    for (const block of auctionBlocks) {
      // Extract title — usually the first large heading
      const titleMatch = block.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i)
        || block.match(/"auction[^"]*title[^"]*"[^>]*>([\s\S]*?)</i);

      // Extract dates from the text
      const dateMatches = block.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[,\s]+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}/gi) || [];

      // Also try shorter date format
      const shortDates = block.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{4}/gi) || [];

      // Try ISO-ish dates
      const isoDates = block.match(/\d{4}-\d{2}-\d{2}/g) || [];

      // Try "Month Day, Year" format
      const monthDayDates = block.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}/gi) || [];

      const allDates = [...dateMatches, ...shortDates, ...monthDayDates];

      if (titleMatch) {
        const title = titleMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        if (!title || title.length < 3) continue;

        // Determine type
        const isWeb = /web\s*auction/i.test(block) || /web\s*auction/i.test(title);
        const type = isWeb ? 'web' : 'live';

        // Format dates
        let dates = '';
        if (allDates.length >= 2) {
          dates = `${formatDate(allDates[0])} – ${formatDate(allDates[allDates.length - 1])}`;
        } else if (allDates.length === 1) {
          dates = formatDate(allDates[0]);
        } else if (isoDates.length > 0) {
          dates = isoDates.map(d => formatDate(d)).join(' – ');
        }

        const location = extractLocation(title + ' ' + block.slice(0, 500));
        const status = allDates.length > 0
          ? determineStatus(allDates[0], allDates[allDates.length - 1])
          : 'upcoming';

        // Skip past auctions
        if (status === 'past') continue;

        auctions.push({
          title,
          type,
          dates,
          location,
          url: SOURCE_URL,
          status: isWeb && status === 'upcoming' ? 'open' : status,
        });
      }
    }

    // Deduplicate by title
    const seen = new Set();
    const unique = auctions.filter(a => {
      const key = a.title.toLowerCase().slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const result = {
      fetchedAt: new Date().toISOString(),
      source: 'Acker Wines',
      sourceUrl: SOURCE_URL,
      auctions: unique,
    };

    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // If scraping produced results, save them. Otherwise keep existing cache.
    if (unique.length > 0) {
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
      console.log(`\n✓ Saved ${unique.length} auctions to ${OUTPUT_PATH}`);
    } else {
      console.log('\n⚠ No auctions extracted — keeping existing cache');
      // Still update fetchedAt so we know the script ran
      try {
        const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
        existing.fetchedAt = new Date().toISOString();
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 2));
      } catch { /* no existing cache */ }
    }

    unique.forEach(a => console.log(`  ${a.status.padEnd(8)} ${a.title} — ${a.dates}`));

  } catch (err) {
    console.error('Fetch error:', err.message);
    process.exit(1);
  }
}

main();
