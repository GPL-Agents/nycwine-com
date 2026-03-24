// components/StoresSection.jsx
// ─────────────────────────────────────────────────────────────
// Homepage wine store discovery widget.
//
// Shows a compact search + neighborhood filter with a preview
// of results (3 stores max). Links to a full /stores page for
// the complete 335-store directory.
//
// Data loaded from /data/wine-stores.json.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';

// Curated neighborhoods for the quick-pick grid
const FEATURED_HOODS = [
  'Upper West Side', 'Upper East Side', 'Midtown',
  'Chelsea', 'West Village', 'East Village',
  'SoHo', 'Lower East Side', 'Harlem',
];

export default function StoresSection() {
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedHood, setSelectedHood] = useState(null);

  // Load store data
  useEffect(() => {
    fetch('/data/wine-stores.json')
      .then((res) => res.json())
      .then((data) => setStores(data))
      .catch(() => {});
  }, []);

  // Count stores per neighborhood
  const hoodCounts = useMemo(() => {
    const counts = {};
    stores.forEach((s) => {
      if (s.neighborhood) {
        counts[s.neighborhood] = (counts[s.neighborhood] || 0) + 1;
      }
    });
    return counts;
  }, [stores]);

  // Filter stores based on search or selected neighborhood
  const filtered = useMemo(() => {
    let result = stores;
    if (selectedHood) {
      result = result.filter((s) => s.neighborhood === selectedHood);
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
  }, [stores, selectedHood, search]);

  const preview = filtered.slice(0, 3);
  const isSearching = search.trim() || selectedHood;

  return (
    <section className="stores-section" id="sec-stores">

      {/* Header */}
      <div className="section-header stores-header">
        <div className="section-header-title">Wine Stores</div>
        <a href="/stores" className="see-all-link">
          {stores.length} stores &rarr;
        </a>
      </div>

      {/* Search bar */}
      <div className="store-finder">
        <div className="store-finder-inner">
          <div className="store-finder-label">Find a wine store near you</div>
          <input
            type="search"
            placeholder="Search by name, address, or neighborhood…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedHood(null); }}
            className="store-search"
          />
        </div>

        {/* Neighborhood quick picks */}
        <div className="hood-grid">
          {FEATURED_HOODS.map((hood) => (
            <button
              key={hood}
              className={`hood-chip${selectedHood === hood ? ' active' : ''}`}
              onClick={() => {
                setSelectedHood(selectedHood === hood ? null : hood);
                setSearch('');
              }}
            >
              <span className="hood-name">{hood}</span>
              <span className="hood-count">{hoodCounts[hood] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview results (only when searching/filtering) */}
      {isSearching && (
        <div className="store-preview">
          {preview.length === 0 ? (
            <div className="store-preview-empty">
              No stores match your search. <a href="/stores">Browse all stores</a>
            </div>
          ) : (
            <>
              {preview.map((store) => (
                <div key={store.id} className="store-row">
                  <div className="store-info">
                    <div className="store-name">{store.name}</div>
                    <div className="store-address">
                      {store.address} &middot; {store.neighborhood}
                    </div>
                    {store.phone && (
                      <div className="store-phone">
                        <a href={`tel:${store.phone}`}>{store.phone}</a>
                      </div>
                    )}
                  </div>
                  {store.url ? (
                    <a
                      href={store.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="store-visit-btn"
                    >
                      Visit
                    </a>
                  ) : store.phone ? (
                    <a href={`tel:${store.phone}`} className="store-visit-btn">
                      Call
                    </a>
                  ) : null}
                </div>
              ))}
              {filtered.length > 3 && (
                <a href="/stores" className="store-see-all">
                  View all {filtered.length} results &rarr;
                </a>
              )}
            </>
          )}
        </div>
      )}

      {/* Explore more: Wine Bars + Wineries */}
      <div className="explore-section" id="sec-bars">
        <div className="explore-title">More to explore</div>
        <div className="explore-grid">
          <a href="/bars" className="explore-card bars">
            <div className="explore-name">Wine Bars</div>
            <div className="explore-sub">NYC&apos;s best wine bars</div>
          </a>
          <a href="#" className="explore-card wineries" id="sec-wineries">
            <div className="explore-name" style={{ color: 'var(--muted)' }}>Wineries</div>
            <div className="explore-sub">Coming soon</div>
          </a>
        </div>
      </div>

    </section>
  );
}
