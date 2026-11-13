import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../lib/supabase.js';
import { adminDb } from '../lib/supabase-admin.js';
import adminHandler from '../pages/api/admin/submissions.js';
import submitHandler from '../pages/api/submit.js';

const adminPassword = 'test-admin-password';

function mockDb(t, replacements) {
  for (const client of [db, adminDb]) {
    for (const name of ['select', 'insert', 'update', 'upsert']) {
      const original = client[name];
      if (replacements[name]) client[name] = replacements[name];
      t.after(() => { client[name] = original; });
    }
  }
}

function withAdminPassword(t) {
  const originalAdmin = process.env.ADMIN_PASSWORD;
  const originalCron = process.env.CRON_API_KEY;
  process.env.ADMIN_PASSWORD = adminPassword;
  delete process.env.CRON_API_KEY;
  t.after(() => {
    if (originalAdmin === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = originalAdmin;
    if (originalCron === undefined) delete process.env.CRON_API_KEY;
    else process.env.CRON_API_KEY = originalCron;
  });
}

function withServiceRoleKey(t) {
  const originalSecret = process.env.SUPABASE_SECRET_KEY;
  const originalLegacy = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test-key';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  t.after(() => {
    if (originalSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = originalSecret;
    if (originalLegacy === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalLegacy;
  });
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
  withAdminPassword(t);
  withServiceRoleKey(t);
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
  withAdminPassword(t);
  withServiceRoleKey(t);
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

test('admin writes fail clearly when no server-only secret key is configured', async (t) => {
  withAdminPassword(t);
  const originalSecret = process.env.SUPABASE_SECRET_KEY;
  const originalLegacy = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  t.after(() => {
    if (originalSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = originalSecret;
    if (originalLegacy === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalLegacy;
  });

  const res = response();
  await adminHandler(postAction('submission-1', 'approve'), res);

  assert.equal(res.statusCode, 503);
  assert.match(res.body.error, /SUPABASE_SECRET_KEY/);
  assert.match(res.body.error, /public anon key cannot publish/);
});

test('admin API does not accept source-code fallback credentials', async (t) => {
  const originalAdmin = process.env.ADMIN_PASSWORD;
  const originalCron = process.env.CRON_API_KEY;
  delete process.env.ADMIN_PASSWORD;
  delete process.env.CRON_API_KEY;
  t.after(() => {
    if (originalAdmin === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = originalAdmin;
    if (originalCron === undefined) delete process.env.CRON_API_KEY;
    else process.env.CRON_API_KEY = originalCron;
  });

  const req = postAction('submission-1', 'approve');
  req.body.pw = 'nycwine-admin';
  req.query.key = 'nycwine-cron-2026';
  const res = response();
  await adminHandler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'Unauthorized');
});

test('legacy cron fallback remains read-only for the existing admin checker', async (t) => {
  const originalAdmin = process.env.ADMIN_PASSWORD;
  const originalCron = process.env.CRON_API_KEY;
  delete process.env.ADMIN_PASSWORD;
  delete process.env.CRON_API_KEY;
  t.after(() => {
    if (originalAdmin === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = originalAdmin;
    if (originalCron === undefined) delete process.env.CRON_API_KEY;
    else process.env.CRON_API_KEY = originalCron;
  });
  mockDb(t, { select: async () => [{ id: 'readonly-check' }] });

  const res = response();
  await adminHandler({ method: 'GET', query: { key: 'nycwine-cron-2026' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, [{ id: 'readonly-check' }]);
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

test('admin Supabase client sends opaque secret keys on apikey without Bearer', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSecretKey = process.env.SUPABASE_SECRET_KEY;
  const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let requestUrl;
  let requestHeaders;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example.test';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test-key';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  globalThis.fetch = async (url, options) => {
    requestUrl = String(url);
    requestHeaders = options.headers;
    return new Response(null, { status: 204 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalSecretKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = originalSecretKey;
    if (originalServiceKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
  });

  const isolated = await import(`../lib/supabase-admin.js?admin-test=${Date.now()}`);
  await isolated.adminDb.upsert('submitted_events', { id: 'sub_submission-1' }, 'id');

  assert.equal(requestUrl, 'https://supabase.example.test/rest/v1/submitted_events?on_conflict=id');
  assert.equal(requestHeaders.apikey, 'sb_secret_test-key');
  assert.equal(requestHeaders.Authorization, undefined);
});

test('admin Supabase client keeps Bearer auth for legacy JWT service keys', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSecretKey = process.env.SUPABASE_SECRET_KEY;
  const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const legacyKey = 'eyJtest.header.signature';
  let requestHeaders;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example.test';
  delete process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = legacyKey;
  globalThis.fetch = async (_url, options) => {
    requestHeaders = options.headers;
    return new Response(null, { status: 204 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalSecretKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = originalSecretKey;
    if (originalServiceKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
  });

  const isolated = await import(`../lib/supabase-admin.js?legacy-test=${Date.now()}`);
  await isolated.adminDb.upsert('submitted_events', { id: 'sub_submission-1' }, 'id');

  assert.equal(requestHeaders.apikey, legacyKey);
  assert.equal(requestHeaders.Authorization, `Bearer ${legacyKey}`);
});
