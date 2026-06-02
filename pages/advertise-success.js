// pages/advertise-success.js
// Order received confirmation with Venmo payment instructions.

import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import QuickNav from '../components/QuickNav';
import Footer from '../components/Footer';

export default function AdvertiseSuccessPage() {
  const router = useRouter();
  const { orderId, total, slot, start } = router.query;

  const startLabel = start
    ? new Date(start + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    : null;

  const totalFormatted = total
    ? parseFloat(total).toLocaleString('en-US', { minimumFractionDigits: 2 })
    : null;

  return (
    <>
      <Head>
        <title>Order Received &mdash; NYCWine.com</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Header />
      <QuickNav />

      <main className="sub-page">
        <div className="sub-success" style={{ marginTop: 80, marginBottom: 80 }}>
          <div className="sub-success-icon">🎉</div>
          <h1 className="sub-success-title">Order received!</h1>

          {orderId && (
            <p style={{ fontFamily: 'monospace', background: 'var(--surface)', padding: '6px 14px',
                        borderRadius: 6, display: 'inline-block', margin: '0 0 20px', fontSize: 14 }}>
              Order ID: <strong>{orderId}</strong>
            </p>
          )}

          {(slot || startLabel || totalFormatted) && (
            <p style={{ marginBottom: 8 }}>
              {slot && <span>Placement: <strong>{slot}</strong></span>}
              {startLabel && <span>{slot ? ' &bull; ' : ''}Starts: <strong>{startLabel}</strong></span>}
              {totalFormatted && <span> &bull; Total: <strong>${totalFormatted}</strong></span>}
            </p>
          )}

          <div style={{
            background: 'var(--surface)', border: '1.5px solid var(--pink)', borderRadius: 12,
            padding: '24px 28px', textAlign: 'left', maxWidth: 480, margin: '16px auto 24px'
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: 'var(--pink)' }}>
              💸 How to complete payment
            </div>
            <p style={{ margin: '0 0 12px' }}>
              We&apos;ll send you a <strong>Venmo payment request</strong> to the email address you
              provided within a few hours.
            </p>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text)' }}>
              Please accept the request to confirm your booking. Your ad goes live by your selected
              start month once payment clears.
            </p>
            {orderId && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                Reference your order ID <strong>{orderId}</strong> if you need to reach us.
              </p>
            )}
          </div>

          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>
            Questions? Email{' '}
            <a href="mailto:sommelier@nycwine.com" style={{ color: 'var(--pink)' }}>
              sommelier@nycwine.com
            </a>
          </p>

          <div className="sub-success-links" style={{ marginTop: 28 }}>
            <Link href="/" className="adv-btn-primary">Back to Home</Link>
            <Link href="/advertise" className="adv-btn-secondary">View Ad Options</Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
