// pages/api/concierge.js
// ─────────────────────────────────────────────────────────────
// NYC Wine Concierge — API route.
//
// Currently: mock response engine that drives the guided
// questionnaire flow. Each response includes:
//   reply   — the bot's text
//   options — array of { label, silly } (4th is always silly)
//
// TODO: Replace mock logic with real Claude API calls using
//       Anthropic SDK + RAG over site data. The option
//       structure stays the same — Claude will return JSON.
// ─────────────────────────────────────────────────────────────

// ── Mock conversation tree ──────────────────────────────────
// Keys are lowercase, trimmed versions of what the user sent.
// Unrecognised input falls through to the DEFAULT response.

const FLOWS = {

  // ── Root choices ──────────────────────────────────────────

  'find me a wine bar': {
    reply: "Great choice! NYC has incredible wine bars. What neighborhood are you heading to?",
    options: [
      { label: 'Manhattan',                              silly: false },
      { label: 'Brooklyn',                               silly: false },
      { label: 'Queens / Outer Boroughs',                silly: false },
      { label: '🏰 [SILLY OPTION PLACEHOLDER]',          silly: true  },
    ],
  },

  'recommend a wine shop': {
    reply: "Happy to help! Are you looking for anything specific?",
    options: [
      { label: 'Natural & organic wines',                silly: false },
      { label: 'Fine wine & rare bottles',               silly: false },
      { label: 'Everyday bottles under $30',             silly: false },
      { label: '🐉 [SILLY OPTION PLACEHOLDER]',          silly: true  },
    ],
  },

  'nyc wine events this week': {
    reply: "NYC's wine calendar is always packed! What kind of event sounds good?",
    options: [
      { label: 'Tastings & flights',                     silly: false },
      { label: 'Winemaker dinners',                      silly: false },
      { label: 'Wine & food pairings',                   silly: false },
      { label: '🎪 [SILLY OPTION PLACEHOLDER]',          silly: true  },
    ],
  },

  // ── Neighborhood follow-ups (wine bar path) ───────────────

  manhattan: {
    reply: "Manhattan has some fantastic wine bars! Here are a few I love:\n\n• **Corkbuzz** (Chelsea) — educator-run, excellent list\n• **Veritas** (Flatiron) — legendary cellar\n• **The Ten Bells** (Lower East Side) — natural wine paradise\n\nWant to narrow it down by vibe?",
    options: [
      { label: 'Cozy & romantic',                        silly: false },
      { label: 'Lively & social',                        silly: false },
      { label: 'Serious wine nerd vibe',                 silly: false },
      { label: '🧲 [SILLY OPTION PLACEHOLDER]',          silly: true  },
    ],
  },

  brooklyn: {
    reply: "Brooklyn's wine scene has exploded in recent years! Some standouts:\n\n• **Four Horsemen** (Williamsburg) — James Beard–winning natural list\n• **Rolo's** (Greenpoint) — neighbourhood gem\n• **Stonefruit Espresso + Kitchen** (Crown Heights) — natural wine all day\n\nWhat neighbourhood in Brooklyn?",
    options: [
      { label: 'Williamsburg / Greenpoint',              silly: false },
      { label: 'Park Slope / Cobble Hill',               silly: false },
      { label: 'Bushwick / Crown Heights',               silly: false },
      { label: '🌊 [SILLY OPTION PLACEHOLDER]',          silly: true  },
    ],
  },

  'queens / outer boroughs': {
    reply: "Queens and the other boroughs have hidden gems worth the trip!\n\n• **Domaine Wine Bar** (Astoria) — Greek-leaning list, great for the neighbourhood\n• **Shreya's** (Woodside) — natural wine meets South Asian flavours\n\nAny particular area?",
    options: [
      { label: 'Astoria / Long Island City',             silly: false },
      { label: 'The Bronx',                              silly: false },
      { label: 'Staten Island',                          silly: false },
      { label: '🛸 [SILLY OPTION PLACEHOLDER]',          silly: true  },
    ],
  },

  // ── Wine shop follow-ups ──────────────────────────────────

  'natural & organic wines': {
    reply: "NYC is one of the best cities in the world for natural wine! Try:\n\n• **Parcelle** (East Village) — curated, all natural\n• **Chambers Street Wines** (Tribeca) — serious natural & biodynamic selection\n• **Uva Wines & Spirits** (Williamsburg) — neighbourhood natural wine shop\n\nShall I look for something close to you?",
    options: [
      { label: 'Yes — I\'m in Manhattan',                silly: false },
      { label: 'Yes — I\'m in Brooklyn',                 silly: false },
      { label: 'Just show me the best overall',          silly: false },
      { label: '🌿 [SILLY OPTION PLACEHOLDER]',          silly: true  },
    ],
  },

  'fine wine & rare bottles': {
    reply: "For fine wine and collector bottles, these are top picks:\n\n• **Sherry-Lehmann** (Park Avenue) — NYC's most storied wine merchant\n• **Zachys** (White Plains, ships to NYC) — fine wine & auction house\n• **Acker Wines** (Upper West Side) — rare & aged Burgundy specialists\n\nAny particular region you're hunting?",
    options: [
      { label: 'Burgundy & Bordeaux',                    silly: false },
      { label: 'Italian — Barolo, Brunello',             silly: false },
      { label: 'California cult wines',                  silly: false },
      { label: '🏆 [SILLY OPTION PLACEHOLDER]',          silly: true  },
    ],
  },

  'everyday bottles under $30': {
    reply: "Great everyday wine doesn't have to cost much! Best spots for value:\n\n• **Trader Joe's** — yes, genuinely great $10–15 options\n• **Total Wine** (multiple locations) — huge selection, competitive pricing\n• **K&D Wines** (Upper East Side) — fantastic staff picks under $25\n\nAny specific style you're after?",
    options: [
      { label: 'Crisp whites & rosés',                   silly: false },
      { label: 'Easy-drinking reds',                     silly: false },
      { label: 'Bubbles (Prosecco / Cava)',               silly: false },
      { label: '🎰 [SILLY OPTION PLACEHOLDER]',          silly: true  },
    ],
  },

};

// ── Default / fallback response ──────────────────────────────
const DEFAULT_RESPONSE = {
  reply: "That's a great question! I'm still learning the full NYC wine map, but here's how I can help right now:",
  options: [
    { label: 'Find me a wine bar nearby',                silly: false },
    { label: 'Recommend a wine shop',                    silly: false },
    { label: 'NYC wine events this week',                silly: false },
    { label: '🎩 [SILLY OPTION PLACEHOLDER]',            silly: true  },
  ],
};

// ── Handler ──────────────────────────────────────────────────
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message required' });
  }

  const key = message.toLowerCase().trim();
  const response = FLOWS[key] || DEFAULT_RESPONSE;

  // Small artificial delay so the typing indicator feels natural
  // (In production this will be the real LLM latency)
  setTimeout(() => {
    res.status(200).json(response);
  }, 600);
}
