// pages/api/joke-votes.js
// ─────────────────────────────────────────────────────────────
// Stores and retrieves emoji ratings for Concierge wine jokes.
//
// GET  /api/joke-votes?jokeIdx=0  → { "😐": 2, "🙂": 5, "😄": 8, "🤣": 15 }
// POST /api/joke-votes            → body { jokeIdx, emoji } → same shape
//
// Data is persisted in /public/data/joke-votes.json.
// ─────────────────────────────────────────────────────────────

import fs   from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'public', 'data', 'joke-votes.json');

const VALID_EMOJIS = ['😐', '🙂', '😄', '🤣'];

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function votesForJoke(data, idx) {
  return data[String(idx)] || { '😐': 0, '🙂': 0, '😄': 0, '🤣': 0 };
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    const idx = parseInt(req.query.jokeIdx, 10);
    if (isNaN(idx)) return res.status(400).json({ error: 'jokeIdx required' });
    const data = readData();
    return res.status(200).json(votesForJoke(data, idx));
  }

  if (req.method === 'POST') {
    const { jokeIdx, emoji } = req.body;
    if (typeof jokeIdx !== 'number' || !VALID_EMOJIS.includes(emoji)) {
      return res.status(400).json({ error: 'jokeIdx (number) and emoji required' });
    }

    const data  = readData();
    const key   = String(jokeIdx);
    if (!data[key]) data[key] = { '😐': 0, '🙂': 0, '😄': 0, '🤣': 0 };
    data[key][emoji] = (data[key][emoji] || 0) + 1;

    try { writeData(data); } catch { /* non-fatal in serverless */ }

    return res.status(200).json(data[key]);
  }

  res.status(405).end();
}
