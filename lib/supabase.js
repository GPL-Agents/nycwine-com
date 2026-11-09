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

// keyProvider is evaluated per request so server-only credentials can be
// supplied by the deployment environment without ever entering a client bundle.
export function createSupabaseClient(url, keyProvider, missingKeyName) {
  async function request(method, table, body, query = '', prefer = null) {
    const key = keyProvider();
    if (!url || !key) {
      const missing = [!url && 'NEXT_PUBLIC_SUPABASE_URL', !key && missingKeyName]
        .filter(Boolean)
        .join(' / ');
      throw new Error(`Supabase env vars not set (${missing})`);
    }

    const headers = {
      'apikey': key,
      'Content-Type': 'application/json',
    };
    // New Supabase sb_publishable_/sb_secret_ keys are not JWTs. Sending one
    // as Bearer makes PostgREST reject it as an invalid JWT; apikey alone is
    // translated to the appropriate role by Supabase. Legacy keys are JWTs.
    if (!key.startsWith('sb_publishable_') && !key.startsWith('sb_secret_')) {
      headers['Authorization'] = `Bearer ${key}`;
    }

    if (method === 'POST')  headers['Prefer'] = prefer || 'return=minimal';
    if (method === 'PATCH') headers['Prefer'] = 'return=minimal';

    const res = await fetch(`${url}/rest/v1/${table}${query}`, {
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

  return {
    // INSERT a single row
    insert: (table, row) => request('POST', table, row),

    // INSERT or merge into the row with the same primary key (safe to retry)
    upsert: (table, row, conflict = 'id') => request(
      'POST', table, row, `?on_conflict=${encodeURIComponent(conflict)}`,
      'resolution=merge-duplicates,return=minimal'
    ),

    // SELECT rows — query is a PostgREST filter string, e.g. '?status=eq.new'
    select: (table, query = '') => request('GET', table, null, query),

    // UPDATE rows matching query — e.g. '?id=eq.abc123'
    update: (table, patch, query) => request('PATCH', table, patch, query),
  };
}

export const db = createSupabaseClient(
  SUPABASE_URL,
  () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
);
