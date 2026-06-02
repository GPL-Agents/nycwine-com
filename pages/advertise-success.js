// pages/advertise-success.js
// Order received confirmation with Venmo payment instructions.

import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import QuickNav from '../components/QuickNav';
import Footer from '../components/Footer';

const VENMO_HANDLE = 'nycwinereport';

export default function AdvertiseSuccessPage() {
  const router = useRouter();
  const { orderId, total, slot, start } = router.query;

  const startLabel = start
    ? new Date(start + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    : null;

  const totalFormatted = total
    ? parseFloat(total).toLocaleString('en-US', { minimumFractionDigits: 2 })
    : null;

  const venmoNote = orderId ? `NYC Wine Ad ${orderId}` : 'NYC Wine Ad';
  const venmoUrl = `https://account.venmo.com/pay?recipients=${VENMO_HANDLE}&amount=${total || ''}&note=${encodeURIComponent(venmoNote)}`;

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
              {startLabel && <span>{slot ? ' · ' : ''}Starts: <strong>{startLabel}</strong></span>}
              {totalFormatted && <span> · Total: <strong>${totalFormatted}</strong></span>}
            </p>
          )}

          <div style={{
            background: 'var(--surface)', border: '1.5px solid var(--pink)', borderRadius: 12,
            padding: '24px 28px', textAlign: 'left', maxWidth: 500, margin: '16px auto 24px'
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: 'var(--pink)' }}>
              💸 Complete your payment on Venmo
            </div>

            <p style={{ margin: '0 0 6px', fontSize: 15 }}>
              Pay <strong>@{VENMO_HANDLE}</strong> on Venmo{totalFormatted ? ` &mdash; $${totalFormatted}` : ''}.
            </p>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--muted)' }}>
              Use the button below or search <strong>@{VENMO_HANDLE}</strong> in the Venmo app.
              Include your order ID in the note.
            </p>

            <a
              href={venmoUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-block', background: '#008CFF', color: '#fff',
                fontWeight: 700, fontSize: 15, padding: '12px 24px', borderRadius: 8,
                textDecoration: 'none', marginBottom: 16
              }}
            >
              Pay on Venmo →
            </a>

            {orderId && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                Note pre-filled: <em>{venmoNote}</em>
              </p>
            )}
          </div>

          <p style={{ fontSize: 14, color: 'var(--muted)' }}>
            Your placement goes live by your selected start month once payment is confirmed.
            Questions? Email{' '}
            <a href="mailto:sommelier@nycwine.com" style={{ color: 'var(--pink)' }}>
              sommelier@nycwine.com
            </a>
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
