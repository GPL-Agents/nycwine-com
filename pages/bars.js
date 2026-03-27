// pages/bars.js
// ─────────────────────────────────────────────────────────────
// Full wine bar directory page — all 110 NYC wine bars.
// Search + borough filter + paginated list.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function BarsPage() {
  const [bars, setBars] = useState([]);
  const [borough, setBorough] = useState('All');
  const [search, setSearch] = useState('');
  const [showCount, setShowCount] = useState(20);

  useEffect(() => {
    fetch('/data/wine-bars.json')
      .then((res) => res.json())
      .then((data) => setBars(data.filter((b) => !(b.notes || '').includes('[CLOSED]'))))
      .catch(() => {});
  }, []);

  const boroughs = useMemo(() => {
    const bs = [...new Set(bars.map((b) => b.borough))].filter(Boolean).sort();
    return ['All', ...bs];
  }, [bars]);

  const filtered = useMemo(() => {
    let result = bars;
    if (borough !== 'All') {
      result = result.filter((b) => b.borough === borough);
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
  }, [bars, borough, search]);

  const visible = filtered.slice(0, showCount);
  const hasMore = filtered.length > showCount;

  return (
    <>
      <Head>
        <title>NYC Wine Bars — NYCWine.com</title>
        <meta name="description" content="Complete directory of wine bars in New York City. Search by name, address, or borough." />
      </Head>

      <Header />

      <main className="bars-page">
        <div className="bars-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="bars-page-title">NYC Wine Bars</h1>
            <p className="bars-page-subtitle">{bars.length} wine bars across New York City</p>
          </div>
          <Link href="/map">
            <img
              src="/images/maps3button.png"
              alt="Maps & Directions"
              style={{ height: '240px', width: 'auto', cursor: 'pointer', borderRadius: '8px' }}
            />
          </Link>
        </div>

        <div className="bars-page-controls">
          <input
            type="search"
            placeholder="Search by name, address, or borough…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowCount(20); }}
            className="bar-search"
          />
          <select
            value={borough}
            onChange={(e) => { setBorough(e.target.value); setShowCount(20); }}
            className="bars-page-select"
          >
            {boroughs.map((b) => (
              <option key={b} value={b}>{b === 'All' ? 'All Boroughs' : b}</option>
            ))}
          </select>
        </div>

        <div className="bars-page-count">
          Showing {Math.min(showCount, filtered.length)} of {filtered.length} wine bars
          {borough !== 'All' && ` in ${borough}`}
        </div>

        <div className="bars-page-list">
          {visible.map((bar) => (
            <div key={bar.id} className="bar-row">
              <div className="bar-info">
                <div className="bar-name">{bar.name}</div>
                <div className="bar-address">
                  {bar.address} &middot; {bar.borough}
                </div>
                {bar.phone && (
                  <div className="bar-phone">
                    <a href={`tel:${bar.phone}`}>{bar.phone}</a>
                  </div>
                )}
              </div>
              {bar.website && (
                <a
                  href={bar.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bar-visit-btn"
                >
                  Visit
                </a>
              )}
            </div>
          ))}

          {visible.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              No wine bars found. Try a different search or borough.
            </div>
          )}

          {hasMore && (
            <button
              className="bar-see-all"
              onClick={() => setShowCount((c) => c + 20)}
              style={{ cursor: 'pointer', width: '100%', border: '1px solid var(--rose-muted)', borderRadius: 10, marginTop: 16 }}
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
