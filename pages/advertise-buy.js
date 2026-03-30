// pages/advertise-buy.js
// ─────────────────────────────────────────────────────────────
// Paid ad booking flow — advertiser picks their slot, duration,
// start month, uploads creative, then is redirected to Stripe
// Checkout to pay. No account required.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import QuickNav from '../components/QuickNav';
import Footer from '../components/Footer';

// ── Slot & pricing config (mirrors advertise.js) ─────────────
const AD_SLOTS = {
  header: {
    name:        'Header Banner Ad',
    icon:        '🏆',
    placement:   'Sitewide header — every page',
    size:        '468 × 60 px',
    monthlyRate: 300,
    description: 'Maximum visibility — your banner appears at the top of every page on NYCWine.com.',
  },
  event: {
    name:        'Featured Event',
    icon:        '🎉',
    placement:   'Homepage events feed (top) + Events page',
    size:        'Logo + name + date card',
    monthlyRate: 25,
    description: 'Your event at the top of the homepage events feed and Events directory page.',
  },
  bar: {
    name:        'Featured Wine Bar',
    icon:        '🍷',
    placement:   'Wine Bars directory page — featured sidebar',
    size:        'Logo + name + address card',
    monthlyRate: 25,
    description: 'Your wine bar highlighted in the Featured sidebar on the Wine Bars directory page.',
  },
  store: {
    name:        'Featured Wine Store',
    icon:        '🛒',
    placement:   'Wine Stores directory page — featured sidebar',
    size:        'Logo + name + address card',
    monthlyRate: 25,
    description: 'Your wine store highlighted in the Featured sidebar on the Wine Stores directory page.',
  },
  winery: {
    name:        'Featured Winery',
    icon:        '🍇',
    placement:   'Wineries directory page — featured sidebar',
    size:        'Logo + name + region card',
    monthlyRate: 25,
    description: 'Your winery highlighted in the Featured sidebar on the Wineries directory page.',
  },
  sidebar: {
    name:        'Events Sidebar Ad',
    icon:        '📅',
    placement:   'Homepage events sidebar',
    size:        '300 × 90 px',
    monthlyRate: 100,
    description: 'Reach visitors browsing wine events, tastings, and auctions on the homepage.',
  },
  social: {
    name:        'Social Page Ad',
    icon:        '📱',
    placement:   'Wine Social page sidebar',
    size:        '300 × 250 px',
    monthlyRate: 75,
    description: 'Reach engaged visitors browsing community wine content.',
  },
};

const TIERS = [
  { key: 'monthly',   label: '1 Month',  months: 1,  discount: 0,    note: '' },
  { key: 'quarterly', label: '3 Months', months: 3,  discount: 0.10, note: 'Save 10%' },
  { key: 'annual',    label: '12 Months',months: 12, discount: 0.30, note: 'Save 30%' },
];

function calcTotal(monthlyRate, months, discount) {
  return Math.round(monthlyRate * months * (1 - discount) * 100) / 100;
}

// Generate the next 12 calendar months starting from next month
function getAvailableMonths() {
  const months = [];
  const now = new Date();
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    });
  }
  return months;
}

export default function AdvertiseBuyPage() {
  const router = useRouter();
  const [slotId,       setSlotId]       = useState('');
  const [tierKey,      setTierKey]      = useState('monthly');
  const [startMonth,   setStartMonth]   = useState('');
  const [form,         setForm]         = useState({});
  const [status,       setStatus]       = useState('idle'); // idle | submitting | error
  const [errMsg,       setErrMsg]       = useState('');

  const availableMonths = getAvailableMonths();
  const slot = AD_SLOTS[slotId];
  const tier = TIERS.find(t => t.key === tierKey) || TIERS[0];
  const total = slot ? calcTotal(slot.monthlyRate, tier.months, tier.discount) : 0;
  const perMonth = slot ? Math.round(slot.monthlyRate * (1 - tier.discount) * 100) / 100 : 0;

  // Pre-select slot from ?slot= query param
  useEffect(() => {
    if (router.isReady && router.query.slot && AD_SLOTS[router.query.slot]) {
      setSlotId(router.query.slot);
    }
  }, [router.isReady, router.query.slot]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!slotId || !startMonth) return;
    setStatus('submitting');
    setErrMsg('');

    try {
      const res = await fetch('/api/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          slotId,
          tierKey,
          startMonth,
          advertiserName:  form.advertiserName,
          contactEmail:    form.contactEmail,
          websiteUrl:      form.websiteUrl,
          description:     form.description,
          logoUrl:         form.logoUrl,
          adImageUrl:      form.adImageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start checkout');
      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setErrMsg(err.message);
      setStatus('error');
    }
  }

  return (
    <>
      <Head>
        <title>Book an Ad — NYCWine.com</title>
        <meta name="description" content="Purchase a premium advertising placement on NYCWine.com. Reach thousands of NYC wine enthusiasts." />
      </Head>
      <Header />
      <QuickNav />

      <main className="sub-page">
        <div className="sub-header">
          <Link href="/advertise" className="sub-back">← Advertise</Link>
          <h1 className="sub-title">Book an Ad Placement</h1>
          <p className="sub-subtitle">
            Select your placement, choose a duration, and complete checkout.
            No account required — you&apos;ll pay securely via Stripe.
          </p>
        </div>

        <form className="sub-form buy-form" onSubmit={handleSubmit}>

          {/* ── Step 1: Choose ad slot ───────────────────────── */}
          <div className="sub-section">
            <div className="sub-section-title">1. Choose your placement<span className="sub-required">*</span></div>
            <div className="buy-slot-grid">
              {Object.entries(AD_SLOTS).map(([id, s]) => (
                <button
                  key={id}
                  type="button"
                  className={`buy-slot-card${slotId === id ? ' selected' : ''}`}
                  onClick={() => setSlotId(id)}
                >
                  <div className="buy-slot-icon">{s.icon}</div>
                  <div className="buy-slot-name">{s.name}</div>
                  <div className="buy-slot-placement">{s.placement}</div>
                  <div className="buy-slot-size">{s.size}</div>
                  <div className="buy-slot-rate">${s.monthlyRate}/mo</div>
                </button>
              ))}
            </div>
            {slot && <p className="buy-slot-desc">{slot.description}</p>}
          </div>

          {/* ── Step 2: Choose duration ──────────────────────── */}
          {slotId && (
            <div className="sub-section">
              <div className="sub-section-title">2. Choose duration</div>
              <div className="buy-tier-row">
                {TIERS.map(t => {
                  const tierTotal = calcTotal(slot.monthlyRate, t.months, t.discount);
                  const tierPerMo = Math.round(slot.monthlyRate * (1 - t.discount) * 100) / 100;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      className={`buy-tier-card${tierKey === t.key ? ' selected' : ''}`}
                      onClick={() => setTierKey(t.key)}
                    >
                      {t.note && <div className="buy-tier-badge">{t.note}</div>}
                      <div className="buy-tier-label">{t.label}</div>
                      <div className="buy-tier-total">${tierTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      {t.months > 1 && <div className="buy-tier-per">${tierPerMo}/mo</div>}
                      <div className="buy-tier-note">Renews every {t.months === 12 ? 'year' : t.months === 3 ? '3 months' : 'month'}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Start month ──────────────────────────── */}
          {slotId && (
            <div className="sub-section">
              <div className="sub-section-title">3. Choose your start month<span className="sub-required">*</span></div>
              <p className="buy-month-note">Select when you want your ad to begin. Your first charge covers from this month.</p>
              <div className="buy-month-grid">
                {availableMonths.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    className={`buy-month-btn${startMonth === m.value ? ' selected' : ''}`}
                    onClick={() => setStartMonth(m.value)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 4: Creative & contact details ──────────── */}
          {slotId && startMonth && (
            <div className="sub-section">
              <div className="sub-section-title">4. Your details &amp; creative</div>

              <div className="sub-row">
                <div className="sub-field">
                  <label className="sub-label">Business / Advertiser Name<span className="sub-required">*</span></label>
                  <input className="sub-input" value={form.advertiserName||''} onChange={e=>set('advertiserName',e.target.value)} required placeholder="Your business name" />
                </div>
                <div className="sub-field">
                  <label className="sub-label">Contact Email<span className="sub-required">*</span></label>
                  <div className="sub-hint">For order confirmation and billing. Never shown publicly.</div>
                  <input className="sub-input" type="email" value={form.contactEmail||''} onChange={e=>set('contactEmail',e.target.value)} required placeholder="you@yourbusiness.com" />
                </div>
              </div>

              <div className="sub-field">
                <label className="sub-label">Your Website URL<span className="sub-required">*</span></label>
                <div className="sub-hint">Where the ad should link to when clicked.</div>
                <input className="sub-input" type="url" value={form.websiteUrl||''} onChange={e=>set('websiteUrl',e.target.value)} required placeholder="https://yourbusiness.com" />
              </div>

              {/* Banner ad slots need an image URL */}
              {(slotId === 'header' || slotId === 'acker' || slotId === 'borghese') && (
                <div className="sub-field">
                  <label className="sub-label">Ad Image URL<span className="sub-required">*</span></label>
                  <div className="sub-hint">
                    Host your ad image somewhere (e.g. your website, Dropbox, Google Drive public link) and paste the URL here.
                    Size required: {slot.size}.
                  </div>
                  <input className="sub-input" type="url" value={form.adImageUrl||''} onChange={e=>set('adImageUrl',e.target.value)} required placeholder="https://yourbusiness.com/ad-image.jpg" />
                </div>
              )}

              {/* Featured placement needs logo + description */}
              {slotId === 'featured' && (<>
                <div className="sub-field">
                  <label className="sub-label">Logo URL<span className="sub-required">*</span></label>
                  <div className="sub-hint">Your logo hosted online — we&apos;ll display it on the featured card.</div>
                  <input className="sub-input" type="url" value={form.logoUrl||''} onChange={e=>set('logoUrl',e.target.value)} required placeholder="https://yourbusiness.com/logo.png" />
                </div>
                <div className="sub-field">
                  <label className="sub-label">Short Description</label>
                  <div className="sub-hint">1–2 sentences shown below your name on the featured card.</div>
                  <textarea className="sub-textarea" value={form.description||''} onChange={e=>set('description',e.target.value)} rows={2} placeholder="Award-winning Hamptons winery known for its Rosé and summer tastings…" />
                </div>
              </>)}

            </div>
          )}

          {/* ── Order summary + checkout ─────────────────────── */}
          {slotId && startMonth && form.contactEmail && (
            <div className="buy-summary">
              <div className="buy-summary-title">Order Summary</div>
              <div className="buy-summary-row">
                <span>{slot.icon} {slot.name}</span>
                <span>{tier.label}</span>
              </div>
              <div className="buy-summary-row">
                <span>Starts</span>
                <span>{availableMonths.find(m => m.value === startMonth)?.label}</span>
              </div>
              {tier.discount > 0 && (
                <div className="buy-summary-row buy-summary-discount">
                  <span>Discount</span>
                  <span>−{Math.round(tier.discount * 100)}%</span>
                </div>
              )}
              <div className="buy-summary-total">
                <span>Total charged today</span>
                <span>${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              {tier.months > 1 && (
                <div className="buy-summary-renew">
                  Renews at ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} every {tier.months === 12 ? 'year' : '3 months'} until cancelled.
                </div>
              )}
              {tier.months === 1 && (
                <div className="buy-summary-renew">
                  Renews at ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} every month until cancelled.
                </div>
              )}

              {status === 'error' && (
                <div className="sub-error">{errMsg}</div>
              )}

              <button
                type="submit"
                className="adv-btn-primary adv-btn-large buy-checkout-btn"
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? 'Redirecting to Stripe…' : `Pay $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} & Book Placement →`}
              </button>
              <p className="buy-stripe-note">
                🔒 Secure checkout powered by Stripe. Cancel anytime from your billing portal.
              </p>
            </div>
          )}

        </form>
      </main>

      <Footer />
    </>
  );
}
