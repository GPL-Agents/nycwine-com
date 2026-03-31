#!/usr/bin/env node
// scripts/regeocode.js
// ─────────────────────────────────────────────────────────────
// Re-geocodes all venue lat/lng.
//
// NYC venues (bars, stores) → NYC Planning GeoSearch API
//   https://geosearch.planninglabs.nyc  (free, no key, NYC-specific)
//
// Wineries (outside NYC) → Nominatim / OpenStreetMap
//   https://nominatim.openstreetmap.org  (free, global)
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
  { file: 'wine-bars.json',   geocoder: 'nyc' },
  { file: 'wine-stores.json', geocoder: 'nyc' },
  { file: 'wineries.json',    geocoder: 'nominatim' },
];

const DELAY_NYC       = 200;   // NYC Planning API — generous, no published limit
const DELAY_NOMINATIM = 1100;  // Nominatim: max 1 req/s
const USER_AGENT      = 'NYCWine.com geocoder/1.0 (gloeff@gmail.com)';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── NYC Planning GeoSearch (bars + stores) ────────────────────
// Purpose-built for NYC addresses — much more accurate than Nominatim
async function geocodeNYC(address) {
  // Strip trailing borough/city/state if already appended
  const clean = address.replace(/,?\s*(new york|ny|nyc|manhattan|brooklyn|queens|bronx|staten island)\s*$/i, '').trim();
  const url = `https://geosearch.planninglabs.nyc/v2/search?` +
    new URLSearchParams({ text: `${clean}, New York, NY`, size: '1' });

  const res  = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  const data = await res.json();
  const feat = data.features?.[0];
  if (!feat) return null;
  const [lng, lat] = feat.geometry.coordinates;
  return {
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6)),
  };
}

// ── Nominatim / OpenStreetMap (wineries outside NYC) ──────────
async function geocodeNominatim(address) {
  const url = 'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({ q: address, format: 'json', limit: '1', countrycodes: 'us' });

  const res  = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  const data = await res.json();
  if (!data.length) return null;
  return {
    lat: parseFloat(parseFloat(data[0].lat).toFixed(6)),
    lng: parseFloat(parseFloat(data[0].lon).toFixed(6)),
  };
}

async function processFile({ file, geocoder }) {
  const filePath = path.join(DATA_DIR, file);
  const venues   = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const delayMs  = geocoder === 'nyc' ? DELAY_NYC : DELAY_NOMINATIM;
  const geocodeFn = geocoder === 'nyc' ? geocodeNYC : geocodeNominatim;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Processing ${file} — ${venues.length} venues  [${geocoder}]`);
  console.log('─'.repeat(60));

  let updated = 0;
  let failed  = 0;

  for (let i = 0; i < venues.length; i++) {
    const v = venues[i];
    process.stdout.write(`  [${i + 1}/${venues.length}] ${v.name} … `);

    let result = null;
    try {
      result = await geocodeFn(v.address);
    } catch (err) {
      console.log(`ERROR — ${err.message}`);
      failed++;
      await sleep(delayMs);
      continue;
    }
    await sleep(delayMs);

    if (!result) {
      console.log('NOT FOUND — keeping existing coords');
      failed++;
      continue;
    }

    const oldLat = v.lat, oldLng = v.lng;
    const moved  = Math.abs(result.lat - (oldLat || 0)) > 0.001 ||
                   Math.abs(result.lng - (oldLng || 0)) > 0.001;

    v.lat = result.lat;
    v.lng = result.lng;
    updated++;

    if (moved) {
      console.log(`MOVED  (was ${oldLat}, ${oldLng} → now ${result.lat}, ${result.lng})`);
    } else {
      console.log('OK');
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(venues, null, 2));
  console.log(`\n  ✓ ${updated} geocoded, ${failed} not found/failed. File saved.`);
}

async function main() {
  console.log('NYCWine venue re-geocoder');
  console.log('Bars/Stores → NYC Planning GeoSearch (~200ms/req)');
  console.log('Wineries    → Nominatim (~1100ms/req)\n');
  console.log('Estimated time: ~3 min (bars + stores) + ~1 min (wineries)\n');

  for (const cfg of FILES) {
    await processFile(cfg);
  }

  console.log('\n✅ Done! Commit the updated JSON files and push to redeploy.');
}

main().catch(err => { console.error(err); process.exit(1); });
