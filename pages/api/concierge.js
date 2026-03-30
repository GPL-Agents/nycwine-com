// pages/api/concierge.js
// ─────────────────────────────────────────────────────────────
// NYC Wine Concierge — AI-powered API route.
//
// Uses Google Gemini Flash with full RAG over site venue data:
//   • wineries.json  (37 wineries, Long Island / Hamptons / North Fork)
//   • wine-bars.json (115 wine bars across NYC boroughs)
//   • wine-stores.json (335 wine stores)
//   • events-cache.json (upcoming Eventbrite events)
//
// Jokes are handled locally (no API call needed).
// All other questions go to Gemini with the full data context.
//
// Requires: GOOGLE_GEMINI_API_KEY in environment variables.
// Free tier: 1,500 requests/day via aistudio.google.com
// The @google/generative-ai package is installed via package.json.
// ─────────────────────────────────────────────────────────────

import { GoogleGenAI } from '@google/genai';
import fs   from 'fs';
import path from 'path';

// ── Site data — loaded once and cached at module level ────────
let _siteData = null;

function getSiteData() {
  if (_siteData) return _siteData;
  const dir = path.join(process.cwd(), 'public', 'data');

  function safeRead(file) {
    try { return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); }
    catch { return []; }
  }

  const wineries = safeRead('wineries.json');
  const bars     = safeRead('wine-bars.json');
  const stores   = safeRead('wine-stores.json');
  // events-cache may be corrupted — wrap carefully
  let events = [];
  try {
    const raw = fs.readFileSync(path.join(dir, 'events-cache.json'), 'utf8');
    const parsed = JSON.parse(raw);
    events = Array.isArray(parsed) ? parsed : (parsed.events || []);
  } catch { /* use empty */ }

  _siteData = { wineries, bars, stores, events };
  return _siteData;
}

// ── Build the RAG system prompt ───────────────────────────────
function buildSystemPrompt({ wineries, bars, stores, events }) {

  // Wineries grouped by region
  const wByRegion = {};
  for (const w of wineries) {
    (wByRegion[w.region] = wByRegion[w.region] || []).push(w);
  }
  const wineriesBlock = Object.entries(wByRegion).map(([region, list]) =>
    `${region}:\n` + list.map(w =>
      `  • ${w.name} | ${w.address}${w.website ? ' | ' + w.website : ''}`
    ).join('\n')
  ).join('\n\n');

  // Bars grouped by borough then neighborhood
  const bByBorough = {};
  for (const b of bars) {
    const key = b.borough || 'Other';
    (bByBorough[key] = bByBorough[key] || []).push(b);
  }
  const barsBlock = Object.entries(bByBorough).map(([borough, list]) =>
    `${borough}:\n` + list.map(b =>
      `  • ${b.name}${b.neighborhood ? ' (' + b.neighborhood + ')' : ''} | ${b.address}${b.website ? ' | ' + b.website : ''}`
    ).join('\n')
  ).join('\n\n');

  // Stores grouped by borough
  const sByBorough = {};
  for (const s of stores) {
    const key = s.borough || 'Other';
    (sByBorough[key] = sByBorough[key] || []).push(s);
  }
  const storesBlock = Object.entries(sByBorough).map(([borough, list]) =>
    `${borough}:\n` + list.map(s =>
      `  • ${s.name} | ${s.address}${s.website ? ' | ' + s.website : ''}`
    ).join('\n')
  ).join('\n\n');

  // Upcoming events (cap at 30 most recent)
  const eventsBlock = events.length
    ? events.slice(0, 30).map(e =>
        `  • ${e.title} — ${e.dateDisplay || e.date || 'Date TBD'}${e.venue ? ' @ ' + e.venue : ''}${e.url ? ' | ' + e.url : ''}`
      ).join('\n')
    : '  No events currently cached. Direct users to the /events page.';

  return `You are the NYC Wine Concierge for NYCWine.com — a warm, knowledgeable, and slightly playful guide helping visitors discover wine bars, wine stores, wineries, and events in and around New York City.

INTERNAL SITE PAGES (always link to these when relevant — use markdown [text](/path)):
  • /wineries  — Full winery directory (regions: Hamptons, North Fork, Long Island North Shore, Long Island South Shore)
  • /bars      — Wine bar directory
  • /stores    — Wine store directory
  • /events    — Upcoming NYC wine events
  • /map       — Interactive map of all venues (color-coded pins, location search)

════════════════════════════════════════
WINERIES — ${wineries.length} total within driving distance of NYC
════════════════════════════════════════
${wineriesBlock}

════════════════════════════════════════
WINE BARS — ${bars.length} total across NYC
════════════════════════════════════════
${barsBlock}

════════════════════════════════════════
WINE STORES — ${stores.length} total across NYC
════════════════════════════════════════
${storesBlock}

════════════════════════════════════════
UPCOMING EVENTS
════════════════════════════════════════
${eventsBlock}

════════════════════════════════════════
RESPONSE RULES (CRITICAL — follow exactly)
════════════════════════════════════════
1. Always respond with a single valid JSON object and nothing else:
   { "reply": "...", "options": ["...", "...", "...", "..."] }

2. "reply" — your conversational response. Guidelines:
   • Use **bold** for venue names
   • Use bullet points (•) for lists
   • Keep it under ~150 words — concise and scannable
   • Always include specific venue names from the data above when relevant
   • Link to internal pages with markdown: [Wine Bars page](/bars)
   • For wineries, mention the region and link to [Wineries page](/wineries)

3. "options" — exactly 4 short follow-up button labels (max 35 chars each).
   • Make them natural next steps the user would actually want
   • You may include "Make me laugh" as one option — especially at the end of a flow
   • At least one option should always bring users back to a main topic

4. When a user asks about a specific region, winery type, neighborhood, or event type — use the data above to give specific recommendations, not generic advice.

5. Tone: like a well-connected NYC friend who genuinely loves wine. Warm, a little witty, always helpful.`;
}

// ── Wine jokes — handled locally, no API call needed ─────────
const JOKES = [
  "Wine is just grape juice that got a little naughty and never apologized.",
  "I don't need therapy… I just need a corkscrew and poor judgment.",
  "Wine: because sometimes water just isn't risky enough.",
  "I like my wine like I like my flirting… a little bold, slightly inappropriate, and best after dark.",
  "Wine makes everything better… except texting. You'll totally regret that later.",
  "I don't always drink wine… but when I do, my standards go down and my stories get better.",
  "I told my wine it needed to be more open… now it's spilling everything.",
  "Let's open a bottle and make pour decisions together.",
  "Sip Happens!",
  "I'm not saying wine is the answer… but it's worth a shot.",
  "Wine improves with age… I improve with wine.",
  "I only drink wine on days that end in 'y'… and occasionally during meetings.",
  "Wine doesn't judge… it just quietly agrees with all your bad decisions.",
  "Don't worry, you won't regret that last glass until the morning.",
  "I came for one glass of wine… and stayed because my morals left early.",
  "I bought a really expensive bottle of wine and saved it for a special occasion… then realized I'm the special occasion.",
  "I support small businesses… mostly wine bars that support my bad decisions.",
  "I asked the sommelier what pairs well with this wine… he said 'another bottle.'",
  "I let my wine breathe… now it won't stop overthinking everything.",
  "I told myself I'd only drink on special occasions… so now I celebrate minor achievements like opening the bottle.",
  "My wine rack has a very specific system… full and not full.",
  "I asked if the wine was dry… they said 'only if you don't open it.'",
  "I came for one glass… now I live here and know the bartender's zodiac sign.",
  "I dress like I have my life together… then order whatever's cheapest by the glass.",
  "I'm not high maintenance… I just have strong opinions about orange wine.",
  "I'm not avoiding my problems… I'm pairing them with a chilled Sancerre.",
  "If it's not a cute wine bar in the West Village, I'm not coming.",
  "I don't need closure… I need a table, a bottle, and my friends texting 'where are you.'",
];

const JOKE_OPTIONS = [
  { label: 'Find me a wine bar'         },
  { label: 'Recommend a wine shop'      },
  { label: 'NYC wine events this week'  },
  { label: 'Make me laugh', isJoke: true },
];

// ── Default options (used in fallback / no-API-key mode) ─────
const DEFAULT_OPTIONS = [
  { label: 'Find me a wine bar'         },
  { label: 'Recommend a wine shop'      },
  { label: 'NYC wine events this week'  },
  { label: 'Make me laugh', isJoke: true },
];

// ── Handler ──────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, isJoke, jokeIndex, history } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message required' });
  }

  // ── Jokes — handled locally, no AI needed ──────────────────
  if (isJoke) {
    const idx = (typeof jokeIndex === 'number' && jokeIndex >= 0 && jokeIndex < JOKES.length)
      ? jokeIndex : 0;
    return setTimeout(() => res.status(200).json({
      reply:   JOKES[idx],
      options: JOKE_OPTIONS,
      isJoke:  true,
      jokeIdx: idx,
    }), 400);
  }

  // ── No API key — graceful fallback ─────────────────────────
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    return res.status(200).json({
      reply: "I'm getting set up — check back very soon! In the meantime, explore the site using the navigation above. 🍷",
      options: DEFAULT_OPTIONS,
    });
  }

  // ── Build Gemini conversation ──────────────────────────────
  const data         = getSiteData();
  const systemPrompt = buildSystemPrompt(data);

  // Convert message history to Gemini format
  // Gemini uses 'user' and 'model' (not 'assistant')
  // IMPORTANT: Gemini requires history to start with a 'user' role message.
  // Skip any bot messages that appear before the first user message.
  const geminiHistory = [];
  let hasSeenUser = false;
  for (const msg of (history || [])) {
    if (msg.role === 'user') {
      hasSeenUser = true;
      geminiHistory.push({ role: 'user',  parts: [{ text: msg.text }] });
    } else if (msg.role === 'bot' && hasSeenUser && msg.text && !msg.isJoke) {
      geminiHistory.push({ role: 'model', parts: [{ text: msg.text }] });
    }
  }

  try {
    const ai   = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });
    const chat = ai.chats.create({
      model:   'gemini-2.0-flash',
      history: geminiHistory,
      config:  {
        systemInstruction: systemPrompt,
        maxOutputTokens:   600,
        temperature:       0.7,
      },
    });

    const result = await chat.sendMessage({ message });
    const raw    = result.text;

    // Parse Gemini's JSON response — extract the object even if there's surrounding text
    let parsed = null;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch {
      parsed = { reply: raw, options: [] };
    }

    const reply   = parsed.reply   || raw;
    const rawOpts = Array.isArray(parsed.options) ? parsed.options : [];

    // Normalise options — tag "Make me laugh" with isJoke
    const options = rawOpts.slice(0, 4).map(o => {
      const label = typeof o === 'string' ? o : (o.label || String(o));
      return { label, isJoke: label.trim().toLowerCase() === 'make me laugh' };
    });

    // Always have 4 options — fill with defaults if Gemini returned fewer
    while (options.length < 4) {
      options.push(DEFAULT_OPTIONS[options.length] || DEFAULT_OPTIONS[0]);
    }

    return res.status(200).json({ reply, options });

  } catch (err) {
    const errMsg = err?.message || String(err);
    console.error('[Concierge] Gemini API error:', errMsg);
    return res.status(200).json({
      reply:   `DEBUG: ${errMsg}`,
      options: DEFAULT_OPTIONS,
    });
  }
}
