// components/StoresSection.jsx 
// ─────────────────────────────────────────────────────────────
// NYC Wine Store directory — borough filter + store rows.
//
// DATA: Currently uses a short curated list of placeholder stores.
// V1 upgrade: pull from Supabase using the wine-stores-manhattan.csv
// data loaded into the database.
//
// Status tags: 'online' | 'delivery' | 'free-delivery' | null
// To deactivate a store: set its status to 'inactive' in the DB
// (never delete — see store-data/wine-stores-manhattan.xlsx)
//
// To add a store to this preview list: add an object to PREVIEW_STORES.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';

// ── Preview store data (top 5 for homepage) ───────────────────
const PREVIEW_STORES = [
  {
    id: 1,
    name: 'Chambers Street Wines',
    address: '160 Chambers St',
    neighborhood: 'Tribeca',
    borough: 'Manhattan',
    badge: '🌿 Natural Wine Specialist',
    badgeType: 'delivery',
    icon: '🍷',
    iconBg: 'linear-gradient(135deg, #e8f4fd, #aed6f1)',
    url: 'https://www.chambersstwines.com',
  },
  {
    id: 2,
    name: 'Astor Wines & Spirits',
    address: '399 Lafayette St',
    neighborhood: 'NoHo',
    borough: 'Manhattan',
    badge: '🛒 Online Ordering',
    badgeType: 'online',
    icon: '🥂',
    iconBg: 'linear-gradient(135deg, #fef5e7, #f9ca8a)',
    url: 'https://www.astorwines.com',
  },
  {
    id: 3,
    name: '67 Wine & Spirits',
    address: '179 Columbus Ave',
    neighborhood: 'UWS',
    borough: 'Manhattan',
    badge: '🛒 Online Ordering',
    badgeType: 'online',
    icon: '🍇',
    iconBg: 'linear-gradient(135deg, #f5f0fb, #d7bfeb)',
    url: 'https://www.67wine.com',
  },
  {
    id: 4,
    name: 'Garnet Wines & Liquors',
    address: '929 Lexington Ave',
    neighborhood: 'UES',
    borough: 'Manhattan',
    badge: '🚚 Delivers',
    badgeType: 'delivery',
    icon: '🍾',
    iconBg: 'linear-gradient(135deg, #e8f8f5, #a8e6cf)',
    url: 'https://www.garnetwine.com',
  },
  {
    id: 5,
    name: 'Sherry-Lehmann',
    address: '505 Park Ave',
    neighborhood: 'UES',
    borough: 'Manhattan',
    badge: '🛒 Online Ordering',
    badgeType: 'online',
    icon: '🍷',
    iconBg: 'linear-gradient(135deg, #fff0f8, #f4a0cc)',
    url: 'https://www.sherry-lehmann.com',
  },
];

const BOROUGHS = ['All NYC', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx'];
// ──────────────────────────────────────────────────────────────

export default function StoresSection() {
  const [activeBorough, setActiveBorough] = useState('All NYC');

  const filtered = activeBorough === 'All NYC'
    ? PREVIEW_STORES
    : PREVIEW_STORES.filter(s => s.borough === activeBorough);

  return (
    <section className="stores-section" id="sec-stores">

      {/* Header */}
      <div className="section-header stores-header">
        <div className="section-header-title">🍷 NYC Wine Stores</div>
        <a href="/stores" className="see-all-link">See all 200+ →</a>
      </div>

      {/* Borough filter pills */}
      <div className="borough-filters">
        {BOROUGHS.map(b => (
          <button
            key={b}
            className={`bpill${activeBorough === b ? ' active' : ''}`}
            onClick={() => setActiveBorough(b)}
          >
            {b}
          </button>
        ))}
      </div>

      {/* Store rows */}
      <div className="store-list">
        {filtered.map(store => (
          <div key={store.id} className="store-row">
            <div className="store-icon" style={{ background: store.iconBg }}>
              {store.icon}
            </div>
            <div className="store-info">
              <div className="store-name">{store.name}</div>
              <div className="store-address">{store.address} · {store.neighborhood}</div>
              <div className={`store-tag ${store.badgeType}`}>{store.badge}</div>
            </div>
            <a
              href={store.url}
              target="_blank"
              rel="noopener noreferrer"
              className="store-visit-btn"
            >
              Visit →
            </a>
          </div>
        ))}

        <a href="/stores" className="store-see-all">
          View all 200+ NYC Wine Stores →
        </a>
      </div>

      {/* Explore more: Wine Bars + Wineries */}
      <div className="explore-section" id="sec-bars">
        <div className="explore-title">More to explore</div>
        <div className="explore-grid">
          <a href="/bars" className="explore-card bars">
            <span className="explore-icon">🥂</span>
            <div className="explore-name">Wine Bars</div>
            <div className="explore-sub">NYC&apos;s best</div>
          </a>
          <a href="#" className="explore-card wineries" id="sec-wineries">
            <span className="explore-icon">🍇</span>
            <div className="explore-name" style={{ color: '#888' }}>Wineries</div>
            <div className="explore-sub">Coming in V1</div>
          </a>
        </div>
      </div>

    </section>
  );
}
