// pages/wineries.js
// ─────────────────────────────────────────────────────────────
// Full winery directory page — wineries within driving distance
// of NYC. Search + region filter + paginated list.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

const REGIONS = ['Hamptons', 'North Fork', 'Long Island (North Shore)', 'Long Island (South Shore)'];

export default function WineriesPage() {
  const [wineries, setWineries] = useState([]);
  const [region, setRegion] = useState('All');
  const [search, setSearch] = useState('');
  const [showCount, setShowCount] = useState(20);

  useEffect(() => {
    fetch('/data/wineries.json')
      .then((res) => res.json())
      .then((data) => setWineries(data))
      .catch(() => {});
  }, []);

  const regions = useMemo(() => {
    return ['All', ...REGIONS];
  }, []);

  const filtered = useMemo(() => {
    let result = wineries;
    if (region !== 'All') {
      result = result.filter((w) => w.region === region);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.address.toLowerCase().includes(q) ||
          w.region.toLowerCase().includes(q)
      );
    }
    return result.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [wineries, region, search]);

  const visible = filtered.slice(0, showCount);
  const hasMore = filtered.length > showCount;

  return (
    <>
      <Head>
        <title>Wineries Near NYC — NYCWine.com</title>
        <meta name="description" content="Directory of wineries within driving distance of New York City — Long Island, the Hamptons, North Fork, and beyond." />
      </Head>

      <Header />

      <main className="bars-page">
        <div className="bars-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="bars-page-title" style={{ color: '#2d5016' }}>Wineries Near NYC</h1>
            <p className="bars-page-subtitle">{wineries.length} wineries within driving distance</p>
          </div>
          <Link href="/">
            <span style={{
              display: 'inline-block',
              padding: '10px 20px',
              background: '#2d5016',
              color: 'white',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
            }}>
              ← Back to Home
            </span>
          </Link>
        </div>

        <div className="bars-page-controls">
          <input
            type="search"
            placeholder="Search by name, region, or address…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowCount(20); }}
            className="bar-search"
          />
          <select
            value={region}
            onChange={(e) => { setRegion(e.target.value); setShowCount(20); }}
            className="bars-page-select"
            style={{ accentColor: '#2d5016' }}
          >
            {regions.map((r) => (
              <option key={r} value={r}>{r === 'All' ? 'All Regions' : r}</option>
            ))}
          </select>
        </div>

        <div className="bars-page-count">
          Showing {Math.min(showCount, filtered.length)} of {filtered.length} wineries
          {region !== 'All' && ` in ${region}`}
        </div>

        <div className="bars-page-list">
          {visible.map((winery) => (
            <div key={winery.id} className="bar-row">
              <div className="bar-info">
                <div className="bar-name">{winery.name}</div>
                <div className="bar-address">
                  {winery.address} &middot; {winery.region}
                </div>
                {winery.phone && (
                  <div className="bar-phone">
                    <a href={`tel:${winery.phone}`}>{winery.phone}</a>
                  </div>
                )}
              </div>
              {winery.website && (
                <a
                  href={winery.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bar-visit-btn"
                  style={{ background: '#2d5016' }}
                >
                  Visit
                </a>
              )}
            </div>
          ))}

          {visible.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              No wineries found. Try a different search or region.
            </div>
          )}

          {hasMore && (
            <button
              className="bar-see-all"
              onClick={() => setShowCount((c) => c + 20)}
              style={{ cursor: 'pointer', width: '100%', border: '1px solid #2d5016', borderRadius: 10, marginTop: 16, color: '#2d5016' }}
            >
              Show more ({filtered.length - showCount} remaining)
            </button>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
