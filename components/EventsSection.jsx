// components/EventsSection.jsx
// ─────────────────────────────────────────────────────────────
// LIVE upcoming wine events — fetches from /api/events.
//
// Sources: NYC Open Data (free) + Eventbrite (when API key set).
// Falls back to loading/error states gracefully.
//
// Filter pills filter the live data by tag.
// Cards scroll horizontally; list rows show additional events.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import AuctionsSidebar from './AuctionsSidebar';

// TODO: Uncomment MultiplexAd once Google AdSense is approved
// function MultiplexAd() {
//   const adRef = useRef(null);
//   const pushed = useRef(false);
//
//   useEffect(() => {
//     if (!pushed.current && adRef.current && typeof window !== 'undefined') {
//       try {
//         (window.adsbygoogle = window.adsbygoogle || []).push({});
//         pushed.current = true;
//       } catch (e) {
//         console.warn('AdSense push error:', e);
//       }
//     }
//   }, []);
//
//   return (
//     <div className="event-multiplex-ad">
//       <ins
//         className="adsbygoogle"
//         style={{ display: 'block' }}
//         data-ad-format="autorelaxed"
//         data-ad-client="ca-pub-6782277104310503"
//         data-ad-slot="1265745785"
//         ref={adRef}
//       />
//     </div>
//   );
// }

const FILTERS = ['All', 'Tasting', 'Class', 'Dinner', 'Event', 'Festival'];

export default function EventsSection() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/events')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setEvents(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  // Filter events by tag
  const filtered =
    activeFilter === 'All'
      ? events
      : events.filter((ev) => ev.tag === activeFilter);

  // Split into cards (first 5) and list (rest)
  const cardEvents = filtered.slice(0, 10);
  const listEvents = filtered.slice(10, 20);

  return (
    <section className="events-section" id="sec-events">

      {/* Header bar */}
      <div className="section-header events-header">
        <div className="section-header-title">Upcoming Events</div>
        <a href="/events" className="see-all-link">View All →</a>
      </div>

      {/* Filter pills */}
      <div className="event-filters">
        {FILTERS.map(f => (
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

      {/* Horizontal card scroll */}
      <div className="event-cards-scroll">
        {loading && (
          <div className="event-card">
            <div className="event-card-header c1">
              <div className="event-date-big">…</div>
              <div className="event-month">Loading events</div>
            </div>
            <div className="event-card-body">
              <div className="event-card-name">Searching for wine events near NYC…</div>
            </div>
          </div>
        )}
        {error && (
          <div className="event-card">
            <div className="event-card-header c1">
              <div className="event-date-big">!</div>
              <div className="event-month">Oops</div>
            </div>
            <div className="event-card-body">
              <div className="event-card-name">Unable to load events right now. Try again later.</div>
            </div>
          </div>
        )}
        {!loading && !error && cardEvents.length === 0 && (
          <div className="event-card">
            <div className="event-card-header c2">
              <div className="event-date-big">&mdash;</div>
              <div className="event-month">No matches</div>
            </div>
            <div className="event-card-body">
              <div className="event-card-name">
                {activeFilter === 'All'
                  ? 'No upcoming wine events found right now. Check back soon!'
                  : `No "${activeFilter}" events right now. Try "All" to see everything.`}
              </div>
            </div>
          </div>
        )}
        {cardEvents.map((ev) => (
          <a
            key={ev.id}
            className="event-card"
            href={ev.url || '#'}
            target={ev.url ? '_blank' : undefined}
            rel={ev.url ? 'noopener noreferrer' : undefined}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            {ev.image ? (
              <div className="event-card-header" style={{ backgroundImage: `url(${ev.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="event-date-overlay">
                  <div className="event-date-big">{ev.day}</div>
                  <div className="event-month">{ev.month}</div>
                </div>
              </div>
            ) : (
              <div className={`event-card-header ${ev.color}`}>
                <div className="event-date-big">{ev.day}</div>
                <div className="event-month">{ev.month}</div>
              </div>
            )}
            <div className="event-card-body">
              <div className="event-card-name">{ev.title}</div>
              <div className="event-card-venue">{ev.venue}</div>
              {ev.dateDisplay && <div className="event-card-date">{ev.dateDisplay}</div>}
              <span className="event-card-tag" data-tag={ev.tag}>{ev.tag}</span>
              {ev.price && <span className="event-card-price">{ev.price}</span>}
            </div>
          </a>
        ))}
      </div>

      {/* List view + multiplex ad — side by side on desktop */}
      {listEvents.length > 0 && (
        <div className="event-list-row">
          <div className="event-list">
            <div className="event-list-title">More coming up</div>
            {listEvents.map((ev) => (
                <a
                  key={ev.id}
                  className="event-row"
                  href={ev.url || '#'}
                  target={ev.url ? '_blank' : undefined}
                  rel={ev.url ? 'noopener noreferrer' : undefined}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="event-row-date">
                    <div className="event-row-day">{ev.day}</div>
                    <div className="event-row-dow">{ev.month}</div>
                  </div>
                  <div className="event-row-info">
                    <div className="event-row-name">{ev.title}</div>
                    <div className="event-row-venue">{ev.venue}</div>
                    {ev.dateDisplay && <div className="event-row-venue">{ev.dateDisplay}</div>}
                  </div>
                  <div className="event-row-arrow">&rsaquo;</div>
                </a>
            ))}
          </div>
          <div className="event-sidebar">
            <AuctionsSidebar />
            {/* Acker Wines ad below auctions */}
            <a
              href="https://www.ackerwines.com"
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-ad-link acker-ad-block"
            >
              <img
                src="/images/ackerwinesad.png"
                alt="Acker Wines — NYC's Oldest Wine Shop"
                className="sidebar-ad-img"
              />
              <div className="sidebar-ad-address">
                160 W 72nd St · Between Amsterdam &amp; Columbus Ave<br />
                New York, NY 10023
              </div>
            </a>
          </div>
        </div>
      )}

    </section>
  );
}
