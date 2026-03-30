// pages/stores.js
// ─────────────────────────────────────────────────────────────
// Full wine store directory page — all Manhattan stores.
// Two-column layout: search + list (left) + featured sidebar (right).
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MapLink from '../components/MapLink';
import QuickNav from '../components/QuickNav';

// ── Featured Wine Stores ──────────────────────────────────────
// Sourced from the wine-stores.json data (featured: true entries).
const FEATURED_STORES = [
  {
    name: 'Tribeca Wine Merchants',
    neighborhood: 'Tribeca',
    address: '40 Hudson Street',
    logo: 'https://tribeca-21644.kxcdn.com/wp-content/uploads/2025/02/TribecaLogoRedWhiteFill-e1738663042108.png',
    website: 'https://tribecawine.com/',
  },
  {
    name: "Le Du's Wines",
    neighborhood: 'West Village',
    address: '600 Washington Street',
    logo: 'https://sante.nyc3.digitaloceanspaces.com/ecom-stores/Le%20D%C3%BBFavicon/m7d3m7d351i7-Le%20Du%20Wines%20Logo.png',
    website: 'https://www.leduwines.com/',
  },
  {
    name: 'Sherry-Lehmann Wine & Spirits',
    neighborhood: 'Upper East Side',
    address: '505 Park Avenue',
    logo: 'https://www.sherry-lehmann.com/assets/images/logo-sherry-lehmann-nyc.jpg',
    website: 'https://www.sherry-lehmann.com/',
  },
  {
    name: '67 Wine & Spirits',
    neighborhood: 'Upper West Side',
    address: '179 Columbus Avenue',
    logo: 'https://67wine.com/cdn/shop/files/67wine_logo_2x_2e3358e8-3db0-45a7-be51-4cbc76c44116.png?v=1689901950',
    website: 'https://67wine.com/',
  },
  {
    name: 'Acker Merrall & Condit',
    neighborhood: 'Upper West Side',
    address: '160 West 72nd Street',
    logo: 'https://www.ackerwines.com/wp-content/uploads/2019/04/acker-logo-black-1.svg',
    website: 'https://www.ackerwines.com/',
  },
  {
    name: "McCabe's Wine & Spirits",
    neighborhood: 'Upper East Side',
    address: '1347 3rd Avenue',
    logo: 'https://cityhive-production-cdn.cityhive.net/web_assets/6899f9abb6bada5aa5c55416.png?1754921387',
    website: 'https://mccabeswine.com/',
  },
];

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState([]);
  const [neighborhood, setNeighborhood] = useState('All');
  const [search, setSearch] = useState('');
  const [showCount, setShowCount] = useState(25);

  // Pre-fill search from concierge navigation (?q=term)
  useEffect(() => {
    if (router.isReady && router.query.q) {
      setSearch(decodeURIComponent(router.query.q));
    }
  }, [router.isReady, router.query.q]);

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
      <QuickNav />

      <main className="stores-page">

        {/* Pink ribbon header */}
        <div className="section-header dir-page-header">
          <div className="section-header-title">
            <img src="/images/icons/icon-wine-store.png" className="ribbon-icon" alt="" aria-hidden="true" />
            NYC Wine Stores
          </div>
          <Link href="/map">
            <img
              src="/images/maps3button.png"
              alt="Maps & Directions"
              style={{ height: '48px', width: 'auto', cursor: 'pointer', borderRadius: '6px', display: 'block' }}
            />
          </Link>
        </div>

        {/* Search & filter controls */}
        <div className="dir-page-controls">
          <input
            type="search"
            placeholder="Search by name, address, or neighborhood…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowCount(20); }}
          />
          <select
            value={neighborhood}
            onChange={(e) => { setNeighborhood(e.target.value); setShowCount(20); }}
          >
            {neighborhoods.map((h) => (
              <option key={h} value={h}>{h === 'All' ? 'All Neighborhoods' : h}</option>
            ))}
          </select>
        </div>

        <div className="dir-page-count">
          Showing {Math.min(showCount, filtered.length)} of {filtered.length} stores
          {neighborhood !== 'All' && ` in ${neighborhood}`}
        </div>

        {/* Two-column layout */}
        <div className="dir-page-layout">

          {/* Main list */}
          <div className="dir-page-main">
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
                      Visit Website
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
                  onClick={() => setShowCount((c) => c + 25)}
                  style={{ cursor: 'pointer', width: '100%', border: '1px solid var(--rose-muted)', borderRadius: 10, marginTop: 16 }}
                >
                  Show more ({filtered.length - showCount} remaining)
                </button>
              )}
            </div>
          </div>

          {/* Featured sidebar */}
          <div className="dir-page-sidebar">
            <div className="dir-featured-sidebar">
              <div className="dir-featured-heading">Featured Wine Stores</div>
              {FEATURED_STORES.map((store, i) => (
                <a
                  key={i}
                  className="dir-featured-card"
                  href={store.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="dir-featured-logo-wrap">
                    <img
                      src={store.logo}
                      alt={store.name}
                      loading="lazy"
                      onError={(e) => { e.target.closest('.dir-featured-logo-wrap').style.display = 'none'; }}
                    />
                  </div>
                  <div className="dir-featured-body">
                    <div className="dir-featured-meta">{store.neighborhood}</div>
                    <div className="dir-featured-name">{store.name}</div>
                    <div className="dir-featured-address">{store.address}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}
