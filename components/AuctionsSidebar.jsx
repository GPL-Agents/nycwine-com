// components/AuctionsSidebar.jsx
// ─────────────────────────────────────────────────────────────
// Compact sidebar widget showing upcoming wine auctions
// from Acker Wines. Loads from /data/auctions-cache.json
// (updated by scripts/auction-fetch.js via GitHub Actions).
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';

export default function AuctionsSidebar() {
  const [auctions, setAuctions] = useState([]);
  const [source, setSource] = useState(null);

  useEffect(() => {
    fetch('/data/auctions-cache.json')
      .then((res) => res.json())
      .then((data) => {
        if (data.auctions) setAuctions(data.auctions);
        if (data.source) setSource({ name: data.source, url: data.sourceUrl });
      })
      .catch(() => {});
  }, []);

  if (auctions.length === 0) return null;

  return (
    <div className="auctions-sidebar">
      {/* Header: title left, Acker logo right */}
      <div className="auctions-sidebar-header">
        <div className="auctions-sidebar-title">Wine Auctions</div>
        <a
          href="https://www.ackerwines.com/wine-auctions/"
          target="_blank"
          rel="noopener noreferrer"
          className="auctions-header-logo"
        >
          <img
            src="https://www.ackerwines.com/wp-content/uploads/2019/04/acker-logo-black-1.svg"
            alt="Acker Wines"
            className="auctions-source-logo"
          />
        </a>
      </div>

      <div className="auctions-list">
        {auctions.map((a, i) => (
          <a
            key={i}
            className="auction-item"
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="auction-item-inner">
              <div className="auction-text">
            <div className="auction-status-row">
              {a.status === 'live' && <span className="auction-badge live">Live</span>}
              {a.status === 'open' && <span className="auction-badge open">Open</span>}
              {a.status === 'upcoming' && <span className="auction-badge upcoming">Upcoming</span>}
              <span className="auction-type">{a.type === 'web' ? 'Online' : a.location}</span>
            </div>
            <div className="auction-name">{a.title}</div>
            <div className="auction-dates">{a.dates}</div>
              </div>
              {a.image && (
                <div
                  className="auction-thumb"
                  style={{ backgroundImage: `url(${a.image})` }}
                />
              )}
            </div>
          </a>
        ))}
      </div>

      {/* "via Acker Wines →" attribution link */}
      {source && (
        <a
          className="auctions-source"
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          via {source.name} &rarr;
        </a>
      )}

    </div>
  );
}
