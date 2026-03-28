// pages/events.js
// ─────────────────────────────────────────────────────────────
// Full events page — all upcoming wine events + auctions sidebar.
// Fetches from /api/events and /data/auctions-cache.json.
// ─────────────────────────────────────────────────────────────

import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuctionsSidebar from '../components/AuctionsSidebar';
import { useState, useEffect } from 'react';

// Inline map opener for use inside <a> cards (avoids nested <a> tags)
function EventMapBtn({ venue, address }) {
  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const query = encodeURIComponent(`${venue} ${address}`);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const url = isIOS
      ? `https://maps.apple.com/?q=${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return (
    <span
      className="event-map-btn"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick(e)}
      title="Get directions"
      aria-label={`Get directions to ${venue}`}
    >
      <svg width="10" height="13" viewBox="0 0 11 14" fill="currentColor" aria-hidden="true">
        <path d="M5.5 0C2.46 0 0 2.46 0 5.5 0 9.35 5.5 14 5.5 14S11 9.35 11 5.5C11 2.46 8.54 0 5.5 0zm0 7.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
      </svg>
    </span>
  );
}

const FILTERS = ['All', 'Tasting', 'Class', 'Dinner', 'Event', 'Festival', 'Auctions'];

function fixImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('https://')) return url;
  if (url.includes('_next/image') && url.includes('url=')) {
    try {
      const match = url.match(/url=([^&]+)/);
      if (match) {
        const decoded = decodeURIComponent(match[1]);
        if (decoded.startsWith('http')) return decoded;
      }
    } catch { /* fall through */ }
  }
  if (url.startsWith('/')) return `https://www.eventbrite.com${url}`;
  return url;
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered =
    activeFilter === 'All'
      ? events
      : events.filter((ev) => ev.tag === activeFilter);

  return (
    <>
      <Head>
        <title>Wine Events in NYC — Tastings, Classes & Dinners | NYCWine.com</title>
        <meta name="description" content="Find upcoming wine events in New York City — tastings, classes, dinners, festivals, and auctions." />
      </Head>

      <Header />

      <main className="events-page">
        {/* Page header */}
        <div className="section-header events-header">
          <div className="section-header-title">
            <img src="/images/icons/icon-wine-events.png" className="ribbon-icon" alt="" aria-hidden="true" />
            Wine Events
          </div>
        </div>

        {/* Filter pills */}
        <div className="event-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`epill${activeFilter === f ? ' active' : ''}`}
              data-filter={f}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Content: events list + auctions sidebar */}
        <div className="events-page-layout">
          <div className="events-page-list">
            {loading && (
              <div className="events-page-msg">Loading events…</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="events-page-msg">
                {activeFilter === 'All'
                  ? 'No upcoming wine events found right now. Check back soon!'
                  : `No "${activeFilter}" events right now. Try "All" to see everything.`}
              </div>
            )}
            {filtered.map((ev) => {
              const img = fixImageUrl(ev.image);
              return (
                <a
                  key={ev.id}
                  className="events-page-card"
                  href={ev.url || '#'}
                  target={ev.url ? '_blank' : undefined}
                  rel={ev.url ? 'noopener noreferrer' : undefined}
                >
                  {img && (
                    <div
                      className="events-page-card-img"
                      style={{ backgroundImage: `url(${img})` }}
                    />
                  )}
                  <div className="events-page-card-info">
                    <div className="events-page-card-date">
                      <span className="events-page-day">{ev.day}</span>
                      <span className="events-page-month">{ev.month}</span>
                    </div>
                    <div className="events-page-card-details">
                      <div className="events-page-card-title">{ev.title}</div>
                      {ev.venue && ev.venue !== 'NYC' && (
                        <div className="events-page-card-venue">
                          {ev.venue}
                          {ev.venueAddress && (
                            <span className="event-card-venue-addr"> · {ev.venueAddress.split(',')[0]}</span>
                          )}
                          {ev.venueAddress && (
                            <EventMapBtn venue={ev.venue} address={ev.venueAddress} />
                          )}
                        </div>
                      )}
                      {ev.dateDisplay && (
                        <div className="events-page-card-time">{ev.dateDisplay}</div>
                      )}
                      <span className="event-card-tag" data-tag={ev.tag}>{ev.tag}</span>
                      {ev.price && <span className="events-page-card-price">{ev.price}</span>}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Auctions sidebar */}
          <div className="events-page-sidebar">
            {/* Map button — above auctions */}
            <Link href="/map">
              <div style={{ position: 'relative', display: 'block', marginBottom: '16px' }} className="map-btn-wrap">
                <img
                  src="/images/maps2.button.png"
                  alt="Maps & Directions"
                  style={{ display: 'block', width: '100%', cursor: 'pointer', borderRadius: '8px' }}
                />
                <div className="map-btn-overlay">Maps &amp; Directions</div>
              </div>
            </Link>
            <AuctionsSidebar />
            {/* Acker Wines ad below auctions */}
            <a
              href="https://www.ackerwines.com"
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-ad-link"
            >
              <img
                src="/images/acker.ad.events.png"
                alt="Acker Wines — Top 10 World's Most Iconic Wine Shops — 160 W 72nd St, NYC"
                className="sidebar-ad-img"
              />
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
