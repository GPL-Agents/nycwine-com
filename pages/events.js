// pages/events.js
// ─────────────────────────────────────────────────────────────
// Full events page — all upcoming wine events + auctions sidebar.
// Fetches from /api/events and /data/auctions-cache.json.
// ─────────────────────────────────────────────────────────────

import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuctionsSidebar from '../components/AuctionsSidebar';
import { useState, useEffect } from 'react';

const FILTERS = ['All', 'Tasting', 'Class', 'Dinner', 'Event', 'Festival'];

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
          <div className="section-header-title">Wine Events</div>
        </div>

        {/* Filter pills */}
        <div className="event-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`epill${activeFilter === f ? ' active' : ''}`}
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
                      <div className="events-page-card-venue">{ev.venue}</div>
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
            <AuctionsSidebar />
            {/* Borghese winery ad below auctions */}
            <a
              href="https://www.opentable.com/r/the-halyard-restaurant-at-the-sound-view-greenport"
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-ad-link"
            >
              <img
                src="/Wineryad.png"
                alt="Borghese Vineyard — Discover the Best of Long Island Wine Country"
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
