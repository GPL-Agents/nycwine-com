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

import { useState, useEffect } from 'react';

const FILTERS = ['All', 'Tasting', 'Class', 'Dinner', 'Free', 'Festival'];

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
  const listEvents = filtered.slice(10, 30);

  return (
    <section className="events-section" id="sec-events">

      {/* Header bar */}
      <div className="section-header events-header">
        <div className="section-header-title">Upcoming Events</div>
        <a href="/events" className="see-all-link">See all →</a>
      </div>

      {/* Filter pills */}
      <div className="event-filters">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`epill${activeFilter === f ? ' active' : ''}`}
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
              <span className="event-card-tag">{ev.tag}</span>
              {ev.price && <span className="event-card-price">{ev.price}</span>}
            </div>
          </a>
        ))}
      </div>

      {/* List view — additional events */}
      {listEvents.length > 0 && (
        <div className="event-list">
          <div className="event-list-title">More coming up</div>
          {listEvents.map((ev) => {
            const d = new Date(ev.date);
            const dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return (
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
                  <div className="event-row-dow">{dows[d.getDay()]}</div>
                </div>
                <div className="event-row-info">
                  <div className="event-row-name">{ev.title}</div>
                  <div className="event-row-venue">{ev.venue}</div>
                </div>
                <div className="event-row-arrow">›</div>
              </a>
            );
          })}
        </div>
      )}

    </section>
  );
}
