// pages/admin.js
// ─────────────────────────────────────────────────────────────
// Admin panel for reviewing flagged submissions + AI review log.
// Password is set via ADMIN_PASSWORD env var (default: nycwine-admin).
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const TYPE_LABELS = {
  event:   '🎉 Event',
  bar:     '🍷 Wine Bar',
  store:   '🛒 Wine Store',
  winery:  '🍇 Winery',
};

const VERDICT_STYLES = {
  'reviewed-posted':    { bg: '#e8f5e9', color: '#2e7d32', label: '✓ Auto-approved' },
  'reviewed-rejected':  { bg: '#ffebee', color: '#c62828', label: '✗ Auto-rejected' },
  'reviewed-escalated': { bg: '#fff8e1', color: '#e65100', label: '⚑ Escalated' },
};

// ── Login screen ─────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pw, setPw]     = useState('');
  const [err, setErr]   = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const res = await fetch(`/api/admin/submissions?pw=${encodeURIComponent(pw)}`);
    if (res.ok) {
      onLogin(pw);
    } else {
      setErr('Incorrect password.');
    }
    setBusy(false);
  }

  return (
    <div style={styles.loginWrap}>
      <div style={styles.loginBox}>
        <div style={styles.loginLogo}>🍷</div>
        <h1 style={styles.loginTitle}>NYCWine Admin</h1>
        <form onSubmit={handleSubmit} style={styles.loginForm}>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Admin password"
            style={styles.loginInput}
            autoFocus
          />
          {err && <div style={styles.loginErr}>{err}</div>}
          <button type="submit" disabled={busy} style={styles.loginBtn}>
            {busy ? 'Checking…' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Flagged submission card (needs human review) ──────────────
function SubmissionCard({ sub, pw, onAction }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  async function act(action) {
    setBusy(true);
    const res = await fetch('/api/admin/submissions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ pw, id: sub.id, action }),
    });
    if (res.ok) {
      setDone(action);
      onAction(sub.id, action);
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div style={{ ...styles.card, opacity: 0.5 }}>
        <span style={{ color: done === 'approve' ? '#2e7d32' : '#c62828', fontWeight: 700 }}>
          {done === 'approve' ? '✓ Approved' : '✗ Rejected'}
        </span>
        {' — '}{sub.name}
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.typeBadge}>{TYPE_LABELS[sub.type] || sub.type}</span>
        <span style={styles.cardDate}>{new Date(sub.submitted_at).toLocaleString()}</span>
      </div>

      <div style={styles.cardName}>{sub.name}</div>

      <div style={styles.cardMeta}>
        {sub.data?.address     && <div><strong>Address:</strong> {sub.data.address}</div>}
        {sub.data?.venue       && <div><strong>Venue:</strong> {sub.data.venue}</div>}
        {sub.data?.date        && <div><strong>Date:</strong> {sub.data.date}</div>}
        {sub.data?.website     && <div><strong>Website:</strong> <a href={sub.data.website} target="_blank" rel="noreferrer" style={{ color: '#ec407a' }}>{sub.data.website}</a></div>}
        {sub.data?.url         && <div><strong>URL:</strong> <a href={sub.data.url} target="_blank" rel="noreferrer" style={{ color: '#ec407a' }}>{sub.data.url}</a></div>}
        {sub.data?.description && <div><strong>Description:</strong> {sub.data.description}</div>}
        {sub.contact_email     && <div><strong>Contact:</strong> {sub.contact_email}</div>}
      </div>

      {sub.ai_reason && (
        <div style={styles.aiReason}>
          <strong>AI flag reason:</strong> {sub.ai_reason}
        </div>
      )}

      <div style={styles.cardActions}>
        <button onClick={() => act('approve')} disabled={busy}
          style={{ ...styles.actionBtn, ...styles.approveBtn }}>
          {busy ? '…' : '✓ Approve'}
        </button>
        <button onClick={() => act('reject')} disabled={busy}
          style={{ ...styles.actionBtn, ...styles.rejectBtn }}>
          {busy ? '…' : '✗ Reject'}
        </button>
      </div>
    </div>
  );
}

// ── Compact log row ───────────────────────────────────────────
function LogRow({ sub }) {
  const vs = VERDICT_STYLES[sub.status] || { bg: '#f5f5f5', color: '#555', label: sub.status };
  return (
    <div style={styles.logRow}>
      <span style={styles.logTypeBadge}>{TYPE_LABELS[sub.type] || sub.type}</span>
      <span style={styles.logName}>{sub.name}</span>
      <span style={{ ...styles.logVerdict, background: vs.bg, color: vs.color }}>{vs.label}</span>
      {sub.ai_reason && (
        <span style={styles.logReason} title={sub.ai_reason}>
          {sub.ai_reason.length > 80 ? sub.ai_reason.slice(0, 80) + '…' : sub.ai_reason}
        </span>
      )}
      <span style={styles.logDate}>{new Date(sub.submitted_at).toLocaleDateString()}</span>
    </div>
  );
}

// ── Main admin page ───────────────────────────────────────────
export default function AdminPage() {
  const [pw, setPw]           = useState(null);
  const [subs, setSubs]       = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState('flagged'); // 'flagged' | 'log'

  async function loadSubs(password) {
    setLoading(true);
    const [flaggedRes, logRes] = await Promise.all([
      fetch(`/api/admin/submissions?pw=${encodeURIComponent(password)}`),
      fetch(`/api/admin/submissions?pw=${encodeURIComponent(password)}&all=true`),
    ]);
    if (flaggedRes.ok) setSubs(await flaggedRes.json());
    if (logRes.ok)     setAllLogs(await logRes.json());
    setLoading(false);
  }

  function handleLogin(password) {
    setPw(password);
    loadSubs(password);
  }

  function handleAction(id) {
    setSubs((prev) => prev.filter((s) => s.id !== id));
  }

  if (!pw) return (
    <>
      <Head><title>Admin — NYCWine</title><meta name="robots" content="noindex" /></Head>
      <LoginScreen onLogin={handleLogin} />
    </>
  );

  const pending = subs.filter((s) => s.status === 'reviewed-escalated');

  return (
    <>
      <Head><title>Admin — NYCWine</title><meta name="robots" content="noindex" /></Head>
      <div style={styles.page}>
        <div style={styles.topBar}>
          <div style={styles.topBarInner}>
            <span style={styles.topBarTitle}>🍷 NYCWine Admin</span>
            <Link href="/" style={styles.topBarLink}>← Back to site</Link>
          </div>
        </div>

        {/* Tab bar */}
        <div style={styles.tabBar}>
          <button
            onClick={() => setTab('flagged')}
            style={{ ...styles.tabBtn, ...(tab === 'flagged' ? styles.tabBtnActive : {}) }}
          >
            Flagged{pending.length > 0 && <span style={styles.badge}>{pending.length}</span>}
          </button>
          <button
            onClick={() => setTab('log')}
            style={{ ...styles.tabBtn, ...(tab === 'log' ? styles.tabBtnActive : {}) }}
          >
            AI Review Log
            {allLogs.length > 0 && <span style={{ ...styles.badge, background: '#888' }}>{allLogs.length}</span>}
          </button>
        </div>

        <div style={styles.content}>
          {loading && <p style={{ color: '#888' }}>Loading…</p>}

          {/* ── Flagged tab ─────────────────────────────── */}
          {!loading && tab === 'flagged' && (
            <>
              {pending.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>All clear</div>
                  <div style={{ color: '#888' }}>No submissions need review right now.</div>
                </div>
              ) : (
                pending.map((sub) => (
                  <SubmissionCard key={sub.id} sub={sub} pw={pw} onAction={handleAction} />
                ))
              )}
            </>
          )}

          {/* ── AI Review Log tab ───────────────────────── */}
          {!loading && tab === 'log' && (
            <>
              <p style={styles.logHelp}>
                All submissions processed by AI in the last 100 entries.
                Green = auto-approved, Red = auto-rejected, Yellow = escalated for human review.
              </p>
              {allLogs.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={{ color: '#888' }}>No submissions yet.</div>
                </div>
              ) : (
                <div style={styles.logTable}>
                  {allLogs.map((sub) => <LogRow key={sub.id} sub={sub} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Inline styles ─────────────────────────────────────────────
const styles = {
  loginWrap: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#f5f5f5',
    fontFamily: "'DM Sans', sans-serif",
  },
  loginBox: {
    background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12,
    padding: '40px 36px', width: '100%', maxWidth: 380,
    textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  loginLogo:  { fontSize: 40, marginBottom: 10 },
  loginTitle: { fontSize: 22, fontWeight: 700, marginBottom: 24, color: '#1a1a1a' },
  loginForm:  { display: 'flex', flexDirection: 'column', gap: 12 },
  loginInput: {
    height: 44, padding: '0 14px', border: '1.5px solid #e0e0e0',
    borderRadius: 6, fontSize: 15, outline: 'none',
  },
  loginErr:  { color: '#c62828', fontSize: 13 },
  loginBtn: {
    height: 44, background: '#ec407a', color: '#fff',
    border: 'none', borderRadius: 6, fontSize: 15,
    fontWeight: 700, cursor: 'pointer',
  },
  page:    { minHeight: '100vh', background: '#f5f5f5', fontFamily: "'DM Sans', sans-serif" },
  topBar:  { background: '#1a1a1a', padding: '0 24px', height: 52 },
  topBarInner: {
    maxWidth: 900, margin: '0 auto', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  topBarTitle: { color: '#fff', fontWeight: 700, fontSize: 16 },
  topBarLink:  { color: '#ec407a', textDecoration: 'none', fontSize: 14 },
  tabBar: {
    background: '#fff', borderBottom: '1px solid #e0e0e0',
    padding: '0 24px', display: 'flex', gap: 4,
    maxWidth: '100%',
  },
  tabBtn: {
    padding: '14px 20px', border: 'none', background: 'transparent',
    fontSize: 14, fontWeight: 600, color: '#888', cursor: 'pointer',
    borderBottom: '2px solid transparent', display: 'flex', alignItems: 'center', gap: 8,
  },
  tabBtnActive: { color: '#ec407a', borderBottomColor: '#ec407a' },
  content: { maxWidth: 900, margin: '0 auto', padding: '32px 24px' },
  badge: {
    background: '#ec407a', color: '#fff',
    borderRadius: 20, padding: '2px 8px', fontSize: 12,
  },
  emptyState: {
    background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10,
    padding: '48px 24px', textAlign: 'center',
  },
  card: {
    background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10,
    padding: '20px 22px', marginBottom: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  typeBadge: {
    background: '#fce4ec', color: '#c2185b',
    borderRadius: 20, padding: '3px 10px',
    fontSize: 12, fontWeight: 700,
  },
  cardDate:  { fontSize: 12, color: '#888' },
  cardName:  { fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 },
  cardMeta:  { fontSize: 13, color: '#444', lineHeight: 1.7, marginBottom: 10 },
  aiReason: {
    background: '#fff8e1', border: '1px solid #ffe082',
    borderRadius: 6, padding: '8px 12px',
    fontSize: 13, color: '#5d4037', marginBottom: 14,
  },
  cardActions: { display: 'flex', gap: 10 },
  actionBtn: {
    padding: '9px 22px', border: 'none', borderRadius: 6,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  approveBtn: { background: '#e8f5e9', color: '#2e7d32' },
  rejectBtn:  { background: '#ffebee', color: '#c62828' },
  logHelp: { fontSize: 13, color: '#666', marginBottom: 16 },
  logTable: {
    background: '#fff', border: '1px solid #e0e0e0',
    borderRadius: 10, overflow: 'hidden',
  },
  logRow: {
    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: 13,
  },
  logTypeBadge: {
    background: '#fce4ec', color: '#c2185b',
    borderRadius: 12, padding: '2px 8px',
    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
  },
  logName:    { fontWeight: 600, color: '#1a1a1a', flex: '1 1 160px', minWidth: 0 },
  logVerdict: {
    borderRadius: 12, padding: '2px 10px',
    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
  },
  logReason:  { color: '#666', fontSize: 12, flex: '2 1 200px', minWidth: 0 },
  logDate:    { color: '#aaa', fontSize: 11, whiteSpace: 'nowrap' },
};
