// components/StoresSection.jsx
// ─────────────────────────────────────────────────────────────
// Homepage wine store section — search, browse by neighborhood,
// and see featured stores. 335 stores across Manhattan.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import MapLink from './MapLink';

// Neighborhoods for the quick-pick chips.
// These use partial matching so "Chelsea" matches "Chelsea" AND "Chelsea / Midtown South"
const FEATURED_HOODS = [
  'Upper West Side', 'Upper East Side', 'Midtown',
  'Chelsea', 'West Village', 'East Village',
  'SoHo', 'Lower East Side', 'Harlem',
  'Tribeca', 'Gramercy', 'Murray Hill',
  'Financial District', 'Washington Heights',
];

// Match a store's neighborhood against a short hood name
function matchesHood(storeHood, filterHood) {
  return storeHood.toLowerCase().includes(filterHood.toLowerCase());
}

export default function StoresSection() {
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedHood, setSelectedHood] = useState(null);

  useEffect(() => {
    fetch('/data/wine-stores.json')
      .then((res) => res.json())
      .then((data) => setStores(data))
      .catch(() => {});
  }, []);

  // Count stores per featured neighborhood (partial match)
  const hoodCounts = useMemo(() => {
    const counts = {};
    FEATURED_HOODS.forEach((hood) => {
      counts[hood] = stores.filter((s) => matchesHood(s.neighborhood, hood)).length;
    });
    return counts;
  }, [stores]);

  // Filter stores — always alphabetical
  const filtered = useMemo(() => {
    let result = stores;
    if (selectedHood) {
      result = result.filter((s) => matchesHood(s.neighborhood, selectedHood));
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
    return result.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [stores, selectedHood, search]);

  // Show featured stores — prioritise entries with real logos, then fill with website-only
  const featuredStores = useMemo(() => {
    const withLogo = stores.filter((s) => s.featured && s.logo && s.website);
    const withSite = stores.filter((s) => s.website && !(s.featured && s.logo));
    return [...withLogo, ...withSite.sort((a, b) => a.name.localeCompare(b.name))].slice(0, 6);
  }, [stores]);

  const isSearching = search.trim() || selectedHood;
  const displayStores = isSearching ? filtered.slice(0, 8) : featuredStores;

  return (
    <section className="stores-section" id="sec-stores">

      {/* Header */}
      <div className="section-header stores-header">
        <div className="section-header-title">
          <img src="/images/icons/icon-wine-store.png" className="ribbon-icon" alt="" aria-hidden="true" />
          Wine Stores
        </div>
        <a href="/stores" className="see-all-link">
          View all {stores.length} wine stores &rarr;
        </a>
      </div>

      {/* Search + neighborhoods */}
      <div className="store-finder">
        <div className="store-finder-inner">
          <input
            type="search"
            placeholder="Search by name, address, or neighborhood…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedHood(null); }}
            className="store-search"
          />
        </div>

        {/* Neighborhood chips */}
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

      {/* Store cards */}
      <div className="store-cards-section">
        {!isSearching && (
          <div className="store-cards-label">Featured Stores</div>
        )}
        {isSearching && filtered.length === 0 && (
          <div className="store-preview-empty">
            No stores match your search. <a href="/stores">Browse all {stores.length} stores →</a>
          </div>
        )}
        <div className="store-cards-grid">
          {displayStores.map((store) => (
            <div key={store.id} className="store-card">
              <div className="store-card-icon" style={{ background: store.logo ? '#fff' : store.iconBg }}>
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt={store.name}
                    className="store-card-logo-img"
                    onError={(e) => { e.target.style.display='none'; e.target.parentNode.innerHTML = store.icon || '🍷'; }}
                  />
                ) : (
                  store.icon
                )}
              </div>
              <div className="store-card-info">
                <div className="store-card-name">{store.name}</div>
                <div className="store-card-addr">
                  {store.address}
                  <MapLink name={store.name} address={store.address} />
                </div>
                <div className="store-card-hood">{store.neighborhood}</div>
                {store.phone && (
                  <a href={`tel:${store.phone}`} className="store-card-phone">{store.phone}</a>
                )}
              </div>
              {store.website && (
                <a
                  href={store.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="store-card-link"
                >
                  Visit →
                </a>
              )}
            </div>
          ))}
        </div>
        {isSearching && filtered.length > 8 && (
          <a href="/stores" className="store-see-all">
            View all {filtered.length} results →
          </a>
        )}
        {!isSearching && (
          <a href="/stores" className="store-see-all">
            Browse all {stores.length} wine stores →
          </a>
        )}
      </div>

    </section>
  );
}
