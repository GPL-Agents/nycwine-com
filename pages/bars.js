// pages/bars.js
// ─────────────────────────────────────────────────────────────
// Full wine bar directory page — all NYC wine bars.
// Two-column layout: search + list (left) + featured sidebar (right).
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MapLink from '../components/MapLink';
import QuickNav from '../components/QuickNav';

// ── Featured Wine Bars ────────────────────────────────────────
// Sourced from the wine-bars.json data (featured: true entries).
const FEATURED_BARS = [
  {
    name: 'Anaïs Wine Bar',
    neighborhood: 'Boerum Hill',
    address: '196 Bergen St, Brooklyn',
    logo: 'https://images.squarespace-cdn.com/content/v1/62a0aa286b50441f3d9fc2d1/a1591594-769a-4f46-86c3-be3f6f12e668/Anais_logo.png?format=750w',
    website: 'https://www.anaisbk.com/',
  },
  {
    name: 'Rhodora Wine Bar',
    neighborhood: 'Fort Greene',
    address: '197 Adelphi St, Brooklyn',
    logo: 'https://images.squarespace-cdn.com/content/v1/5d7bc8617e9d3f18cc755a50/1569435485360-2REA0K3DMQ8UHLDZGVA1/Logo-1.png',
    website: 'https://www.rhodorabk.com',
  },
  {
    name: 'APERITIVO by CARTA',
    neighborhood: 'West Village',
    address: '101 W 10th St, New York',
    logo: 'https://aperitivobycarta.com/wp-content/uploads/2025/10/cropped-logoaperitivo.jpg',
    website: 'https://aperitivobycarta.com',
  },
  {
    name: 'Lei Wine Bar',
    neighborhood: 'Chinatown',
    address: '15-17 Doyers St, New York',
    logo: 'https://images.squarespace-cdn.com/content/v1/681282bb6b86085cb558827c/ccbd06a3-ef50-4bc8-a53c-487f28b2a5e2/SECONDARYLOGO_LEI+Green.png',
    website: 'https://www.leiwine.nyc/',
  },
  {
    name: 'Musette Wine Bar',
    neighborhood: 'Harlem',
    address: '420 Malcolm X Blvd, New York',
    logo: 'https://static.spotapps.co/website_images/ab_websites/117051_website/logo.png',
    website: 'https://musettewinebar.com',
  },
  {
    name: 'Roscioli NYC',
    neighborhood: 'Greenwich Village',
    address: '43 MacDougal St, New York',
    logo: 'https://images.squarespace-cdn.com/content/v1/691656a28c3867312e658fd6/f6995212-d6af-48dc-9f49-4cad06adbdf0/Roscioli_Logo_Cropped.png',
    website: 'https://www.rosciolinyc.com',
  },
  {
    name: 'Vin Sur Vingt',
    neighborhood: 'Upper West Side',
    address: '100 Riverside Blvd, New York',
    logo: 'https://images.getbento.com/accounts/ad7ac5d6a757485b222dc1d5ec1aa933/media/images/24711logo2.png',
    website: 'https://www.vsvwinebars.com',
  },
  {
    name: "Eli's Table",
    neighborhood: 'Upper East Side',
    address: '1411 3rd Ave, New York',
    logo: 'https://www.elizabar.com/App_Themes/elizabar/images/logo.png',
    website: 'https://www.elizabar.com/',
  },
  {
    name: 'Popina',
    neighborhood: 'Red Hook',
    address: '127 Columbia Street, Brooklyn',
    logo: 'https://images.getbento.com/accounts/916807a92bd379a1b68c70cb275f7883/media/images/15262Popina_Logo_Unstacked.png',
    website: 'https://popinanyc.com',
  },
];

export default function BarsPage() {
  const [bars, setBars] = useState([]);
  const [borough, setBorough] = useState('All');
  const [search, setSearch] = useState('');
  const [showCount, setShowCount] = useState(25);

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
      <QuickNav />

      <main className="bars-page">

        {/* Pink ribbon header */}
        <div className="section-header dir-page-header">
          <div className="section-header-title">
            <img src="/images/icons/icon-wine-bar.png" className="ribbon-icon" alt="" aria-hidden="true" />
            NYC Wine Bars
          </div>
          <Link href="/map">
            <img
              src="/images/maps3button.png"
              alt="Maps & Directions"
              style={{ height: '28px', width: 'auto', cursor: 'pointer', borderRadius: '6px', display: 'block' }}
            />
          </Link>
        </div>

        {/* Search & filter controls */}
        <div className="dir-page-controls">
          <input
            type="search"
            placeholder="Search by name, address, or borough…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowCount(20); }}
          />
          <select
            value={borough}
            onChange={(e) => { setBorough(e.target.value); setShowCount(20); }}
          >
            {boroughs.map((b) => (
              <option key={b} value={b}>{b === 'All' ? 'All Boroughs' : b}</option>
            ))}
          </select>
        </div>

        <div className="dir-page-count">
          Showing {Math.min(showCount, filtered.length)} of {filtered.length} wine bars
          {borough !== 'All' && ` in ${borough}`}
        </div>

        {/* Two-column layout */}
        <div className="dir-page-layout">

          {/* Main list */}
          <div className="dir-page-main">
            <div className="bars-page-list">
              {visible.map((bar) => (
                <div key={bar.id} className="bar-row">
                  <div className="bar-info">
                    <div className="bar-name">{bar.name}</div>
                    <div className="bar-address">
                      {bar.address} &middot; {bar.borough}
                      <MapLink name={bar.name} address={bar.address} />
                    </div>
                    {bar.phone && (
                      <div className="bar-phone">
                        <a href={`tel:${bar.phone}`}>{bar.phone}</a>
                      </div>
                    )}
                    {bar.email && (
                      <div className="bar-email">
                        <a href={`mailto:${bar.email}`}>{bar.email}</a>
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
                      Visit Website
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
              <div className="dir-featured-heading">Featured Wine Bars</div>
              {FEATURED_BARS.map((bar, i) => (
                <a
                  key={i}
                  className="dir-featured-card"
                  href={bar.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="dir-featured-logo-wrap">
                    <img
                      src={bar.logo}
                      alt={bar.name}
                      loading="lazy"
                      onError={(e) => { e.target.closest('.dir-featured-logo-wrap').style.display = 'none'; }}
                    />
                  </div>
                  <div className="dir-featured-body">
                    <div className="dir-featured-meta">{bar.neighborhood}</div>
                    <div className="dir-featured-name">{bar.name}</div>
                    <div className="dir-featured-address">{bar.address}</div>
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
