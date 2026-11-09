// pages/admin.js
// Admin panel for reviewing flagged submissions + AI review log.
// Admin access requires ADMIN_PASSWORD in the server environment.

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const TYPE_LABELS = {
  event:   ' Event',
  bar:     ' Wine Bar',
  store:   ' Wine Store',
  winery:  ' Winery',
};

const VERDICT_STYLES = {
  'reviewed-posted':    { bg: '#e8f5e9', color: '#2e7d32', label: ' Auto-approved' },
  'reviewed-rejected':  { bg: '#ffebee', color: '#c62828', label: ' Auto-rejected' },
  'reviewed-escalated': { bg: '#fff8e1', color: '#e65100', label: ' Escalated' },
};

// --- Login screen -----------------------------------------
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
        <div style={styles.loginLogo}>NYCWine</div>
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
            {busy ? 'Checking...' : 'Sign In ->'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Editable field ----------------------------------------
function EditField({ label, value, onChange, multiline }) {
  if (multiline) {
    return (
      <div style={styles.editField}>
        <label style={styles.editLabel}>{label}</label>
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={styles.editInputMultiline}
          rows={3}
        />
      </div>
    );
  }
  return (
    <div style={styles.editField}>
      <label style={styles.editLabel}>{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={styles.editInput}
      />
    </div>
  );
}

// --- Flagged submission card (needs human review) ---------
function SubmissionCard({ sub, pw, onAction }) {
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);
  const [actionError, setActionError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const fields = ['address', 'venue', 'date', 'website', 'url', 'description', 'phone', 'contact_email', 'neighborhood'];

  function startEditing() {
    setEditData({
      address:      sub.data?.address || '',
      venue:        sub.data?.venue || '',
      date:         sub.data?.date || '',
      website:      sub.data?.website || '',
      url:          sub.data?.url || '',
      description:  sub.data?.description || '',
      phone:        sub.data?.phone || '',
      neighborhood: sub.data?.neighborhood || '',
      contact_email: sub.contact_email || '',
    });
    setEditing(true);
  }

  function updateField(key, val) {
    setEditData((prev) => ({ ...prev, [key]: val }));
  }

  async function saveEdits() {
    setSaving(true);
    // Build the data object (exclude contact_email - it's a top-level field)
    const { contact_email, ...dataFields } = editData;
    const res = await fetch('/api/admin/submissions', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        pw,
        id: sub.id,
        data: dataFields,
      }),
    });
    if (res.ok) {
      setEditing(false);
    }
    setSaving(false);
  }

  async function act(action) {
    setBusy(true);
    setActionError('');
    try {
      const res = await fetch('/api/admin/submissions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pw, id: sub.id, action }),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(action);
        onAction(sub.id, action, result);
      } else {
        setActionError(result.error || `Could not ${action} this submission (HTTP ${res.status}).`);
      }
    } catch (error) {
      setActionError(error.message || 'Could not reach the admin API. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div style={{ ...styles.card, opacity: 0.5 }}>
        <span style={{ color: done === 'approve' ? '#2e7d32' : '#c62828', fontWeight: 700 }}>
          {done === 'approve' ? 'Approved' : 'Rejected'}
        </span>
        {'  -  '}{sub.name}
      </div>
    );
  }

  // --- Edit mode ------------------------------------------
  if (editing) {
    return (
      <div style={{ ...styles.card, borderColor: '#ec407a', borderWidth: 2 }}>
        <div style={styles.cardHeader}>
          <span style={styles.typeBadge}>{TYPE_LABELS[sub.type] || sub.type}</span>
          <span style={{ ...styles.cardDate, color: '#ec407a', fontWeight: 700 }}>Editing</span>
        </div>

        <div style={styles.cardName}>{sub.name}</div>
        <div style={styles.editGrid}>
          {fields.map((key) => {
            const labelMap = {
              address: 'Address', venue: 'Venue', date: 'Date',
              website: 'Website', url: 'URL', description: 'Description',
              phone: 'Phone', neighborhood: 'Neighborhood', contact_email: 'Contact Email',
            };
            if (editData[key] === undefined) return null;
            return (
              <EditField
                key={key}
                label={labelMap[key] || key}
                value={editData[key]}
                onChange={(v) => updateField(key, v)}
                multiline={key === 'description'}
              />
            );
          })}
        </div>

        <div style={styles.cardActions}>
          <button
            onClick={saveEdits}
            disabled={saving}
            style={{ ...styles.actionBtn, background: '#ec407a', color: '#fff' }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={saving}
            style={{ ...styles.actionBtn, background: '#f5f5f5', color: '#666' }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // --- View mode (default) ---------------------------------
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
        {sub.data?.phone       && <div><strong>Phone:</strong> {sub.data.phone}</div>}
        {sub.data?.description && <div><strong>Description:</strong> {sub.data.description}</div>}
        {sub.contact_email     && <div><strong>Contact:</strong> {sub.contact_email}</div>}
      </div>

      {sub.ai_reason && (
        <div style={styles.aiReason}>
          <strong>AI flag reason:</strong> {sub.ai_reason}
        </div>
      )}

      {actionError && <div role="alert" style={styles.actionError}>{actionError}</div>}

      <div style={styles.cardActions}>
        <button onClick={() => act('approve')} disabled={busy}
          style={{ ...styles.actionBtn, ...styles.approveBtn }}>
          {busy ? '...' : 'Approve'}
        </button>
        <button onClick={() => act('reject')} disabled={busy}
          style={{ ...styles.actionBtn, ...styles.rejectBtn }}>
          {busy ? '...' : 'Reject'}
        </button>
        <button onClick={startEditing} disabled={busy}
          style={{ ...styles.actionBtn, background: '#e3f2fd', color: '#1565c0' }}>
           Edit
        </button>
      </div>
    </div>
  );
}

function formatLogDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function formatLogLabel(key) {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function logVerdictStyle(sub, adminHistory) {
  const lastDecision = adminHistory.at(-1);
  if (lastDecision?.action === 'approve') {
    return { bg: '#e8f5e9', color: '#2e7d32', label: 'Admin-approved' };
  }
  if (lastDecision?.action === 'reject') {
    return { bg: '#ffebee', color: '#c62828', label: 'Admin-rejected' };
  }
  if (sub.status === 'reviewed-posted' && sub.ai_verdict && sub.ai_verdict !== 'post') {
    return { bg: '#e8f5e9', color: '#2e7d32', label: 'Approved after AI review' };
  }
  if (sub.status === 'reviewed-rejected' && sub.ai_verdict && sub.ai_verdict !== 'reject') {
    return { bg: '#ffebee', color: '#c62828', label: 'Rejected after AI review' };
  }
  return VERDICT_STYLES[sub.status] || { bg: '#f5f5f5', color: '#555', label: sub.status };
}

// --- Expandable AI review log row --------------------------
function LogRow({ sub, pw, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const adminHistory = Array.isArray(sub.data?.admin_review_history) ? sub.data.admin_review_history : [];
  const verdict = logVerdictStyle(sub, adminHistory);
  const rejected = sub.status === 'reviewed-rejected';
  const canApprove = ['reviewed-escalated', 'reviewed-rejected'].includes(sub.status) &&
    ['event', 'bar', 'store', 'winery'].includes(sub.type);
  const detailId = `log-details-${String(sub.id).replace(/[^A-Za-z0-9_-]/g, '-')}`;
  const submittedData = sub.data && typeof sub.data === 'object' && !Array.isArray(sub.data)
    ? Object.entries(sub.data).filter(([key, value]) => key !== 'admin_review_history' && value !== null && value !== undefined && value !== '')
    : [];

  async function approve() {
    setBusy(true);
    setActionError('');
    try {
      const res = await fetch('/api/admin/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pw, id: sub.id, action: 'approve' }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(result.error || `Approval failed (HTTP ${res.status}).`);
        return;
      }
      onAction(sub.id, result);
    } catch (error) {
      setActionError(error.message || 'Could not reach the admin API. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.logRow}>
      <button
        type="button"
        style={styles.logSummary}
        aria-expanded={expanded}
        aria-controls={detailId}
        onClick={() => setExpanded((value) => !value)}
      >
        <span style={styles.logDisclosure} aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        <span style={styles.logTypeBadge}>{TYPE_LABELS[sub.type] || sub.type}</span>
        <span style={styles.logName}>{sub.name}</span>
        <span style={{ ...styles.logVerdict, background: verdict.bg, color: verdict.color }}>{verdict.label}</span>
        {sub.ai_reason && (
          <span style={styles.logReason} title={sub.ai_reason}>
            {sub.ai_reason.length > 80 ? sub.ai_reason.slice(0, 80) + '...' : sub.ai_reason}
          </span>
        )}
        <span style={styles.logDate}>{new Date(sub.submitted_at).toLocaleDateString()}</span>
      </button>

      <div id={detailId} hidden={!expanded} style={expanded ? styles.logExpanded : { display: 'none' }}>
          <h3 style={styles.logSectionTitle}>Submission details</h3>
          <div style={styles.logFieldGrid}>
            {[
              ['Submission ID', sub.id],
              ['Type', TYPE_LABELS[sub.type] || sub.type],
              ['Current status', verdict.label],
              ['Contact email', sub.contact_email],
              ['AI verdict', sub.ai_verdict],
              ['Submitted', formatLogDate(sub.submitted_at)],
              ['Flagged', formatLogDate(sub.flagged_at)],
              ['Approved', formatLogDate(sub.approved_at)],
              ['Rejected', formatLogDate(sub.rejected_at)],
            ].filter(([, value]) => value !== null && value !== undefined && value !== '').map(([label, value]) => (
              <div style={styles.logField} key={label}>
                <strong style={styles.logFieldLabel}>{label}</strong>
                <span style={styles.logFieldValue}>{String(value)}</span>
              </div>
            ))}
          </div>

          <h3 style={styles.logSectionTitle}>Information provided</h3>
          {submittedData.length ? (
            <div style={styles.logDataGrid}>
              {submittedData.map(([key, value]) => {
                const isLink = typeof value === 'string' && /^(url|website|image|logoUrl)$/i.test(key) && /^https?:\/\//i.test(value);
                return (
                  <div style={styles.logDataItem} key={key}>
                    <strong>{formatLogLabel(key)}</strong>
                    {isLink
                      ? <a href={value} target="_blank" rel="noreferrer" style={styles.logDataValue}>{value}</a>
                      : <pre style={styles.logDataValue}>{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</pre>}
                  </div>
                );
              })}
            </div>
          ) : <p style={styles.logEmpty}>No additional submission fields were saved.</p>}

          {sub.ai_reason && (
            <div style={styles.logAiReason}>
              <strong>Full AI reason:</strong> {sub.ai_reason}
              {sub.ai_reason === 'AI review failed.' && (
                <p style={styles.logEmpty}>This older record saved only a generic failure. The provider response was not captured, so its exact historical HTTP error cannot be recovered. New failures will show the HTTP status and provider message.</p>
              )}
            </div>
          )}

          {adminHistory.length > 0 && (
            <div style={styles.logHistory}>
              <strong>Admin review history</strong>
              {adminHistory.map((entry, index) => (
                <div key={`${entry.at || index}-${index}`}>
                  {entry.action === 'approve' ? 'Approved' : 'Rejected'} at {formatLogDate(entry.at)}
                  {entry.previous_status ? ` (was ${entry.previous_status})` : ''}
                </div>
              ))}
            </div>
          )}

          {canApprove && (
            <div style={styles.logActionBar}>
              {sub.type === 'event' ? (
                <button onClick={approve} disabled={busy} style={{ ...styles.actionBtn, ...styles.approveBtn }}>
                  {busy ? 'Approving...' : rejected ? 'Override rejection & publish' : 'Approve & publish'}
                </button>
              ) : (
                <button onClick={approve} disabled={busy} style={{ ...styles.actionBtn, ...styles.approveBtn }}>
                  {busy ? 'Saving...' : rejected ? 'Override rejection' : 'Approve'}
                </button>
              )}
              {sub.type !== 'event' && <p style={styles.logEmpty}>This records the review decision; venue listings still use the existing manual publishing step.</p>}
            </div>
          )}
          {actionError && <div role="alert" style={styles.actionError}>{actionError}</div>}
      </div>
    </div>
  );
}

// --- Main admin page ---------------------------------------
export default function AdminPage() {
  const [pw, setPw]           = useState(null);
  const [subs, setSubs]       = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState('flagged');

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

  function updateLogRow(id, result) {
    setAllLogs((prev) => prev.map((row) => row.id === id ? {
      ...row,
      status: result.status || row.status,
      approved_at: result.status === 'reviewed-posted' ? result.reviewed_at || row.approved_at : row.approved_at,
      rejected_at: result.status === 'reviewed-rejected' ? result.reviewed_at || row.rejected_at : row.rejected_at,
      data: {
        ...(row.data || {}),
        ...(Array.isArray(result.admin_review_history) ? { admin_review_history: result.admin_review_history } : {}),
      },
    } : row));
  }

  function handleAction(id, action, result) {
    setSubs((prev) => prev.filter((s) => s.id !== id));
    updateLogRow(id, result || {});
  }

  function handleLogAction(id, result) {
    setSubs((prev) => prev.filter((s) => s.id !== id));
    updateLogRow(id, result || {});
  }

  if (!pw) return (
    <>
      <Head><title>Admin - NYCWine</title><meta name="robots" content="noindex" /></Head>
      <LoginScreen onLogin={handleLogin} />
    </>
  );

  const pending = subs.filter((s) => s.status === 'reviewed-escalated');

  return (
    <>
      <Head><title>Admin - NYCWine</title><meta name="robots" content="noindex" /></Head>
      <div style={styles.page}>
        <div style={styles.topBar}>
          <div style={styles.topBarInner}>
            <span style={styles.topBarTitle}>NYCWine Admin</span>
            <Link href="/" style={styles.topBarLink}>Back to site</Link>
          </div>
        </div>

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
          {loading && <p style={{ color: '#888' }}>Loading...</p>}

          {!loading && tab === 'flagged' && (
            <>
              {pending.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
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

          {!loading && tab === 'log' && (
            <>
              <p style={styles.logHelp}>
                All submissions processed by AI in the last 100 entries.
                Green = approved, Red = rejected, Yellow = escalated for human review.
              </p>
              {allLogs.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={{ color: '#888' }}>No submissions yet.</div>
                </div>
              ) : (
                <div style={styles.logTable}>
                  {allLogs.map((sub) => <LogRow key={sub.id} sub={sub} pw={pw} onAction={handleLogAction} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// --- Inline styles -----------------------------------------
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
  cardActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  actionBtn: {
    padding: '9px 22px', border: 'none', borderRadius: 6,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  approveBtn: { background: '#e8f5e9', color: '#2e7d32' },
  rejectBtn:  { background: '#ffebee', color: '#c62828' },
  editGrid: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 },
  editField: { display: 'flex', flexDirection: 'column', gap: 3 },
  editLabel: { fontSize: 12, fontWeight: 700, color: '#666', textTransform: 'uppercase' },
  editInput: {
    height: 36, padding: '0 10px', border: '1.5px solid #e0e0e0',
    borderRadius: 5, fontSize: 14, outline: 'none',
  },
  editInputMultiline: {
    padding: '8px 10px', border: '1.5px solid #e0e0e0',
    borderRadius: 5, fontSize: 14, outline: 'none', resize: 'vertical',
    fontFamily: 'inherit', lineHeight: 1.5,
  },
  actionError: { marginBottom: 12, padding: '9px 12px', borderRadius: 6, background: '#ffebee', color: '#b71c1c', fontSize: 13 },
  logHelp: { fontSize: 13, color: '#666', marginBottom: 16 },
  logTable: {
    background: '#fff', border: '1px solid #e0e0e0',
    borderRadius: 10, overflow: 'hidden',
  },
  logRow: { borderBottom: '1px solid #f0f0f0', fontSize: 13 },
  logSummary: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    padding: '12px 16px', border: 'none', background: 'transparent', color: 'inherit',
    textAlign: 'left', font: 'inherit', cursor: 'pointer',
  },
  logDisclosure: { width: 14, flex: '0 0 14px', color: '#888', fontSize: 16, textAlign: 'center' },
  logExpanded: { padding: '6px 16px 18px', background: '#fcfcfc' },
  logSectionTitle: { margin: '12px 0 8px', fontSize: 13, color: '#333' },
  logFieldGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 7 },
  logField: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  logFieldLabel: { fontSize: 11, color: '#777', textTransform: 'uppercase' },
  logFieldValue: { fontSize: 13, color: '#333', overflowWrap: 'anywhere' },
  logDataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 8 },
  logDataItem: { padding: '8px 10px', border: '1px solid #eee', borderRadius: 6, background: '#fff', minWidth: 0 },
  logDataValue: { display: 'block', margin: '4px 0 0', color: '#444', fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  logEmpty: { margin: '6px 0 0', color: '#777', fontSize: 12, lineHeight: 1.5 },
  logAiReason: { marginTop: 10, padding: '10px 12px', borderRadius: 6, background: '#fff8e1', color: '#5d4037', overflowWrap: 'anywhere' },
  logHistory: { marginTop: 12, display: 'grid', gap: 4, fontSize: 12, color: '#555' },
  logActionBar: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14 },
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
