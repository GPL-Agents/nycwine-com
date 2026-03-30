// lib/supabase.js
// ─────────────────────────────────────────────────────────────
// Lightweight Supabase REST client — no npm package needed.
// Uses fetch() with the PostgREST API that Supabase exposes.
//
// Usage:
//   import { db } from '../../lib/supabase';
//   await db.insert('submissions', { id, name, ... });
//   const rows = await db.select('submissions', '?status=eq.reviewed-escalated');
//   await db.update('submissions', { status: 'reviewed-posted' }, '?id=eq.abc123');
// ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function request(method, table, body, query = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase env vars not set (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }

  const headers = {
    'apikey':        SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type':  'application/json',
  };

  if (method === 'POST')  headers['Prefer'] = 'return=minimal';
  if (method === 'PATCH') headers['Prefer'] = 'return=minimal';

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase ${method} ${table}${query} → ${res.status}: ${errText}`);
  }

  // 204 No Content (successful insert/update with return=minimal)
  if (res.status === 204) return null;

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const db = {
  // INSERT a single row
  insert: (table, row) => request('POST', table, row),

  // SELECT rows — query is a PostgREST filter string e.g. '?status=eq.new&order=submitted_at.desc'
  select: (table, query = '') => request('GET', table, null, query),

  // UPDATE rows matching query — e.g. '?id=eq.abc123'
  update: (table, patch, query) => request('PATCH', table, patch, query),
};
