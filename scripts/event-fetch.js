#!/usr/bin/env node
// scripts/event-fetch.js

const fs = require('fs');
const path = require('path');

const SEARCH_URLS = [
  'https://www.eventbrite.com/d/ny--new-york/wine/',
  'https://www.eventbrite.com/d/ny--new-york/wine-tasting/',
  'https://www.eventbrite.com/d/ny--new-york/sommelier/',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

const COLORS = ['c1', 'c2', 'c3', 'c4', 'c5'];

// ─── FIX 1: Normalize dates without timezone to Eastern time ───
function normalizeDate(dateStr) {
  if (!dateStr) return null;
  // If no timezone info, treat as Eastern time (not UTC)
  if (!/Z|[+-]\d{2}:?\d{2}$/.test(dateStr)) {
    // Use EST offset; EDT (-04:00) applies Mar-Nov but -05:00 is safe default
    return dateStr + '-05:00';
  }
  return dateStr;
}

function formatDay(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(normalizeDate(dateStr));
  return isNaN(d) ? '—' : d.getDate().toString();
}

function formatMonth(dateStr) {
  if (!dateStr) return 'Upcoming';
  const d = new Date(normalizeDate(dateStr));
  if (isNaN(d)) return 'Upcoming';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${months[d.getMonth()]} · ${days[d.getDay()]}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return null;
  const d = new Date(normalizeDate(dateStr));
  if (isNaN(d)) return null;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getTag(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('tasting') || t.includes('sampling')) return 'Tasting';
  if (t.includes('class') || t.includes('course') || t.includes('wset') || t.includes('education')) return 'Class';
  if (t.includes('dinner') || t.includes('pairing') || t.includes('brunch')) return 'Dinner';
  if (t.includes('festival') || t.includes('celebration') || t.includes('fest')) return 'Festival';
  return 'Event';
}

async function fetchEventDetails(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { headers: HEADERS, signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const html = await response.text();

    const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        const items = Array.isArray(data) ? data : data['@graph'] || [data];
        for (const item of items) {
          if (item['@type'] === 'Event') {
            return {
              title: item.name || null,
              venue: item.location?.name || item.location?.address?.addressLocality || null,
              date: item.startDate || null,
              image: typeof item.image === 'string' ? item.image : (Array.isArray(item.image) ? item.image[0] : null),
            };
          }
        }
      } catch { /* skip */ }
    }

    const dateMatch = html.match(/<meta[^>]+property="event:start_time"[^>]+content="([^"]+)"/i)
      || html.match(/<time[^>]+datetime="([^"]+)"/i)
      || html.match(/"startDate"\s*:\s*"([^"]+)"/);
    const imgMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    const venueMatch = html.match(/<meta[^>]+property="event:location"[^>]+content="([^"]+)"/i);

    if (dateMatch || imgMatch) {
      return {
        title: null,
        venue: venueMatch ? venueMatch[1] : null,
        date: dateMatch ? dateMatch[1] : null,
        image: imgMatch ? imgMatch[1] : null,
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function main() {
  console.log('=== NYCWine Event Fetch ===');
  console.log(`Date: ${new Date().toISOString()}`);

  const eventUrls = [];
  const seenUrls = new Set();

  for (const searchUrl of SEARCH_URLS) {
    try {
      console.log(`  Fetching search: ${searchUrl}`);
      const response = await fetch(searchUrl, { headers: HEADERS });
      if (!response.ok) {
        console.warn(`  HTTP ${response.status}`);
        continue;
      }
      const html = await response.text();
      console.log(`  Got ${html.length} bytes`);

      const hrefMatches = [...html.matchAll(/href="([^"]+)"/g)]
        .map((m) => m[1])
        .filter((href) => href.includes('/e/'))
        .map((href) => {
          if (href.startsWith('http')) return href.replace(/\?aff=.*$/, '');
          if (href.startsWith('/')) return `https://www.eventbrite.com${href}`.replace(/\?aff=.*$/, '');
          return href;
        });

      for (const url of hrefMatches) {
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          eventUrls.push(url);
        }
      }
    } catch (err) {
      console.err
