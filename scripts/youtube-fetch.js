#!/usr/bin/env node
// scripts/youtube-fetch.js
// ─────────────────────────────────────────────────────────────
// Fetches recent NYC-wine-related videos from YouTube Data API.
// Runs weekly via GitHub Actions, saves to
// public/data/youtube-cache.json.
//
// Requires YOUTUBE_API_KEY in env (GitHub Secret).
// Quota cost per run: ~100 units (search.list). Free quota is
// 10,000 units/day, so weekly fetch is well under cap.
// ─────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.YOUTUBE_API_KEY;
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'youtube-cache.json');
const SOURCE_URL = 'https://www.youtube.com/results?search_query=NYC+wine';

// Search terms — broad enough to surface NYC wine content,
// narrow enough to avoid generic "wine" videos from anywhere.
const QUERY = '"NYC wine" OR "wine bar New York" OR "Manhattan wine" OR "Brooklyn wine bar"';
const MAX_RESULTS = 25;          // pull more, then trim after de-dupe
const KEEP_TOP = 20;
const PUBLISHED_AFTER_DAYS = 730; // ignore anything older than ~2 years

function relativeTime(iso) {
  const then = new Date(iso);
  const now = new Date();
  const sec = Math.max(0, Math.floor((now - then) / 1000));
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  if (sec < 2628000) return `${Math.floor(sec / 604800)}w ago`;
  if (sec < 31536000) return `${Math.floor(sec / 2628000)}mo ago`;
  return `${Math.floor(sec / 31536000)}y ago`;
}

function decodeHtmlEntities(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

async function main() {
  console.log('=== NYCWine YouTube Fetch ===');
  console.log(`Date: ${new Date().toISOString()}`);

  function keepExistingCache(reason) {
    console.warn(`⚠ ${reason} — keeping existing cache, no changes written.`);
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
      existing.fetchedAt = new Date().toISOString();
      existing.fetchWarning = reason;
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 2));
      console.log('  Updated fetchedAt timestamp on existing cache.');
    } catch { /* no cache file yet */ }
    process.exit(0); // exit 0 so GH Actions doesn't flag a failure
  }

  if (!API_KEY) {
    keepExistingCache('YOUTUBE_API_KEY not set in environment');
    return;
  }

  // Build publishedAfter cutoff (RFC 3339)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PUBLISHED_AFTER_DAYS);
  const publishedAfter = cutoff.toISOString();

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('key', API_KEY);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', QUERY);
  url.searchParams.set('type', 'video');
  url.searchParams.set('order', 'relevance');
  url.searchParams.set('maxResults', String(MAX_RESULTS));
  url.searchParams.set('publishedAfter', publishedAfter);
  url.searchParams.set('regionCode', 'US');
  url.searchParams.set('relevanceLanguage', 'en');
  url.searchParams.set('safeSearch', 'moderate');

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch (networkErr) {
    keepExistingCache(`Network error fetching YouTube API: ${networkErr.message}`);
    return;
  }

  if (!res.ok) {
    let body = '';
    try { body = (await res.text()).slice(0, 200); } catch {}
    keepExistingCache(`HTTP ${res.status} from YouTube API. Body: ${body}`);
    return;
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    keepExistingCache(`Could not parse YouTube response: ${e.message}`);
    return;
  }

  const items = Array.isArray(data.items) ? data.items : [];
  console.log(`  Got ${items.length} raw results from YouTube`);

  // Map to our shape, drop anything missing required fields, dedupe by videoId
  const seen = new Set();
  const videos = [];
  for (const item of items) {
    const videoId = item?.id?.videoId;
    const sn = item?.snippet;
    if (!videoId || !sn || seen.has(videoId)) continue;
    seen.add(videoId);

    const thumb =
      sn.thumbnails?.medium?.url ||
      sn.thumbnails?.high?.url ||
      sn.thumbnails?.default?.url ||
      null;

    videos.push({
      videoId,
      title: decodeHtmlEntities(sn.title || '').trim(),
      channelTitle: decodeHtmlEntities(sn.channelTitle || '').trim(),
      publishedAt: sn.publishedAt,
      publishedRelative: relativeTime(sn.publishedAt),
      thumbnail: thumb,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }

  const trimmed = videos.slice(0, KEEP_TOP);

  if (trimmed.length === 0) {
    keepExistingCache('YouTube API returned 0 usable videos');
    return;
  }

  const result = {
    fetchedAt: new Date().toISOString(),
    source: 'YouTube',
    sourceUrl: SOURCE_URL,
    videos: trimmed,
  };

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));

  console.log(`\n✓ Saved ${trimmed.length} videos to ${OUTPUT_PATH}`);
  trimmed.slice(0, 5).forEach((v, i) =>
    console.log(`  ${String(i + 1).padStart(2)}. ${v.title} — ${v.channelTitle} (${v.publishedRelative})`)
  );
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(0); // never fail the GH Action
});
