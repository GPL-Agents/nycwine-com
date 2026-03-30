// pages/advertise-success.js
// ─────────────────────────────────────────────────────────────
// Stripe Checkout success landing page.
// The user lands here after completing payment. We show a
// confirmation message and next steps.
// ─────────────────────────────────────────────────────────────

import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import QuickNav from '../components/QuickNav';
import Footer from '../components/Footer';

export default function AdvertiseSuccessPage() {
  return (
    <>
      <Head>
        <title>Booking Confirmed — NYCWine.com</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Header />
      <QuickNav />

      <main className="sub-page">
        <div className="sub-success" style={{ marginTop: 80, marginBottom: 80 }}>
          <div className="sub-success-icon">✓</div>
          <h1 className="sub-success-title">You&apos;re booked!</h1>
          <p>
            Your payment was received and your ad placement is confirmed.
            You&apos;ll receive a confirmation at the email you provided —
            typically within a few minutes.
          </p>
          <p style={{ marginTop: 0 }}>
            Our team will review your creative and have your ad live by your selected start month.
            Questions? Email{' '}
            <a href="mailto:sommelier@nycwine.com" style={{ color: 'var(--pink)' }}>
              sommelier@nycwine.com
            </a>
            .
          </p>
          <p style={{ marginTop: 0, fontSize: 14, color: 'var(--muted)' }}>
            Need to update your payment method, view invoices, or cancel?{' '}
            <a
              href="https://billing.stripe.com/p/login/eVq8wJ8Rq0g52Ec4eg5AQ00"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--pink)' }}
            >
              Manage your subscription →
            </a>
          </p>
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
