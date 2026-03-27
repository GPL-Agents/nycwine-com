// components/FeaturedVenues.jsx
// ─────────────────────────────────────────────────────────────
// Featured wine stores and bars with real logos.
// Pulls entries marked featured:true from both JSON files.
// Shown on homepage between NewsSection and StoresSection.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';

export default function FeaturedVenues() {
  const [venues, setVenues] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch('/data/wine-stores.json').then((r) => r.json()).catch(() => []),
      fetch('/data/wine-bars.json').then((r) => r.json()).catch(() => []),
    ]).then(([stores, bars]) => {
      const featuredStores = stores
        .filter((s) => s.featured && s.logo && s.website)
        .map((s) => ({ ...s, type: 'Wine Store' }));
      const featuredBars = bars
        .filter((b) => b.featured && b.logo && b.website)
        .map((b) => ({ ...b, type: 'Wine Bar' }));
      // Interleave bars and stores for visual variety, cap at 8
      const merged = [];
      const maxLen = Math.max(featuredStores.length, featuredBars.length);
      for (let i = 0; i < maxLen && merged.length < 8; i++) {
        if (featuredStores[i]) merged.push(featuredStores[i]);
        if (featuredBars[i] && merged.length < 8) merged.push(featuredBars[i]);
      }
      setVenues(merged);
    });
  }, []);

  if (venues.length === 0) return null;

  return (
    <section className="featured-venues-section" id="sec-featured">

      <div className="section-header featured-venues-header">
        <div className="section-header-title">Featured Wine Destinations</div>
        <div className="featured-venues-subtitle">
          Top stores &amp; bars — click to visit their sites
        </div>
      </div>

      <div className="featured-venues-grid">
        {venues.map((venue) => (
          <a
            key={`${venue.type}-${venue.id}`}
            href={venue.website}
            target="_blank"
            rel="noopener noreferrer"
            className="featured-venue-card"
          >
            <div className="featured-venue-logo-wrap">
              <img
                src={venue.logo}
                alt={`${venue.name} logo`}
                className="featured-venue-logo"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
              {/* Fallback if logo fails to load */}
              <div className="featured-venue-logo-fallback" style={{ display: 'none' }}>
                🍷
              </div>
            </div>
            <div className="featured-venue-info">
              <div className="featured-venue-name">{venue.name}</div>
              <div className="featured-venue-hood">
                {venue.neighborhood || venue.borough || ''}
              </div>
              <span className="featured-venue-badge" data-type={venue.type}>
                {venue.type}
              </span>
            </div>
          </a>
        ))}
      </div>

    </section>
  );
}
