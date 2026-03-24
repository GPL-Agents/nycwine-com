// components/StoresSection.jsx
// ─────────────────────────────────────────────────────────────
// LIVE NYC Wine Store directory — 335 Manhattan stores loaded
// from /data/wine-stores.json (converted from CSV).
//
// Features:
//   - Neighborhood filter dropdown (25+ neighborhoods)
//   - Search by store name
//   - Paginated list (show 10 at a time, "Show more" button)
//   - Links to store websites where available
//
// To update store data: edit data/wine-stores.json or re-run
// the CSV-to-JSON conversion script.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';

export default function StoresSection() {
  const [stores, setStores] = useState([]);
  const [neighborhood, setNeighborhood] = useState('All');
  const [search, setSearch] = useState('');
  const [showCount, setShowCount] = useState(10);

  // Load store data
  useEffect(() => {
    fetch('/data/wine-stores.json')
      .then((res) => res.json())
      .then((data) => setStores(data))
      .catch(() => {});
  }, []);

  // Get unique neighborhoods, sorted
  const neighborhoods = useMemo(() => {
    const hoods = [...new Set(stores.map((s) => s.neighborhood))].filter(Boolean).sort();
    return ['All', ...hoods];
  }, [stores]);

  // Filter stores
  const filtered = useMemo(() => {
    let result = stores;
    if (neighborhood !== 'All') {
      result = result.filter((s) => s.neighborhood === neighborhood);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.neighborhood.toLowerCase().includes(q)
      );
    }
    return result;
  }, [stores, neighborhood, search]);

  const visible = filtered.slice(0, showCount);
  const hasMore = filtered.length > showCount;

  return (
    <section className="stores-section" id="sec-stores">

      {/* Header */}
      <div className="section-header stores-header">
        <div className="section-header-title">🍷 NYC Wine Stores</div>
        <span className="see-all-link">{filtered.length} stores</span>
      </div>

      {/* Search + filter row */}
      <div className="store-controls">
        <input
          type="search"
          placeholder="Search stores…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowCount(10); }}
          className="store-search"
        />
        <select
          value={neighborhood}
          onChange={(e) => { setNeighborhood(e.target.value); setShowCount(10); }}
          className="store-filter-select"
        >
          {neighborhoods.map((h) => (
            <option key={h} value={h}>{h === 'All' ? 'All Neighborhoods' : h}</option>
          ))}
        </select>
      </div>

      {/* Store rows */}
      <div className="store-list">
        {visible.map((store) => (
          <div key={store.id} className="store-row">
            <div className="store-icon" style={{ background: store.iconBg }}>
              {store.icon}
            </div>
            <div className="store-info">
              <div className="store-name">{store.name}</div>
              <div className="store-address">
                {store.address} · {store.neighborhood}
              </div>
              {store.phone && (
                <div className="store-phone">
                  <a href={`tel:${store.phone}`} style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 12 }}>
                    {store.phone}
                  </a>
                </div>
              )}
              {store.badge && (
                <div className={`store-tag ${store.badgeType}`}>{store.badge}</div>
              )}
            </div>
            {store.url ? (
              <a
                href={store.url}
                target="_blank"
                rel="noopener noreferrer"
                className="store-visit-btn"
              >
                Visit →
              </a>
            ) : store.phone ? (
              <a
                href={`tel:${store.phone}`}
                className="store-visit-btn"
              >
                Call →
              </a>
            ) : null}
          </div>
        ))}

        {visible.length === 0 && (
          <div className="store-row" style={{ justifyContent: 'center', padding: 20 }}>
            <div className="store-info" style={{ textAlign: 'center' }}>
              <div className="store-name">No stores found</div>
              <div className="store-address">Try a different search or neighborhood</div>
            </div>
          </div>
        )}

        {hasMore && (
          <button
            className="store-see-all"
            onClick={() => setShowCount((c) => c + 10)}
            style={{ cursor: 'pointer', border: 'none', background: 'none', width: '100%' }}
          >
            Show more ({filtered.length - showCount} remaining) →
          </button>
        )}
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
