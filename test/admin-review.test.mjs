import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../lib/supabase.js';
import adminHandler from '../pages/api/admin/submissions.js';
import submitHandler from '../pages/api/submit.js';

const adminPassword = process.env.ADMIN_PASSWORD || 'nycwine-admin';

function mockDb(t, replacements) {
  for (const name of ['select', 'insert', 'update', 'upsert']) {
    const original = db[name];
    if (replacements[name]) db[name] = replacements[name];
    t.after(() => { db[name] = original; });
  }
}

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function postAction(id, action) {
  return { method: 'POST', query: {}, body: { pw: adminPassword, id, action } };
}

const eventSubmission = () => ({
  id: 'submission-1',
  type: 'event',
  name: 'A Wine Tasting',
  status: 'reviewed-rejected',
  ai_verdict: 'reject',
  ai_reason: 'AI review failed.',
  submitted_at: '2026-11-04T18:00:00.000Z',
  data: { venue: 'Verve Wine', address: '24 Hubert Street, New York, NY', date: '2026-12-02', description: 'Wine tasting', url: 'https://example.test/event', logoUrl: 'https://logo.test/verve.png' },
});

test('admin approval publishes idempotently before changing status and records the override', async (t) => {
  const calls = [];
  const submission = eventSubmission();
  let statusPatch;
  let publishedRow;
  mockDb(t, {
    select: async (table, query) => { calls.push(`select:${table}:${query}`); return table === 'submissions' ? [submission] : []; },
    upsert: async (table, row, conflict) => { calls.push(`upsert:${table}`); assert.equal(conflict, 'id'); publishedRow = row; },
    update: async (table, patch) => { calls.push(`update:${table}`); statusPatch = patch; },
  });

  const res = response();
  await adminHandler(postAction(submission.id, 'approve'), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'reviewed-posted');
  assert.equal(res.body.published, true);
  assert.deepEqual(calls.map((call) => call.split(':')[0]), ['select', 'upsert', 'update']);
  assert.equal(publishedRow.id, 'sub_submission-1');
  assert.equal(publishedRow.venue_address, submission.data.address);
  assert.equal(publishedRow.image, submission.data.logoUrl);
  assert.equal(statusPatch.status, 'reviewed-posted');
  assert.deepEqual(statusPatch.data.admin_review_history[0], {
    action: 'approve',
    at: res.body.reviewed_at,
    previous_status: 'reviewed-rejected',
    previous_ai_verdict: 'reject',
  });
  assert.equal(statusPatch.data.venue, submission.data.venue);
});

test('failed event publication leaves the item rejected and returns an actionable error', async (t) => {
  const submission = eventSubmission();
  const updates = [];
  const originalConsoleError = console.error;
  console.error = () => {};
  t.after(() => { console.error = originalConsoleError; });
  mockDb(t, {
    select: async () => [submission],
    upsert: async () => { throw new Error('Supabase POST submitted_events?on_conflict=id → 403: denied'); },
    update: async (...args) => { updates.push(args); },
  });

  const res = response();
  await adminHandler(postAction(submission.id, 'approve'), res);

  assert.equal(res.statusCode, 500);
  assert.match(res.body.error, /Could not publish this event \(database HTTP 403\)/);
  assert.match(res.body.error, /remains available for review/);
  assert.equal(updates.length, 0, 'a failed publish must not mark the submission approved');
});

test('Anthropic HTTP errors are saved as useful, secret-redacted review reasons', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.ANTHROPIC_API_KEY;
  let savedSubmission;
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-that-must-not-leak';
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    assert.equal(options.headers['x-api-key'], process.env.ANTHROPIC_API_KEY);
    return new Response(JSON.stringify({
      type: 'error',
      error: { type: 'authentication_error', message: 'Invalid API key sk-ant-test-key-that-must-not-leak' },
    }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  });
  mockDb(t, {
    insert: async (table, row) => { assert.equal(table, 'submissions'); savedSubmission = row; },
  });

  const res = response();
  await submitHandler({
    method: 'POST',
    body: {
      type: 'event', name: 'A Wine Tasting', contactEmail: 'events@example.test',
      venue: 'Verve Wine', date: '2026-12-02', url: 'https://example.test/event',
      description: 'An evening tasting.',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(savedSubmission.status, 'reviewed-escalated');
  assert.match(savedSubmission.ai_reason, /Anthropic API HTTP 401/);
  assert.match(savedSubmission.ai_reason, /authentication_error/);
  assert.match(savedSubmission.ai_reason, /Invalid API key/);
  assert.doesNotMatch(savedSubmission.ai_reason, /sk-ant-test-key/);
});

test('Supabase upsert sends merge-duplicates against the chosen conflict key', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let requestUrl;
  let requestHeaders;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example.test';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  globalThis.fetch = async (url, options) => {
    requestUrl = String(url);
    requestHeaders = options.headers;
    return new Response(null, { status: 204 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  });

  const isolated = await import(`../lib/supabase.js?upsert-test=${Date.now()}`);
  await isolated.db.upsert('submitted_events', { id: 'sub_submission-1' }, 'id');

  assert.equal(requestUrl, 'https://supabase.example.test/rest/v1/submitted_events?on_conflict=id');
  assert.equal(requestHeaders.Prefer, 'resolution=merge-duplicates,return=minimal');
});
