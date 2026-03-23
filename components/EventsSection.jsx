// components/EventsSection.jsx 
// ─────────────────────────────────────────────────────────────
// Upcoming wine events — cards + list rows.
//
// DATA: Currently uses placeholder data defined in this file.
// V1 upgrade path: replace PLACEHOLDER_EVENTS with a fetch()
// call to the Eventbrite API (see integrations-config.js).
//
// To add/change events: edit the PLACEHOLDER_EVENTS array below.
// Each event needs: id, day, month, name, venue, tag, price (opt), color
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';

// ── Placeholder data (replace with API call in V1) ─────────────
const PLACEHOLDER_EVENTS = [
  { id: 1, day: '27', month: 'Mar · Tomorrow',  name: 'Spring Rosé Tasting',        venue: '67 Wine, UWS',           tag: 'Tasting',      price: '$45',  color: 'c1' },
  { id: 2, day: '28', month: 'Mar · Saturday',  name: 'Natural Wine Night',          venue: 'Chambers St Wines',      tag: 'Free · RSVP',  price: null,   color: 'c2' },
  { id: 3, day: '29', month: 'Mar · Sunday',    name: 'Champagne Brunch Class',      venue: 'Corkbuzz, Chelsea',      tag: 'Class',        price: '$75',  color: 'c3' },
  { id: 4, day: '2',  month: 'Apr · Thursday',  name: 'Burgundy & Beyond Dinner',   venue: 'Tribeca Wine Merch.',    tag: 'Dinner',       price: '$120', color: 'c4' },
  { id: 5, day: '5',  month: 'Apr · Saturday',  name: 'WSET Level 1 Wine',          venue: 'NYC Wine School',        tag: 'Course',       price: '$195', color: 'c5' },
];

const PLACEHOLDER_LIST = [
  { day: '28', dow: 'Sat', name: 'Italian Varietals Evening',    venue: 'Garnet Wines, UES' },
  { day: '30', dow: 'Mon', name: 'Biodynamic Wine Talk · Free',  venue: 'Union Sq Wines' },
  { day: '1',  dow: 'Wed', name: 'Finger Lakes Wine Tasting',    venue: 'Astor Wines, NoHo' },
];

const FILTERS = ['This Week', 'This Weekend', 'Tastings', 'Classes', 'Dinners', 'Free'];
// ──────────────────────────────────────────────────────────────

export default function EventsSection() {
  const [activeFilter, setActiveFilter] = useState('This Week');

  return (
    <section className="events-section" id="sec-events">

      {/* Header bar */}
      <div className="section-header events-header">
        <div className="section-header-title"><span style={{ marginRight: 6 }}>📅</span>Upcoming Events</div>
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
        {PLACEHOLDER_EVENTS.map(ev => (
          <div key={ev.id} className="event-card">
            <div className={`event-card-header ${ev.color}`}>
              <div className="event-date-big">{ev.day}</div>
              <div className="event-month">{ev.month}</div>
            </div>
            <div className="event-card-body">
              <div className="event-card-name">{ev.name}</div>
              <div className="event-card-venue">{ev.venue}</div>
              <span className="event-card-tag">{ev.tag}</span>
              {ev.price && <span className="event-card-price">{ev.price}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* List view */}
      <div className="event-list">
        <div className="event-list-title">More this week</div>
        {PLACEHOLDER_LIST.map((ev, i) => (
          <div key={i} className="event-row">
            <div className="event-row-date">
              <div className="event-row-day">{ev.day}</div>
              <div className="event-row-dow">{ev.dow}</div>
            </div>
            <div className="event-row-info">
              <div className="event-row-name">{ev.name}</div>
              <div className="event-row-venue">{ev.venue}</div>
            </div>
            <div className="event-row-arrow">›</div>
          </div>
        ))}
      </div>

    </section>
  );
}
