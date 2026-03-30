// pages/wineries.js
// ─────────────────────────────────────────────────────────────
// Full winery directory page — wineries within driving distance
// of NYC. Two-column layout: search + list (left) + featured (right).
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MapLink from '../components/MapLink';
import QuickNav from '../components/QuickNav';

const REGIONS = ['Hamptons', 'North Fork', 'Long Island (North Shore)', 'Long Island (South Shore)'];

// ── Featured Wineries ─────────────────────────────────────────
// Sourced from the wineries.json data (featured: true entries).
const FEATURED_WINERIES = [
  {
    name: 'Wölffer Estate Vineyard',
    region: 'Hamptons',
    address: '139 Sagg Rd, Sagaponack, NY',
    logo: '/images/wineries/wolffer.svg',
    website: 'https://wolffer.com',
  },
  {
    name: 'Duck Walk Vineyards',
    region: 'Hamptons',
    address: '231 Montauk Hwy, Water Mill, NY',
    logo: '/images/wineries/duckwalk.png',
    website: 'https://www.duckwalk.com',
  },
  {
    name: 'Channing Daughters Winery',
    region: 'Hamptons',
    address: '1927 Scuttle Hole Rd, Bridgehampton, NY',
    logo: '/images/wineries/channing.webp',
    website: 'https://channingdaughters.com',
  },
  {
    name: 'Macari Vineyards',
    region: 'North Fork',
    address: '150 Bergen Ave, Mattituck, NY',
    logo: '/images/wineries/macari.jpg',
    website: 'https://macariwines.com',
  },
  {
    name: 'Bedell Cellars',
    region: 'North Fork',
    address: '36225 Main Rd, Cutchogue, NY',
    logo: '/images/wineries/bedell.png',
    website: 'https://www.bedellcellars.com',
  },
  {
    name: 'Sparkling Pointe Vineyards & Winery',
    region: 'North Fork',
    address: '39750 County Rd 48, Southold, NY',
    logo: '/images/wineries/sparkling-pointe.png',
    website: 'https://sparklingpointe.com',
  },
];

export default function WineriesPage() {
  const [wineries, setWineries] = useState([]);
  const [region, setRegion] = useState('All');
  const [search, setSearch] = useState('');
  const [showCount, setShowCount] = useState(25);

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
      <QuickNav />

      <main className="bars-page">

        {/* Pink ribbon header */}
        <div className="section-header dir-page-header">
          <div className="section-header-title">
            <img src="/images/icons/icon-winery.png" className="ribbon-icon" alt="" aria-hidden="true" />
            Wineries Near NYC
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
            placeholder="Search by name, region, or address…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowCount(20); }}
          />
          <select
            value={region}
            onChange={(e) => { setRegion(e.target.value); setShowCount(20); }}
          >
            {regions.map((r) => (
              <option key={r} value={r}>{r === 'All' ? 'All Regions' : r}</option>
            ))}
          </select>
        </div>

        <div className="dir-page-count">
          Showing {Math.min(showCount, filtered.length)} of {filtered.length} wineries
          {region !== 'All' && ` in ${region}`}
        </div>

        {/* Two-column layout */}
        <div className="dir-page-layout">

          {/* Main list */}
          <div className="dir-page-main">
            <div className="bars-page-list">
              {visible.map((winery) => (
                <div key={winery.id} className="bar-row">
                  <div className="bar-info">
                    <div className="bar-name">{winery.name}</div>
                    <div className="bar-address">
                      {winery.address} &middot; {winery.region}
                      <MapLink name={winery.name} address={winery.address} />
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
                    >
                      Visit Website
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
                  onClick={() => setShowCount((c) => c + 25)}
                >
                  Show more ({filtered.length - showCount} remaining)
                </button>
              )}
            </div>
          </div>

          {/* Featured sidebar */}
          <div className="dir-page-sidebar">
            <div className="dir-featured-sidebar">
              <div className="dir-featured-heading">Featured Wineries</div>
              {FEATURED_WINERIES.map((winery, i) => (
                <a
                  key={i}
                  className="dir-featured-card"
                  href={winery.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="dir-featured-logo-wrap">
                    <img
                      src={winery.logo}
                      alt={winery.name}
                      loading="lazy"
                      onError={(e) => { e.target.closest('.dir-featured-logo-wrap').style.display = 'none'; }}
                    />
                  </div>
                  <div className="dir-featured-body">
                    <div className="dir-featured-meta">{winery.region}</div>
                    <div className="dir-featured-name">{winery.name}</div>
                    <div className="dir-featured-address">{winery.address}</div>
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
