// pages/advertise.js
// ─────────────────────────────────────────────────────────────
// Advertising & free listing page — explains all options and
// links to the free submission form or the paid booking flow.
// ─────────────────────────────────────────────────────────────

import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import QuickNav from '../components/QuickNav';
import Footer from '../components/Footer';

// ── Pricing data ─────────────────────────────────────────────
const AD_SLOTS = [
  {
    id: 'header',
    name: 'Header Banner',
    description: 'Prime placement — your ad appears in the site header on every single page, seen by every visitor. Currently occupied by Yorkshire Wines & Spirits.',
    placement: 'Sitewide header (all pages)',
    size: '468 × 60 px banner',
    monthlyPrice: 300,
    icon: '🏆',
  },
  {
    id: 'event',
    name: 'Featured Event',
    description: 'Your wine tasting, dinner, class, or festival appears at the top of the Events feed on the homepage and on the Events directory page — above all other listings. Includes your logo, name, date, and a direct ticket or info link.',
    placement: 'Homepage events feed (top position) + Events directory page',
    size: 'Logo + name + date + link card',
    monthlyPrice: 25,
    icon: '🎉',
  },
  {
    id: 'bar',
    name: 'Featured Wine Bar',
    description: 'Your wine bar appears in the Featured sidebar on the Wine Bars directory page, shown prominently to visitors browsing NYC wine bars by borough and neighborhood. Includes your logo, name, address, and a direct link.',
    placement: 'Wine Bars directory page — featured sidebar',
    size: 'Logo + name + address card',
    monthlyPrice: 25,
    icon: '🍷',
  },
  {
    id: 'store',
    name: 'Featured Wine Store',
    description: 'Your wine shop appears in the Featured sidebar on the Wine Stores directory page, positioned above the full store listing for maximum visibility to NYC wine shoppers.',
    placement: 'Wine Stores directory page — featured sidebar',
    size: 'Logo + name + address card',
    monthlyPrice: 25,
    icon: '🛒',
  },
  {
    id: 'winery',
    name: 'Featured Winery',
    description: 'Your winery appears in the Featured sidebar on the Wineries directory page, highlighted above all other listings for visitors planning a Long Island or Hamptons wine trip.',
    placement: 'Wineries directory page — featured sidebar',
    size: 'Logo + name + region card',
    monthlyPrice: 25,
    icon: '🍇',
  },
  {
    id: 'sidebar',
    name: 'Events Sidebar Ad',
    description: 'Your banner appears in the sidebar of the homepage Events section — seen by every visitor browsing upcoming wine events, tastings, classes, and auctions.',
    placement: 'Homepage events sidebar',
    size: '300 × 90 px banner',
    monthlyPrice: 100,
    icon: '📅',
  },
  {
    id: 'social',
    name: 'Social Page Ad',
    description: 'Sidebar placement on the Wine Social page — reaching engaged visitors browsing community content, wine conversations, and social posts.',
    placement: 'Wine Social page right sidebar',
    size: '300 × 250 px banner',
    monthlyPrice: 75,
    icon: '📱',
  },
];

const DURATIONS = [
  { months: 1, label: '1 Month', discount: 0 },
  { months: 3, label: '3 Months', discount: 0.10, badge: 'Save 10%' },
  { months: 12, label: '12 Months', discount: 0.30, badge: 'Save 30%' },
];

function calcPrice(monthlyPrice, months, discount) {
  const total = monthlyPrice * months * (1 - discount);
  return Math.round(total);
}

export default function AdvertisePage() {
  return (
    <>
      <Head>
        <title>Advertise on NYCWine.com — Reach NYC Wine Lovers</title>
        <meta
          name="description"
          content="List your wine bar, wine store, winery, or event for free — or purchase a featured placement or ad spot to reach thousands of NYC wine enthusiasts."
        />
      </Head>

      <Header />
      <QuickNav />

      <main className="adv-page">

        {/* Media Kit download bar */}
        <div className="adv-mediakit-bar">
          <span className="adv-mediakit-bar-text">
            <strong>NYCWine.com Media Kit 2026</strong>
            <span className="adv-mediakit-bar-sub"> — Audience overview, ad specs &amp; pricing</span>
          </span>
          <a href="/NYCWine-MediaKit-2026.pdf" download className="adv-mediakit-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Media Kit
          </a>
        </div>

        {/* Hero */}
        <div className="adv-hero">
          <div className="adv-hero-inner">
            <div className="adv-hero-eyebrow">Reach NYC Wine Enthusiasts</div>
            <h1 className="adv-hero-title">Advertise on NYCWine.com</h1>
            <p className="adv-hero-sub">
              NYCWine.com is the go-to destination for wine lovers across New York City.
              List your venue or event for free, or amplify your reach with a premium placement.
            </p>
            <div className="adv-hero-ctas">
              <Link href="/submit" className="adv-btn-primary">List for Free →</Link>
              <a href="#paid" className="adv-btn-secondary">See Ad Options ↓</a>
            </div>
          </div>
        </div>

        {/* ── Free Listings ───────────────────────────────────── */}
        <section className="adv-section adv-free-section">
          <div className="adv-section-inner">
            <div className="adv-section-label">No cost. No account required.</div>
            <h2 className="adv-section-title">Free Listings</h2>
            <p className="adv-section-desc">
              Submit your wine bar, wine store, winery, or upcoming event and we&apos;ll add
              it to the directory. Just provide your contact email — no account needed.
              Our AI reviews every submission for quality and accuracy before it goes live.
            </p>

            <div className="adv-free-cards">
              {[
                { icon: '🍷', label: 'Wine Bar', desc: 'Add your wine bar to our NYC directory — searchable by borough and neighborhood.' },
                { icon: '🛒', label: 'Wine Store', desc: 'List your wine shop in our Manhattan store directory with address, phone, and website.' },
                { icon: '🍇', label: 'Winery', desc: 'Get discovered by NYC wine lovers planning a day trip to Long Island or the Hamptons.' },
                { icon: '🎉', label: 'Wine Event', desc: 'Promote a tasting, dinner, class, or festival to thousands of active NYC wine enthusiasts.' },
              ].map((item) => (
                <div key={item.label} className="adv-free-card">
                  <div className="adv-free-card-icon">{item.icon}</div>
                  <div className="adv-free-card-label">{item.label}</div>
                  <div className="adv-free-card-desc">{item.desc}</div>
                </div>
              ))}
            </div>

            <div className="adv-free-cta-wrap">
              <Link href="/submit" className="adv-btn-primary adv-btn-large">
                Submit a Free Listing →
              </Link>
              <p className="adv-free-note">
                Submissions are reviewed by AI and typically go live within a few hours.
                You&apos;ll receive a confirmation at the email you provide.
              </p>
            </div>
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────── */}
        <section className="adv-steps-section">
          <div className="adv-section-inner">
            <h3 className="adv-steps-title">How Free Submissions Work</h3>
            <div className="adv-steps">
              {[
                { n: '1', title: 'Fill in the form', body: 'Enter your venue or event details and a contact email. No account, no password.' },
                { n: '2', title: 'AI reviews your submission', body: 'Our system checks your URLs, content accuracy, and appropriateness — usually in seconds.' },
                { n: '3', title: 'Goes live automatically', body: 'If everything looks good, your listing is added to the site. Uncertain submissions are flagged for human review.' },
                { n: '4', title: 'Confirmation sent', body: 'We email you when your listing is live, or if we have any questions.' },
              ].map((step) => (
                <div key={step.n} className="adv-step">
                  <div className="adv-step-num">{step.n}</div>
                  <div className="adv-step-body">
                    <div className="adv-step-title">{step.title}</div>
                    <div className="adv-step-text">{step.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Paid Ad Options ─────────────────────────────────── */}
        <section id="paid" className="adv-section adv-paid-section">
          <div className="adv-section-inner">
            <div className="adv-section-label">Premium Placements</div>
            <h2 className="adv-section-title">Advertising Options</h2>
            <p className="adv-section-desc">
              Stand out with a premium placement. All ads are reviewed before going live.
              Multi-month deals save you 10–30%. Select a start date that works for you —
              we&apos;ll only show available months.
            </p>

            <div className="adv-slots">
              {AD_SLOTS.map((slot) => (
                <div key={slot.id} className="adv-slot-card">
                  <div className="adv-slot-top">
                    <div className="adv-slot-icon">{slot.icon}</div>
                    <div className="adv-slot-info">
                      <div className="adv-slot-name">{slot.name}</div>
                      <div className="adv-slot-placement">{slot.placement}</div>
                      <div className="adv-slot-size">{slot.size}</div>
                    </div>
                  </div>
                  <p className="adv-slot-desc">{slot.description}</p>

                  <div className="adv-pricing-row">
                    {DURATIONS.map((dur) => {
                      const price = calcPrice(slot.monthlyPrice, dur.months, dur.discount);
                      const perMonth = Math.round(price / dur.months);
                      return (
                        <div key={dur.months} className="adv-price-tier">
                          {dur.badge && <div className="adv-price-badge">{dur.badge}</div>}
                          <div className="adv-price-label">{dur.label}</div>
                          <div className="adv-price-total">${price.toLocaleString()}</div>
                          {dur.months > 1 && (
                            <div className="adv-price-per">${perMonth}/mo</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Link
                    href={`/advertise-buy?slot=${slot.id}`}
                    className="adv-slot-cta"
                  >
                    Book This Placement →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ / fine print ────────────────────────────────── */}
        <section className="adv-faq-section">
          <div className="adv-section-inner adv-faq-inner">
            <h3 className="adv-faq-title">Frequently Asked Questions</h3>
            <div className="adv-faqs">
              {[
                {
                  q: 'How quickly will my free listing appear?',
                  a: 'Most free submissions are reviewed and posted automatically within a few hours. Submissions that need human review may take up to 24 hours.',
                },
                {
                  q: 'What payment methods are accepted for ads?',
                  a: 'We accept all major credit and debit cards through Stripe, our secure payment partner. You\'ll never need to create an account — just check out as a guest.',
                },
                {
                  q: 'Can I choose my ad start date?',
                  a: 'Yes. When you book, you\'ll see a calendar showing which months are already taken for that ad slot. You can pick any available future month.',
                },
                {
                  q: 'What creative assets do I need to provide?',
                  a: 'For banner ads, we need a JPG or PNG at the listed dimensions, your destination URL, and a contact email. For Featured listings, just your logo and a brief description.',
                },
                {
                  q: 'What are the content guidelines?',
                  a: 'All content must be wine-related and accurate. No misleading claims, no inappropriate material. Our AI review catches most issues automatically.',
                },
                {
                  q: 'Can I update my listing after it goes live?',
                  a: 'Yes — email sommelier@nycwine.com with your update request and the email you used when submitting.',
                },
              ].map((faq, i) => (
                <div key={i} className="adv-faq">
                  <div className="adv-faq-q">{faq.q}</div>
                  <div className="adv-faq-a">{faq.a}</div>
                </div>
              ))}
            </div>

            <div className="adv-contact-note">
              Questions? Email us at{' '}
              <a href="mailto:sommelier@nycwine.com">sommelier@nycwine.com</a>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
