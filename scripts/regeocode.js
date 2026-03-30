#!/usr/bin/env node
// scripts/regeocode.js
// ─────────────────────────────────────────────────────────────
// Re-geocodes all venue lat/lng using Nominatim (OpenStreetMap).
// Respects Nominatim's 1 req/s limit with a polite User-Agent.
//
// Run once from the project root:
//   node scripts/regeocode.js
//
// Updates public/data/wine-bars.json, wine-stores.json, wineries.json
// in place. Commit the result and push to redeploy.
// ─────────────────────────────────────────────────────────────

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = path.join(__dirname, '..', 'public', 'data');

const FILES = [
  { file: 'wine-bars.json',   defaultCity: 'New York, NY' },
  { file: 'wine-stores.json', defaultCity: 'New York, NY' },
  { file: 'wineries.json',    defaultCity: null },  // addresses are complete
];

const DELAY_MS   = 1100;   // Nominatim: max 1 req/s
const USER_AGENT = 'NYCWine.com geocoder/1.0 (github.com/nycwine)';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocode(address, defaultCity) {
  const q = defaultCity
    ? (/new york|ny\b|nyc/i.test(address) ? address : `${address}, ${defaultCity}`)
    : address;

  const url = 'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({ q, format: 'json', limit: '1', countrycodes: 'us' });

  const res  = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  const data = await res.json();

  if (!data.length) return null;
  return {
    lat: parseFloat(parseFloat(data[0].lat).toFixed(6)),
    lng: parseFloat(parseFloat(data[0].lon).toFixed(6)),
  };
}

async function processFile({ file, defaultCity }) {
  const filePath = path.join(DATA_DIR, file);
  const venues   = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Processing ${file} — ${venues.length} venues`);
  console.log('─'.repeat(60));

  let updated = 0;
  let failed  = 0;

  for (let i = 0; i < venues.length; i++) {
    const v = venues[i];
    process.stdout.write(`  [${i + 1}/${venues.length}] ${v.name} … `);

    const result = await geocode(v.address, defaultCity);
    await sleep(DELAY_MS);

    if (!result) {
      console.log('NOT FOUND — keeping existing coords');
      failed++;
      continue;
    }

    const oldLat = v.lat, oldLng = v.lng;
    const moved  = Math.abs(result.lat - oldLat) > 0.001 || Math.abs(result.lng - oldLng) > 0.001;

    v.lat = result.lat;
    v.lng = result.lng;
    updated++;

    if (moved) {
      console.log(`UPDATED (was ${oldLat}, ${oldLng} → now ${result.lat}, ${result.lng})`);
    } else {
      console.log('OK (same)');
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(venues, null, 2));
  console.log(`\n  ✓ ${updated} geocoded, ${failed} not found. File saved.`);
}

async function main() {
  console.log('NYCWine venue re-geocoder');
  console.log('Nominatim rate limit: 1 req/s — this will take ~10 min for all 487 venues\n');

  for (const cfg of FILES) {
    await processFile(cfg);
  }

  console.log('\n✅ Done! Commit the updated JSON files and push to redeploy.');
}

main().catch(err => { console.error(err); process.exit(1); });
