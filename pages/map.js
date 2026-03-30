// pages/map.js
// ─────────────────────────────────────────────────────────────
// Interactive NYC Wine Map
//
// Layers:
//   🍷 Wine Bars    — pink   (#ec407a)
//   🛒 Wine Stores  — black  (#1a1a1a)
//   🍇 Wineries     — purple (#7c3aed)
//
// Libraries loaded via CDN inside useEffect so they don't break
// Next.js SSR (Leaflet requires `window`).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import QuickNav from '../components/QuickNav';

// ── Marker config per layer ───────────────────────────────────
const LAYERS = {
  bars:     { label: 'Wine Bars',   color: '#ec407a', emoji: '🍷', textColor: '#fff' },
  stores:   { label: 'Wine Stores', color: '#1a1a1a', emoji: '🛒', textColor: '#fff' },
  wineries: { label: 'Wineries',    color: '#7c3aed', emoji: '🍇', textColor: '#fff' },
};

function makeIcon(L, color) {
  return L.divIcon({
    className: '',
    html: `<svg width="22" height="30" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 1C5.48 1 1 5.48 1 11c0 7.5 10 18.5 10 18.5S21 18.5 21 11C21 5.48 16.52 1 11 1z"
            fill="${color}" stroke="white" stroke-width="1.8"/>
      <circle cx="11" cy="11" r="4.5" fill="white" opacity="0.25"/>
    </svg>`,
    iconSize: [22, 30],
    iconAnchor: [11, 30],
    popupAnchor: [0, -31],
  });
}

function popupHtml(item, type) {
  const name    = item.name || 'Unknown';
  const address = item.address || '';
  const hood    = item.neighborhood || item.region || item.borough || '';
  const site    = item.website || '';
  const cfg     = LAYERS[type];

  return `
    <div class="map-popup">
      <div class="mp-type" style="background:${cfg.color}">${cfg.emoji} ${cfg.label.replace(/s$/,'')}</div>
      <div class="mp-name">${name}</div>
      ${hood    ? `<div class="mp-hood">${hood}</div>` : ''}
      ${address ? `<div class="mp-addr">${address}</div>` : ''}
      ${site    ? `<a class="mp-link" href="${site}" target="_blank" rel="noopener">Visit Website →</a>` : ''}
    </div>
  `;
}

// ── Script/CSS loader helpers ─────────────────────────────────
function loadCSS(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link    = document.createElement('link');
  link.rel      = 'stylesheet';
  link.href     = href;
  document.head.appendChild(link);
}

function loadScript(src) {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s  = document.createElement('script');
    s.src    = src;
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

// ── Page component ────────────────────────────────────────────
export default function MapPage() {
  const mapDivRef        = useRef(null);
  const mapRef           = useRef(null);      // Leaflet map instance
  const clusterRefs      = useRef({});         // { bars, stores, wineries } cluster groups
  const [filter, setFilter]   = useState({ bars: true, stores: true, wineries: true });
  const [counts, setCounts]   = useState({ bars: 0, stores: 0, wineries: 0 });
  const [mapReady, setMapReady] = useState(false);

  // ── Initialise map + load data ──────────────────────────────
  useEffect(() => {
    let destroyed = false;

    async function init() {
      // Load Leaflet CSS + JS
      loadCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      loadCSS('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css');
      loadCSS('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css');
      await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      await loadScript('https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js');

      if (destroyed || !mapDivRef.current || mapRef.current) return;

      const L = window.L;

      // Fix Leaflet default icon path (broken in bundlers)
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Create map
      const map = L.map(mapDivRef.current, {
        center: [40.7380, -73.9800],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // Create a cluster group per layer
      const groups = {};
      for (const key of Object.keys(LAYERS)) {
        groups[key] = L.markerClusterGroup({
          maxClusterRadius: 50,
          iconCreateFunction: (cluster) => {
            const color = LAYERS[key].color;
            const n     = cluster.getChildCount();
            return L.divIcon({
              className: '',
              html: `<div style="background:${color};color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${n}</div>`,
              iconSize: [34, 34],
              iconAnchor: [17, 17],
            });
          },
        });
      }

      // Fetch and add markers
      const newCounts = { bars: 0, stores: 0, wineries: 0 };

      const [barsData, storesData, wineriesData] = await Promise.all([
        fetch('/data/wine-bars.json').then(r => r.json()).catch(() => []),
        fetch('/data/wine-stores.json').then(r => r.json()).catch(() => []),
        fetch('/data/wineries.json').then(r => r.json()).catch(() => []),
      ]);

      if (destroyed) return;

      const datasets = [
        { key: 'bars',     data: barsData    },
        { key: 'stores',   data: storesData  },
        { key: 'wineries', data: wineriesData },
      ];

      for (const { key, data } of datasets) {
        const icon = makeIcon(L, LAYERS[key].color);
        for (const item of data) {
          if (!item.lat || !item.lng) continue;
          const marker = L.marker([item.lat, item.lng], { icon });
          marker.bindPopup(popupHtml(item, key), { maxWidth: 260 });
          groups[key].addLayer(marker);
          newCounts[key]++;
        }
        map.addLayer(groups[key]);
      }

      clusterRefs.current = groups;
      setCounts(newCounts);
      setMapReady(true);
    }

    init();

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ── Toggle filter layers ────────────────────────────────────
  const toggleLayer = useCallback((key) => {
    setFilter(prev => {
      const next = { ...prev, [key]: !prev[key] };
      const map  = mapRef.current;
      const grp  = clusterRefs.current[key];
      if (map && grp) {
        if (next[key]) map.addLayer(grp);
        else           map.removeLayer(grp);
      }
      return next;
    });
  }, []);

  // ── "Show all / my location" helpers ─────────────────────────
  function resetView() {
    mapRef.current?.setView([40.7380, -73.9800], 12);
  }

  function geoLocate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      mapRef.current?.setView([coords.latitude, coords.longitude], 14);
    });
  }

  return (
    <>
      <Head>
        <title>Interactive Wine Map — NYCWine.com</title>
        <meta name="description"
          content="Interactive map of NYC wine bars, wine stores, and wineries. Click any pin for address and website." />
      </Head>

      <Header />
      <QuickNav />

      <main className="map-page">

        {/* ── Ribbon header ──────────────────────────────────── */}
        <div className="section-header map-page-header">
          <div className="section-header-title">
            <img src="/images/mapbutton.png" className="ribbon-icon" alt="" aria-hidden="true"
                 style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover' }} />
            NYC Wine Map
          </div>
        </div>

        {/* ── Filter + controls bar ──────────────────────────── */}
        <div className="map-controls">
          <div className="map-filter-pills">
            {Object.entries(LAYERS).map(([key, cfg]) => (
              <button
                key={key}
                className={`map-filter-pill${filter[key] ? ' map-filter-active' : ''}`}
                style={filter[key] ? { '--pill-color': cfg.color } : {}}
                onClick={() => toggleLayer(key)}
              >
                <span className="mfp-dot" style={{ background: cfg.color }} />
                {cfg.label}
                {mapReady && <span className="mfp-count">{counts[key]}</span>}
              </button>
            ))}
          </div>
          <div className="map-action-btns">
            <button className="map-action-btn" onClick={resetView} title="Reset view">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
              </svg>
              Reset
            </button>
            <button className="map-action-btn" onClick={geoLocate} title="Use my location">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
                <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2z"/>
              </svg>
              Near Me
            </button>
          </div>
        </div>

        {/* ── Map ────────────────────────────────────────────── */}
        <div className="map-container">
          {!mapReady && (
            <div className="map-loading">
              <div className="map-loading-spinner" />
              <span>Loading map…</span>
            </div>
          )}
          <div ref={mapDivRef} className="map-leaflet" />
        </div>

      </main>

      <Footer />
    </>
  );
}
