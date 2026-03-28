// pages/stores.js
// ─────────────────────────────────────────────────────────────
// Full wine store directory page — all 335 Manhattan stores.
// Search + neighborhood filter + paginated list.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MapLink from '../components/MapLink';

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [neighborhood, setNeighborhood] = useState('All');
  const [search, setSearch] = useState('');
  const [showCount, setShowCount] = useState(20);

  useEffect(() => {
    fetch('/data/wine-stores.json')
      .then((res) => res.json())
      .then((data) => setStores(data))
      .catch(() => {});
  }, []);

  const neighborhoods = useMemo(() => {
    const hoods = [...new Set(stores.map((s) => s.neighborhood))].filter(Boolean).sort();
    return ['All', ...hoods];
  }, [stores]);

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
    return result.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [stores, neighborhood, search]);

  const visible = filtered.slice(0, showCount);
  const hasMore = filtered.length > showCount;

  return (
    <>
      <Head>
        <title>NYC Wine Stores — NYCWine.com</title>
        <meta name="description" content="Complete directory of wine stores in Manhattan. Search by name, address, or neighborhood." />
      </Head>

      <Header />

      <main className="stores-page">
        <div className="stores-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="stores-page-title">NYC Wine Stores</h1>
            <p className="stores-page-subtitle">{stores.length} wine stores across Manhattan</p>
          </div>
          <Link href="/map">
            <img
              src="/images/maps3button.png"
              alt="Maps & Directions"
              style={{ height: '150px', width: 'auto', cursor: 'pointer', borderRadius: '8px' }}
            />
          </Link>
        </div>

        <div className="stores-page-controls">
          <input
            type="search"
            placeholder="Search by name, address, or neighborhood…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowCount(20); }}
            className="store-search"
          />
          <select
            value={neighborhood}
            onChange={(e) => { setNeighborhood(e.target.value); setShowCount(20); }}
            className="stores-page-select"
          >
            {neighborhoods.map((h) => (
              <option key={h} value={h}>{h === 'All' ? 'All Neighborhoods' : h}</option>
            ))}
          </select>
        </div>

        <div className="stores-page-count">
          Showing {Math.min(showCount, filtered.length)} of {filtered.length} stores
          {neighborhood !== 'All' && ` in ${neighborhood}`}
        </div>

        <div className="stores-page-list">
          {visible.map((store) => (
            <div key={store.id} className="store-row">
              <div className="store-info">
                <div className="store-name">{store.name}</div>
                <div className="store-address">
                  {store.address} &middot; {store.neighborhood}
                  <MapLink name={store.name} address={store.address} />
                </div>
                {store.phone && (
                  <div className="store-phone">
                    <a href={`tel:${store.phone}`}>{store.phone}</a>
                  </div>
                )}
              </div>
              {store.website && (
                <a
                  href={store.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="store-visit-btn"
                >
                  Visit
                </a>
              )}
            </div>
          ))}

          {visible.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              No stores found. Try a different search or neighborhood.
            </div>
          )}

          {hasMore && (
            <button
              className="store-see-all"
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
