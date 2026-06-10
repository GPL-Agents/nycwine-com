// pages/advertise-success.js
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Payment success page â€” reached after Stripe Checkout
// redirects the customer back here. Shows a clean confirmation
// and what to expect next.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import QuickNav from '../components/QuickNav';
import Footer from '../components/Footer';

export default function AdvertiseSuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;

  return (
    <>
      <Head>
        <title>Payment Confirmed &mdash; NYCWine.com</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Header />
      <QuickNav />

      <main className="sub-page">
        <div className="sub-success" style={{ marginTop: 80, marginBottom: 80 }}>
          <div className="sub-success-icon">âœ…</div>
          <h1 className="sub-success-title">Payment confirmed!</h1>
          <p style={{ fontSize: 16, marginBottom: 16, color: 'var(--muted)' }}>
            Your advertising placement has been booked.
          </p>

          <div style={{
            background: 'var(--surface)', border: '1.5px solid var(--pink)', borderRadius: 12,
            padding: '24px 28px', textAlign: 'left', maxWidth: 500, margin: '16px auto 24px'
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
              What happens next
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 2, fontSize: 14 }}>
              <li>A confirmation email will be sent to the address you provided</li>
              <li>Your ad will go live at the start of the month you selected</li>
              <li>We&apos;ll review your creative assets and reach out if anything needs adjusting</li>
              <li>Questions? Email <a href="mailto:sommelier@nycwine.com" style={{ color: 'var(--pink)' }}>sommelier@nycwine.com</a></li>
            </ul>
          </div>

          <p style={{ fontSize: 14, color: 'var(--muted)' }}>
            Your subscription renews automatically until cancelled.
            You can cancel anytime through Stripe.
          </p>

          <div className="sub-success-links" style={{ marginTop: 24 }}>
            <Link href="/" className="adv-btn-primary">Back to Home</Link>
            <Link href="/advertise" className="adv-btn-secondary">View Ad Options</Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
