// pages/map.js
// ─────────────────────────────────────────────────────────────
// Interactive NYC Wine Map
//
// Layers:  🍷 Wine Bars (#ec407a) · 🛒 Wine Stores (#1a1a1a) · 🍇 Wineries (#7c3aed)
//
// Location features:
//   • Address / intersection search  → geocoded via Nominatim (browser-side)
//   • "My Location" button           → browser Geolocation API
//   • Distance radius filter         → 0.5 mi / 1 mi / 2 mi / All
//   • Pulsing blue "you are here" dot on the map
//
// Leaflet + MarkerCluster loaded from CDN (avoids SSR window errors).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import QuickNav from '../components/QuickNav';

// ── Layer config ──────────────────────────────────────────────
const LAYERS = {
  bars:     { label: 'Wine Bars',   color: '#ec407a', emoji: '🍷' },
  stores:   { label: 'Wine Stores', color: '#1a1a1a', emoji: '🛒' },
  wineries: { label: 'Wineries',    color: '#7c3aed', emoji: '🍇' },
};

const RADIUS_OPTIONS = [
  { value: 0.5, label: '½ mi' },
  { value: 1,   label: '1 mi' },
  { value: 2,   label: '2 mi' },
  { value: 5,   label: '5 mi' },
];

// ── Utilities ─────────────────────────────────────────────────
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R    = 3958.8; // miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180)
             * Math.cos(lat2 * Math.PI / 180)
             * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeQuery(query) {
  // Bias towards NYC if no city/state specified
  const biased = /new york|nyc|\bny\b/i.test(query)
    ? query
    : `${query}, New York, NY`;
  try {
    const url = 'https://nominatim.openstreetmap.org/search?' +
      new URLSearchParams({ q: biased, format: 'json', limit: '1', countrycodes: 'us' });
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'NYCWine.com map search (educational project)' },
    });
    const data = await res.json();
    if (data.length > 0) {
      return {
        lat:   parseFloat(data[0].lat),
        lng:   parseFloat(data[0].lon),
        label: data[0].display_name.split(',').slice(0, 3).join(', '),
      };
    }
  } catch { /* network error */ }
  return null;
}

function makeVenueIcon(L, color) {
  return L.divIcon({
    className: '',
    html: `<svg width="22" height="30" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 1C5.48 1 1 5.48 1 11c0 7.5 10 18.5 10 18.5S21 18.5 21 11C21 5.48 16.52 1 11 1z"
            fill="${color}" stroke="white" stroke-width="1.8"/>
      <circle cx="11" cy="11" r="4.5" fill="white" opacity="0.25"/>
    </svg>`,
    iconSize:     [22, 30],
    iconAnchor:   [11, 30],
    popupAnchor:  [0, -31],
  });
}

function makeLocationIcon(L) {
  return L.divIcon({
    className: 'map-you-are-here',
    html: `<div class="mld-pulse"></div><div class="mld-dot"></div>`,
    iconSize:    [22, 22],
    iconAnchor:  [11, 11],
    popupAnchor: [0, -14],
  });
}

function popupHtml(item, type) {
  const cfg     = LAYERS[type];
  const name    = item.name    || 'Unknown';
  const address = item.address || '';
  const hood    = item.neighborhood || item.region || item.borough || '';
  const site    = item.website || '';
  return `
    <div class="map-popup">
      <div class="mp-type" style="background:${cfg.color}">${cfg.emoji} ${cfg.label.replace(/s$/, '')}</div>
      <div class="mp-name">${name}</div>
      ${hood    ? `<div class="mp-hood">${hood}</div>`            : ''}
      ${address ? `<div class="mp-addr">${address}</div>`         : ''}
      ${site    ? `<a class="mp-link" href="${site}" target="_blank" rel="noopener">Visit Website →</a>` : ''}
    </div>`;
}

function loadCSS(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l  = document.createElement('link');
  l.rel    = 'stylesheet';
  l.href   = href;
  document.head.appendChild(l);
}

function loadScript(src) {
  return new Promise(resolve => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s  = document.createElement('script');
    s.src    = src;
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

// ── Page ──────────────────────────────────────────────────────
export default function MapPage() {
  const mapDivRef      = useRef(null);
  const mapRef         = useRef(null);
  const clusterRefs    = useRef({});
  const dataRef        = useRef({ bars: [], stores: [], wineries: [] });
  const locationPinRef = useRef(null);   // the "you are here" marker

  const [mapReady,     setMapReady]     = useState(false);
  const [filter,       setFilter]       = useState({ bars: true, stores: true, wineries: true });
  const [counts,       setCounts]       = useState({ bars: 0, stores: 0, wineries: 0 });
  const [userLocation, setUserLocation] = useState(null);  // { lat, lng, label }
  const [radius,       setRadius]       = useState(null);  // miles or null = all
  const [searchInput,  setSearchInput]  = useState('');
  const [searching,    setSearching]    = useState(false);
  const [searchError,  setSearchError]  = useState('');
  const [geoLoading,   setGeoLoading]   = useState(false);

  // ── Init map ─────────────────────────────────────────────────
  useEffect(() => {
    let destroyed = false;
    async function init() {
      loadCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      loadCSS('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css');
      loadCSS('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css');
      await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      await loadScript('https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js');
      if (destroyed || !mapDivRef.current || mapRef.current) return;

      const L = window.L;
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapDivRef.current, { center: [40.7380, -73.9800], zoom: 12 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;

      // Create one cluster group per category
      const groups = {};
      for (const key of Object.keys(LAYERS)) {
        groups[key] = L.markerClusterGroup({
          maxClusterRadius: 50,
          iconCreateFunction: cluster => {
            const color = LAYERS[key].color;
            const n     = cluster.getChildCount();
            return L.divIcon({
              className: '',
              html: `<div style="background:${color};color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.28)">${n}</div>`,
              iconSize: [34, 34], iconAnchor: [17, 17],
            });
          },
        });
      }
      clusterRefs.current = groups;

      // Load data
      const [bars, stores, wineries] = await Promise.all([
        fetch('/data/wine-bars.json').then(r => r.json()).catch(() => []),
        fetch('/data/wine-stores.json').then(r => r.json()).catch(() => []),
        fetch('/data/wineries.json').then(r => r.json()).catch(() => []),
      ]);
      if (destroyed) return;

      dataRef.current = { bars, stores, wineries };

      // Initial render — no location filter
      const newCounts = { bars: 0, stores: 0, wineries: 0 };
      for (const key of Object.keys(LAYERS)) {
        const icon  = makeVenueIcon(L, LAYERS[key].color);
        const items = dataRef.current[key];
        for (const item of items) {
          if (!item.lat || !item.lng) continue;
          const m = L.marker([item.lat, item.lng], { icon });
          m.bindPopup(popupHtml(item, key), { maxWidth: 260 });
          groups[key].addLayer(m);
          newCounts[key]++;
        }
        map.addLayer(groups[key]);
      }
      setCounts(newCounts);
      setMapReady(true);
    }
    init();
    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // ── Rebuild markers whenever filter / location / radius changes ──
  const rebuildMarkers = useCallback((activeFilter, location, radiusMiles) => {
    const L      = window.L;
    const map    = mapRef.current;
    const groups = clusterRefs.current;
    const data   = dataRef.current;
    if (!L || !map || !groups.bars) return;

    const newCounts = { bars: 0, stores: 0, wineries: 0 };
    for (const key of Object.keys(LAYERS)) {
      groups[key].clearLayers();
      map.removeLayer(groups[key]);
      if (!activeFilter[key]) continue;

      const icon  = makeVenueIcon(L, LAYERS[key].color);
      const items = data[key] || [];
      for (const item of items) {
        if (!item.lat || !item.lng) continue;
        if (location && radiusMiles) {
          const dist = haversineDistance(location.lat, location.lng, item.lat, item.lng);
          if (dist > radiusMiles) continue;
        }
        const m = L.marker([item.lat, item.lng], { icon });
        m.bindPopup(popupHtml(item, key), { maxWidth: 260 });
        groups[key].addLayer(m);
        newCounts[key]++;
      }
      map.addLayer(groups[key]);
    }
    setCounts(newCounts);
  }, []);

  // Run rebuild whenever filter/location/radius changes (skip on first mount — init handles it)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!mapReady) return;
    rebuildMarkers(filter, userLocation, radius);
  }, [filter, userLocation, radius, mapReady, rebuildMarkers]);

  // ── Drop / update location pin on map ────────────────────────
  useEffect(() => {
    const L   = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    // Remove old pin
    if (locationPinRef.current) {
      map.removeLayer(locationPinRef.current);
      locationPinRef.current = null;
    }
    if (!userLocation) return;

    const pin = L.marker([userLocation.lat, userLocation.lng], {
      icon:      makeLocationIcon(L),
      zIndexOffset: 1000,
    }).bindPopup(`<div class="map-popup"><div class="mp-name">📍 ${userLocation.label}</div></div>`);
    pin.addTo(map);
    locationPinRef.current = pin;
    map.setView([userLocation.lat, userLocation.lng], 14, { animate: true });
  }, [userLocation]);

  // ── Address search ────────────────────────────────────────────
  async function handleSearch(e) {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;
    setSearching(true);
    setSearchError('');
    const result = await geocodeQuery(q);
    setSearching(false);
    if (result) {
      setUserLocation(result);
      if (!radius) setRadius(1); // default to 1 mi on first search
    } else {
      setSearchError('Address not found — try a street name, intersection, or neighborhood.');
    }
  }

  // ── Geolocation ───────────────────────────────────────────────
  function handleGeoLocate() {
    if (!navigator.geolocation) {
      setSearchError('Your browser doesn\'t support location sharing.');
      return;
    }
    setGeoLoading(true);
    setSearchError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGeoLoading(false);
        setUserLocation({ lat: coords.latitude, lng: coords.longitude, label: 'Your location' });
        if (!radius) setRadius(1);
      },
      () => {
        setGeoLoading(false);
        setSearchError('Location access was denied. Try entering an address instead.');
      },
      { timeout: 10000 }
    );
  }

  // ── Clear location ────────────────────────────────────────────
  function clearLocation() {
    setUserLocation(null);
    setRadius(null);
    setSearchInput('');
    setSearchError('');
    mapRef.current?.setView([40.7380, -73.9800], 12, { animate: true });
  }

  function resetView() {
    mapRef.current?.setView([40.7380, -73.9800], 12, { animate: true });
  }

  // ── Toggle category filter ────────────────────────────────────
  function toggleLayer(key) {
    setFilter(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <>
      <Head>
        <title>Interactive Wine Map — NYCWine.com</title>
        <meta name="description"
          content="Find NYC wine bars, wine stores, and wineries near you on an interactive map." />
      </Head>

      <Header />
      <QuickNav />

      <main className="map-page">

        {/* ── Ribbon ───────────────────────────────────────────── */}
        <div className="section-header map-page-header">
          <div className="section-header-title">
            <img src="/images/mapbutton.png" className="ribbon-icon" alt="" aria-hidden="true"
                 style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover' }} />
            NYC Wine Map
          </div>
        </div>

        {/* ── Controls ─────────────────────────────────────────── */}
        <div className="map-controls">

          {/* Row 1 — location search */}
          <div className="map-location-row">
            <form className="map-search-form" onSubmit={handleSearch}>
              <div className="map-search-input-wrap">
                {/* Pin icon */}
                <svg className="map-search-icon" width="15" height="15" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2.2"
                     strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <input
                  type="text"
                  className="map-search-input"
                  placeholder="Enter address or intersection…"
                  value={searchInput}
                  onChange={e => { setSearchInput(e.target.value); setSearchError(''); }}
                  disabled={searching}
                />
                {(searchInput || userLocation) && (
                  <button type="button" className="map-search-clear" onClick={clearLocation}
                          aria-label="Clear">✕</button>
                )}
              </div>
              <button type="submit" className="map-search-btn" disabled={!searchInput.trim() || searching}>
                {searching ? '…' : 'Search'}
              </button>
            </form>

            <button
              className={`map-geo-btn${geoLoading ? ' map-geo-loading' : ''}`}
              onClick={handleGeoLocate}
              disabled={geoLoading}
              title="Use my current location"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
                <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2z"/>
              </svg>
              {geoLoading ? 'Locating…' : 'My Location'}
            </button>
          </div>

          {/* Location label + radius pills — shown when location is set */}
          {userLocation && (
            <div className="map-location-active">
              <span className="map-location-label">
                <span className="map-location-dot-inline" />
                {userLocation.label}
              </span>
              <div className="map-radius-pills">
                <span className="map-radius-label">Within:</span>
                {RADIUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`map-radius-pill${radius === opt.value ? ' map-radius-active' : ''}`}
                    onClick={() => setRadius(radius === opt.value ? null : opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  className={`map-radius-pill${radius === null ? ' map-radius-active' : ''}`}
                  onClick={() => setRadius(null)}
                >
                  All
                </button>
              </div>
            </div>
          )}

          {/* Error message */}
          {searchError && <div className="map-search-error">{searchError}</div>}

          {/* Row 2 — category filters */}
          <div className="map-filter-row">
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
            <button className="map-action-btn" onClick={resetView} title="Reset map view">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Reset View
            </button>
          </div>

        </div>

        {/* ── Map canvas ───────────────────────────────────────── */}
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
