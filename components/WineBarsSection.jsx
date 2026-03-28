// components/WineBarsSection.jsx
// ─────────────────────────────────────────────────────────────
// Homepage wine bars section — search, browse by borough,
// and see featured bars. 110 bars across NYC.
// Pink header ribbon to alternate with black store header.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import MapLink from './MapLink';

const BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens'];

export default function WineBarsSection() {
  const [bars, setBars] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedBorough, setSelectedBorough] = useState(null);

  useEffect(() => {
    fetch('/data/wine-bars.json')
      .then((res) => res.json())
      .then((data) => setBars(data.filter((b) => !(b.notes || '').includes('[CLOSED]'))))
      .catch(() => {});
  }, []);

  // Count bars per borough
  const boroughCounts = useMemo(() => {
    const counts = {};
    BOROUGHS.forEach((b) => {
      counts[b] = bars.filter((bar) => bar.borough === b).length;
    });
    return counts;
  }, [bars]);

  // Filter bars — always alphabetical
  const filtered = useMemo(() => {
    let result = bars;
    if (selectedBorough) {
      result = result.filter((b) => b.borough === selectedBorough);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.address.toLowerCase().includes(q) ||
          b.borough.toLowerCase().includes(q)
      );
    }
    return result.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [bars, selectedBorough, search]);

  // Show featured bars — prioritise entries with real logos, then fill with website-only
  const featuredBars = useMemo(() => {
    const withLogo = bars.filter((b) => b.featured && b.logo && b.website);
    const withSite = bars.filter((b) => b.website && !(b.featured && b.logo));
    return [...withLogo, ...withSite.sort((a, b) => a.name.localeCompare(b.name))].slice(0, 9);
  }, [bars]);

  const isSearching = search.trim() || selectedBorough;
  const displayBars = isSearching ? filtered.slice(0, 8) : featuredBars;

  return (
    <section className="bars-section" id="sec-bars">

      {/* Header — black ribbon */}
      <div className="section-header bars-header">
        <div className="section-header-title">
          <img src="/images/icons/icon-wine-bar.png" className="ribbon-icon" alt="" aria-hidden="true" />
          Wine Bars
        </div>
        <a href="/bars" className="see-all-link">
          View all {bars.length} wine bars &rarr;
        </a>
      </div>

      {/* Search + borough chips */}
      <div className="bar-finder">
        <div className="bar-finder-inner">
          <input
            type="search"
            placeholder="Search by name, address, or borough…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedBorough(null); }}
            className="bar-search"
          />
        </div>

        {/* Borough chips */}
        <div className="borough-grid">
          {BOROUGHS.map((borough) => (
            <button
              key={borough}
              className={`borough-chip${selectedBorough === borough ? ' active' : ''}`}
              onClick={() => {
                setSelectedBorough(selectedBorough === borough ? null : borough);
                setSearch('');
              }}
            >
              <span className="borough-name">{borough}</span>
              <span className="borough-count">{boroughCounts[borough] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bar cards */}
      <div className="bar-cards-section">
        {!isSearching && (
          <div className="bar-cards-label">Featured Wine Bars</div>
        )}
        {isSearching && filtered.length === 0 && (
          <div className="bar-preview-empty">
            No wine bars match your search. <a href="/bars">Browse all {bars.length} wine bars →</a>
          </div>
        )}
        <div className="bar-cards-grid">
          {displayBars.map((bar) => (
            <div key={bar.id} className="bar-card">
              <div className="bar-card-icon" style={{ background: bar.logo ? '#fff' : undefined }}>
                {bar.logo ? (
                  <img
                    src={bar.logo}
                    alt={bar.name}
                    className="store-card-logo-img"
                    onError={(e) => { e.target.style.display='none'; e.target.parentNode.innerHTML='🍷'; }}
                  />
                ) : '🍷'}
              </div>
              <div className="bar-card-info">
                <div className="bar-card-name">{bar.name}</div>
                <div className="bar-card-addr">
                  {bar.address}
                  <MapLink name={bar.name} address={bar.address} />
                </div>
                <div className="bar-card-borough">{bar.borough}</div>
                {bar.phone && (
                  <a href={`tel:${bar.phone}`} className="bar-card-phone">{bar.phone}</a>
                )}
              </div>
              {bar.website && (
                <a
                  href={bar.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bar-card-link"
                >
                  Visit →
                </a>
              )}
            </div>
          ))}
        </div>
        {isSearching && filtered.length > 8 && (
          <a href="/bars" className="bar-see-all">
            View all {filtered.length} results →
          </a>
        )}
        {!isSearching && (
          <a href="/bars" className="bar-see-all">
            Browse all {bars.length} wine bars →
          </a>
        )}
      </div>

    </section>
  );
}
