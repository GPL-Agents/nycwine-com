// pages/admin.js
// ─────────────────────────────────────────────────────────────
// Simple admin panel for reviewing flagged submissions.
// Password is set via ADMIN_PASSWORD env var (default: nycwine-admin).
// No external auth service needed — just a local password gate.
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

// ── Submission card ───────────────────────────────────────────
function SubmissionCard({ sub, pw, onAction }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // 'approve' | 'reject'

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
        <span style={styles.cardDate}>{new Date(sub.submittedAt).toLocaleString()}</span>
      </div>

      <div style={styles.cardName}>{sub.name}</div>

      <div style={styles.cardMeta}>
        {sub.address     && <div><strong>Address:</strong> {sub.address}</div>}
        {sub.venue       && <div><strong>Venue:</strong> {sub.venue}</div>}
        {sub.date        && <div><strong>Date:</strong> {sub.date}</div>}
        {sub.website     && <div><strong>Website:</strong> <a href={sub.website} target="_blank" rel="noreferrer" style={{ color: '#ec407a' }}>{sub.website}</a></div>}
        {sub.url         && <div><strong>URL:</strong> <a href={sub.url} target="_blank" rel="noreferrer" style={{ color: '#ec407a' }}>{sub.url}</a></div>}
        {sub.description && <div><strong>Description:</strong> {sub.description}</div>}
        {sub.contactEmail && <div><strong>Contact:</strong> {sub.contactEmail}</div>}
      </div>

      {sub.aiReason && (
        <div style={styles.aiReason}>
          <strong>AI flag reason:</strong> {sub.aiReason}
        </div>
      )}

      <div style={styles.cardActions}>
        <button
          onClick={() => act('approve')}
          disabled={busy}
          style={{ ...styles.actionBtn, ...styles.approveBtn }}
        >
          {busy ? '…' : '✓ Approve'}
        </button>
        <button
          onClick={() => act('reject')}
          disabled={busy}
          style={{ ...styles.actionBtn, ...styles.rejectBtn }}
        >
          {busy ? '…' : '✗ Reject'}
        </button>
      </div>
    </div>
  );
}

// ── Main admin page ───────────────────────────────────────────
export default function AdminPage() {
  const [pw, setPw]           = useState(null);
  const [subs, setSubs]       = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadSubs(password) {
    setLoading(true);
    const res = await fetch(`/api/admin/submissions?pw=${encodeURIComponent(password)}`);
    if (res.ok) setSubs(await res.json());
    setLoading(false);
  }

  function handleLogin(password) {
    setPw(password);
    loadSubs(password);
  }

  function handleAction(id, action) {
    // Remove from pending list after action
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

        <div style={styles.content}>
          <h2 style={styles.sectionTitle}>
            Flagged Submissions
            {pending.length > 0 && (
              <span style={styles.badge}>{pending.length}</span>
            )}
          </h2>

          {loading && <p style={{ color: '#888' }}>Loading…</p>}

          {!loading && pending.length === 0 && (
            <div style={styles.emptyState}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>All clear</div>
              <div style={{ color: '#888' }}>No submissions need review right now.</div>
            </div>
          )}

          {pending.map((sub) => (
            <SubmissionCard
              key={sub.id}
              sub={sub}
              pw={pw}
              onAction={handleAction}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ── Inline styles (no global CSS dependency) ─────────────────
const styles = {
  loginWrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f5',
    fontFamily: "'DM Sans', sans-serif",
  },
  loginBox: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 12,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 380,
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  loginLogo:  { fontSize: 40, marginBottom: 10 },
  loginTitle: { fontSize: 22, fontWeight: 700, marginBottom: 24, color: '#1a1a1a' },
  loginForm:  { display: 'flex', flexDirection: 'column', gap: 12 },
  loginInput: {
    height: 44, padding: '0 14px', border: '1.5px solid #e0e0e0',
    borderRadius: 6, fontSize: 15, outline: 'none',
  },
  loginErr:   { color: '#c62828', fontSize: 13 },
  loginBtn: {
    height: 44, background: '#ec407a', color: '#fff',
    border: 'none', borderRadius: 6, fontSize: 15,
    fontWeight: 700, cursor: 'pointer',
  },
  page: { minHeight: '100vh', background: '#f5f5f5', fontFamily: "'DM Sans', sans-serif" },
  topBar: { background: '#1a1a1a', padding: '0 24px', height: 52 },
  topBarInner: {
    maxWidth: 900, margin: '0 auto', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  topBarTitle: { color: '#fff', fontWeight: 700, fontSize: 16 },
  topBarLink:  { color: '#ec407a', textDecoration: 'none', fontSize: 14 },
  content: { maxWidth: 900, margin: '0 auto', padding: '32px 24px' },
  sectionTitle: {
    fontSize: 20, fontWeight: 700, color: '#1a1a1a',
    marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
  },
  badge: {
    background: '#ec407a', color: '#fff',
    borderRadius: 20, padding: '2px 10px', fontSize: 13,
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
};
