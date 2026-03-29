// components/WineriesSection.jsx
// ─────────────────────────────────────────────────────────────
// Homepage wineries section — search, filter by region,
// and see featured wineries within driving distance of NYC.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import MapLink from './MapLink';

const REGIONS = ['Hamptons', 'North Fork', 'Long Island (North Shore)', 'Long Island (South Shore)'];

export default function WineriesSection() {
  const [wineries, setWineries] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(null);

  useEffect(() => {
    fetch('/data/wineries.json')
      .then((res) => res.json())
      .then((data) => setWineries(data))
      .catch(() => {});
  }, []);

  const regionCounts = useMemo(() => {
    const counts = {};
    REGIONS.forEach((r) => {
      counts[r] = wineries.filter((w) => w.region === r).length;
    });
    return counts;
  }, [wineries]);

  const filtered = useMemo(() => {
    let result = wineries;
    if (selectedRegion) result = result.filter((w) => w.region === selectedRegion);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (w) => w.name.toLowerCase().includes(q) || w.address.toLowerCase().includes(q) || w.region.toLowerCase().includes(q)
      );
    }
    return result.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [wineries, selectedRegion, search]);

  const featuredWineries = useMemo(() => {
    return wineries.filter((w) => w.featured).slice(0, 6);
  }, [wineries]);

  const isSearching = search.trim() || selectedRegion;
  const displayWineries = isSearching ? filtered.slice(0, 9) : featuredWineries;

  return (
    <section className="wineries-section" id="sec-wineries">

      {/* Header — black ribbon */}
      <div className="section-header wineries-header">
        <div className="section-header-title">
          <img src="/images/icons/icon-winery.png" className="ribbon-icon" alt="" aria-hidden="true" />
          Wineries
        </div>
        <a href="/wineries" className="see-all-link">
          View all {wineries.length} wineries &rarr;
        </a>
      </div>

      {/* Search + region chips */}
      <div className="bar-finder">
        <div className="bar-finder-inner">
          <input
            type="search"
            placeholder="Search by name, region, or address…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedRegion(null); }}
            className="bar-search"
          />
        </div>
        <div className="borough-grid">
          {REGIONS.map((region) => (
            <button
              key={region}
              className={`borough-chip${selectedRegion === region ? ' active' : ''}`}
              onClick={() => {
                setSelectedRegion(selectedRegion === region ? null : region);
                setSearch('');
              }}
            >
              <span className="borough-name">{region}</span>
              <span className="borough-count">{regionCounts[region] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Winery cards */}
      <div className="bar-cards-section">
        {!isSearching && (
          <div className="bar-cards-label">Featured Wineries</div>
        )}
        {isSearching && filtered.length === 0 && (
          <div className="bar-preview-empty">
            No wineries match your search. <a href="/wineries">Browse all {wineries.length} wineries →</a>
          </div>
        )}
        <div className="bar-cards-grid">
          {displayWineries.map((winery) => (
            <div key={winery.id} className="bar-card">
              {/* Left column: logo + Visit link */}
              <div className="bar-card-left">
                <div className="bar-card-icon" style={{ background: winery.logo ? '#fff' : undefined }}>
                  {winery.logo ? (
                    <img
                      src={winery.logo}
                      alt={winery.name}
                      className="store-card-logo-img"
                      onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '🍇'; }}
                    />
                  ) : '🍇'}
                </div>
                {winery.website && (
                  <a href={winery.website} target="_blank" rel="noopener noreferrer" title="Visit Website" className="bar-card-link">
                    <span className="visit-default">Visit →</span>
                    <span className="visit-hover">Visit Website →</span>
                  </a>
                )}
              </div>
              {/* Right column: name, address+pin, region, phone */}
              <div className="bar-card-info">
                <div className="bar-card-name">{winery.name}</div>
                <div className="bar-card-addr-row">
                  <MapLink name={winery.name} address={winery.address} />
                  <span className="bar-card-addr">{winery.address}</span>
                </div>
                <div className="bar-card-neighborhood">{winery.region}</div>
                {winery.phone && (
                  <a href={`tel:${winery.phone}`} className="bar-card-phone">{winery.phone}</a>
                )}
              </div>
            </div>
          ))}
        </div>
        {isSearching && filtered.length > 9 && (
          <a href="/wineries" className="bar-see-all">
            View all {filtered.length} results →
          </a>
        )}
        {!isSearching && (
          <a href="/wineries" className="bar-see-all">
            Browse all {wineries.length} wineries →
          </a>
        )}
      </div>

    </section>
  );
}
