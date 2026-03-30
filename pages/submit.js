// pages/submit.js
// ─────────────────────────────────────────────────────────────
// Free submission form — add an Event, Wine Bar, Wine Store,
// or Winery to NYCWine.com. No account required.
// Submits to /api/submit for AI review then auto-posting.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import QuickNav from '../components/QuickNav';
import Footer from '../components/Footer';

const TYPES = [
  { id: 'event',   label: 'Wine Event',  icon: '🎉', desc: 'A tasting, class, dinner, or festival' },
  { id: 'bar',     label: 'Wine Bar',    icon: '🍷', desc: 'A wine bar in NYC' },
  { id: 'store',   label: 'Wine Store',  icon: '🛒', desc: 'A wine shop or retailer' },
  { id: 'winery',  label: 'Winery',      icon: '🍇', desc: 'A winery near NYC' },
];

const BOROUGHS   = ['Manhattan', 'Brooklyn', 'Queens', 'The Bronx', 'Staten Island'];
const REGIONS    = ['Hamptons', 'North Fork', 'Long Island (North Shore)', 'Long Island (South Shore)', 'Hudson Valley', 'Finger Lakes', 'Other'];

function Field({ label, required, children, hint }) {
  return (
    <div className="sub-field">
      <label className="sub-label">
        {label}{required && <span className="sub-required">*</span>}
      </label>
      {hint && <div className="sub-hint">{hint}</div>}
      {children}
    </div>
  );
}

export default function SubmitPage() {
  const [type,    setType]    = useState('');
  const [form,    setForm]    = useState({});
  const [status,  setStatus]  = useState('idle'); // idle | submitting | success | error
  const [errMsg,  setErrMsg]  = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setErrMsg('');
    try {
      const res = await fetch('/api/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setStatus('success');
    } catch (err) {
      setErrMsg(err.message);
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <>
        <Head><title>Submission Received — NYCWine.com</title></Head>
        <Header /><QuickNav />
        <main className="sub-page">
          <div className="sub-success">
            <div className="sub-success-icon">✓</div>
            <h1 className="sub-success-title">Submission Received!</h1>
            <p>Thanks — we&apos;re reviewing your listing now. You&apos;ll receive a confirmation at the email you provided once it goes live, typically within a few hours.</p>
            <div className="sub-success-links">
              <Link href="/" className="adv-btn-primary">Back to Home</Link>
              <Link href="/advertise" className="adv-btn-secondary">View Ad Options</Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Submit a Free Listing — NYCWine.com</title>
        <meta name="description" content="Add your wine bar, wine store, winery, or wine event to NYCWine.com for free. No account required." />
      </Head>
      <Header />
      <QuickNav />

      <main className="sub-page">
        <div className="sub-header">
          <Link href="/advertise" className="sub-back">← Advertise</Link>
          <h1 className="sub-title">Submit a Free Listing</h1>
          <p className="sub-subtitle">
            Add your venue or event to NYCWine.com at no cost. No account needed —
            just fill in the details and provide a contact email.
          </p>
        </div>

        {/* Step 1 — choose type */}
        <div className="sub-section">
          <div className="sub-section-title">What are you submitting?<span className="sub-required">*</span></div>
          <div className="sub-type-grid">
            {TYPES.map(t => (
              <button
                key={t.id}
                type="button"
                className={`sub-type-card${type === t.id ? ' selected' : ''}`}
                onClick={() => { setType(t.id); setForm({}); }}
              >
                <span className="sub-type-icon">{t.icon}</span>
                <span className="sub-type-label">{t.label}</span>
                <span className="sub-type-desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 — form fields for chosen type */}
        {type && (
          <form className="sub-form" onSubmit={handleSubmit}>

            {/* ── EVENT ─────────────────────────────────────── */}
            {type === 'event' && (<>
              <Field label="Event Name" required>
                <input className="sub-input" value={form.name||''} onChange={e=>set('name',e.target.value)} required placeholder="e.g. Spring Burgundy Tasting" />
              </Field>
              <Field label="Venue / Location" required>
                <input className="sub-input" value={form.venue||''} onChange={e=>set('venue',e.target.value)} required placeholder="Name and address of the venue" />
              </Field>
              <div className="sub-row">
                <Field label="Event Date" required>
                  <input className="sub-input" type="date" value={form.date||''} onChange={e=>set('date',e.target.value)} required />
                </Field>
                <Field label="End Date" hint="If multi-day">
                  <input className="sub-input" type="date" value={form.endDate||''} onChange={e=>set('endDate',e.target.value)} />
                </Field>
              </div>
              <div className="sub-row">
                <Field label="Start Time">
                  <input className="sub-input" value={form.time||''} onChange={e=>set('time',e.target.value)} placeholder="e.g. 6:00 PM" />
                </Field>
                <Field label="Ticket Price">
                  <input className="sub-input" value={form.price||''} onChange={e=>set('price',e.target.value)} placeholder="e.g. $75 or Free" />
                </Field>
              </div>
              <Field label="Event Description" required>
                <textarea className="sub-textarea" value={form.description||''} onChange={e=>set('description',e.target.value)} required rows={4} placeholder="Tell us about the event — wines featured, format, what to expect…" />
              </Field>
              <Field label="Tickets / Event URL" required hint="Where people can learn more or buy tickets">
                <input className="sub-input" type="url" value={form.url||''} onChange={e=>set('url',e.target.value)} required placeholder="https://" />
              </Field>
              <Field label="Event Image URL" hint="A photo or banner for the event (hosted image URL)">
                <input className="sub-input" type="url" value={form.image||''} onChange={e=>set('image',e.target.value)} placeholder="https://" />
              </Field>
            </>)}

            {/* ── WINE BAR ───────────────────────────────────── */}
            {type === 'bar' && (<>
              <Field label="Wine Bar Name" required>
                <input className="sub-input" value={form.name||''} onChange={e=>set('name',e.target.value)} required placeholder="e.g. Parcelle Wine Bar" />
              </Field>
              <Field label="Street Address" required>
                <input className="sub-input" value={form.address||''} onChange={e=>set('address',e.target.value)} required placeholder="e.g. 72 MacDougal St, New York, NY 10012" />
              </Field>
              <div className="sub-row">
                <Field label="Borough" required>
                  <select className="sub-select" value={form.borough||''} onChange={e=>set('borough',e.target.value)} required>
                    <option value="">Select…</option>
                    {BOROUGHS.map(b=><option key={b} value={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Neighborhood">
                  <input className="sub-input" value={form.neighborhood||''} onChange={e=>set('neighborhood',e.target.value)} placeholder="e.g. Greenwich Village" />
                </Field>
              </div>
              <div className="sub-row">
                <Field label="Phone Number">
                  <input className="sub-input" type="tel" value={form.phone||''} onChange={e=>set('phone',e.target.value)} placeholder="(212) 555-0100" />
                </Field>
                <Field label="Website URL" required>
                  <input className="sub-input" type="url" value={form.website||''} onChange={e=>set('website',e.target.value)} required placeholder="https://" />
                </Field>
              </div>
              <Field label="Brief Description" hint="1–2 sentences about the bar's style or specialty">
                <textarea className="sub-textarea" value={form.description||''} onChange={e=>set('description',e.target.value)} rows={3} placeholder="Natural wines and small plates in a cozy East Village setting…" />
              </Field>
            </>)}

            {/* ── WINE STORE ─────────────────────────────────── */}
            {type === 'store' && (<>
              <Field label="Store Name" required>
                <input className="sub-input" value={form.name||''} onChange={e=>set('name',e.target.value)} required placeholder="e.g. Astor Wines & Spirits" />
              </Field>
              <Field label="Street Address" required>
                <input className="sub-input" value={form.address||''} onChange={e=>set('address',e.target.value)} required placeholder="e.g. 399 Lafayette St, New York, NY 10003" />
              </Field>
              <div className="sub-row">
                <Field label="Neighborhood" required>
                  <input className="sub-input" value={form.neighborhood||''} onChange={e=>set('neighborhood',e.target.value)} required placeholder="e.g. NoHo" />
                </Field>
                <Field label="Phone Number">
                  <input className="sub-input" type="tel" value={form.phone||''} onChange={e=>set('phone',e.target.value)} placeholder="(212) 555-0100" />
                </Field>
              </div>
              <Field label="Website URL" required>
                <input className="sub-input" type="url" value={form.website||''} onChange={e=>set('website',e.target.value)} required placeholder="https://" />
              </Field>
              <Field label="Brief Description" hint="Optional — specialty, focus, or what makes the store stand out">
                <textarea className="sub-textarea" value={form.description||''} onChange={e=>set('description',e.target.value)} rows={3} placeholder="Family-owned shop specialising in Italian and natural wines…" />
              </Field>
            </>)}

            {/* ── WINERY ────────────────────────────────────── */}
            {type === 'winery' && (<>
              <Field label="Winery Name" required>
                <input className="sub-input" value={form.name||''} onChange={e=>set('name',e.target.value)} required placeholder="e.g. Bedell Cellars" />
              </Field>
              <Field label="Street Address" required>
                <input className="sub-input" value={form.address||''} onChange={e=>set('address',e.target.value)} required placeholder="Full address including zip code" />
              </Field>
              <div className="sub-row">
                <Field label="Region" required>
                  <select className="sub-select" value={form.region||''} onChange={e=>set('region',e.target.value)} required>
                    <option value="">Select…</option>
                    {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Phone Number">
                  <input className="sub-input" type="tel" value={form.phone||''} onChange={e=>set('phone',e.target.value)} placeholder="(631) 555-0100" />
                </Field>
              </div>
              <Field label="Website URL" required>
                <input className="sub-input" type="url" value={form.website||''} onChange={e=>set('website',e.target.value)} required placeholder="https://" />
              </Field>
              <Field label="Brief Description" hint="Varietals, style, tasting room hours, etc.">
                <textarea className="sub-textarea" value={form.description||''} onChange={e=>set('description',e.target.value)} rows={3} placeholder="North Fork estate known for Merlot and Cabernet Franc, tasting room open weekends…" />
              </Field>
            </>)}

            {/* ── Contact email — all types ──────────────────── */}
            <div className="sub-divider" />
            <Field label="Your Contact Email" required hint="We'll send a confirmation when your listing goes live. Never shared publicly.">
              <input className="sub-input" type="email" value={form.contactEmail||''} onChange={e=>set('contactEmail',e.target.value)} required placeholder="you@example.com" />
            </Field>

            {status === 'error' && (
              <div className="sub-error">{errMsg || 'Something went wrong. Please try again.'}</div>
            )}

            <div className="sub-submit-row">
              <button type="submit" className="adv-btn-primary adv-btn-large sub-submit-btn" disabled={status==='submitting'}>
                {status === 'submitting' ? 'Submitting…' : 'Submit Free Listing →'}
              </button>
              <p className="sub-fine-print">
                By submitting you confirm this information is accurate and wine-related.
                Submissions are reviewed by AI before going live.
              </p>
            </div>

          </form>
        )}
      </main>

      <Footer />
    </>
  );
}
