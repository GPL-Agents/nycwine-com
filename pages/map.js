// pages/map.js
// ─────────────────────────────────────────────────────────────
// Interactive Map & Directions — placeholder page.
// V1: neighborhood browse map with pins for wine bars,
//     wine stores, and events. Click any pin to open that
//     listing with a "Navigate Here" (walking/driving) button.
// ─────────────────────────────────────────────────────────────

import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function MapPage() {
  return (
    <>
      <Head>
        <title>Interactive Map & Directions — NYCWine.com</title>
        <meta name="description" content="Browse wine bars, wine stores, and events near you on an interactive NYC map. Get walking or driving directions to any listing." />
      </Head>

      <Header />

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <img
          src="/images/mapbutton.png"
          alt="Interactive Map & Directions"
          style={{ width: '260px', borderRadius: '12px', marginBottom: '32px' }}
        />

        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '16px', color: 'var(--ink, #1a1a1a)' }}>
          Interactive Map & Directions
        </h1>

        <p style={{ fontSize: '1.1rem', color: 'var(--muted, #666)', maxWidth: 520, margin: '0 auto 32px' }}>
          Coming soon — an interactive map of NYC showing all wine bars, wine stores, and upcoming events.
          Click any pin to get walking or driving directions straight to the door.
        </p>

        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '48px',
        }}>
          <a href="/bars" style={pillStyle('#E8007D')}>🍷 Wine Bars</a>
          <a href="/stores" style={pillStyle('#2c2c2c')}>🛒 Wine Stores</a>
          <a href="/events" style={pillStyle('#7b4ea0')}>📅 Events</a>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--muted, #999)' }}>
          In the meantime, visit any wine bar or store listing to find the address and contact details.
        </p>
      </main>

      <Footer />
    </>
  );
}

function pillStyle(bg) {
  return {
    display: 'inline-block',
    padding: '10px 24px',
    borderRadius: '999px',
    background: bg,
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.95rem',
    textDecoration: 'none',
  };
}
