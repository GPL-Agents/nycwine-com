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
  bars:     { label: 'Wine Bars',   singular: 'Wine Bar',  color: '#ec407a', emoji: '🍷' },
  stores:   { label: 'Wine Stores', singular: 'Wine Store', color: '#1a1a1a', emoji: '🛒' },
  wineries: { label: 'Wineries',    singular: 'Winery',    color: '#7c3aed', emoji: '🍇' },
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

async function geocodeQuery(rawQuery) {
  const query = rawQuery.trim();

  // ── 1. NYC Planning Geosearch (best for NYC addresses & intersections) ──
  try {
    const url = 'https://geosearch.planninglabs.nyc/v2/search?' +
      new URLSearchParams({ text: query, size: '1' });
    const res  = await fetch(url);
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      const f = data.features[0];
      const [lng, lat] = f.geometry.coordinates;
      const label = f.properties.label || query;
      return { lat, lng, label: label.split(',').slice(0, 3).join(', ') };
    }
  } catch { /* fall through */ }

  // ── 2. Nominatim fallback (broader coverage) ────────────────────────────
  const hasCity = /new york|nyc|\bny\b|\bbrooklyn\b|\bbronx\b|\bqueens\b|\bstaten island\b/i.test(query);
  const biased  = hasCity ? query : `${query}, New York, NY`;
  try {
    const url = 'https://nominatim.openstreetmap.org/search?' +
      new URLSearchParams({ q: biased, format: 'json', limit: '1', countrycodes: 'us' });
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'NYCWine.com/2.0 map search' },
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

function makeVenueIcon(L, color, emoji) {
  return L.divIcon({
    className: '',
    html: `<svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="14" cy="37" rx="6" ry="1.8" fill="rgba(0,0,0,0.18)"/>
      <path d="M14 1C7.37 1 2 6.37 2 13c0 9.5 12 24 12 24S26 22.5 26 13C26 6.37 20.63 1 14 1z"
            fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="13" r="9" fill="white"/>
      <text x="14" y="14" text-anchor="middle" dominant-baseline="middle"
            font-size="11" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${emoji}</text>
    </svg>`,
    iconSize:    [28, 38],
    iconAnchor:  [14, 38],
    popupAnchor: [0, -39],
  });
}

// Larger featured pin — category color + emoji + gold ★ badge top-right.
// Used for items with featured: true in the JSON data.
function makeFeaturedIcon(L, color, emoji) {
  return L.divIcon({
    className: '',
    html: `<svg width="38" height="50" viewBox="0 0 38 50" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="19" cy="49" rx="8" ry="2.2" fill="rgba(0,0,0,0.20)"/>
      <path d="M19 1C10.72 1 4 7.72 4 16c0 12 15 33 15 33S34 28 34 16C34 7.72 27.28 1 19 1z"
            fill="${color}" stroke="white" stroke-width="2.2"/>
      <circle cx="19" cy="16" r="11" fill="white"/>
      <circle cx="31" cy="7" r="7" fill="#FFB800" stroke="white" stroke-width="1.8"/>
      <text x="31" y="7.5" text-anchor="middle" dominant-baseline="middle"
            font-size="9" fill="white" font-weight="bold" font-family="sans-serif">★</text>
      <text x="19" y="17" text-anchor="middle" dominant-baseline="middle"
            font-size="14" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${emoji}</text>
    </svg>`,
    iconSize:    [38, 50],
    iconAnchor:  [19, 50],
    popupAnchor: [0, -51],
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
  const phone   = item.phone   || '';
  const email   = item.email   || '';
  // data-* attributes used by the delegated click handler below
  const safeName = name.replace(/"/g, '&quot;');
  const safeAddr = address.replace(/"/g, '&quot;');
  const featuredBadge = item.featured
    ? `<span style="display:inline-block;background:#ec407a;color:white;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:6px;letter-spacing:0.04em;">★ Featured</span>`
    : '';
  return `
    <div class="map-popup">
      <div class="mp-type" style="background:${cfg.color}">${cfg.emoji} ${cfg.singular}${featuredBadge}</div>
      <div class="mp-name">${name}</div>
      ${hood    ? `<div class="mp-hood">${hood}</div>`    : ''}
      ${address ? `<div class="mp-addr">${address}</div>` : ''}
      ${phone   ? `<a class="mp-contact" href="tel:${phone}">📞 ${phone}</a>` : ''}
      ${email   ? `<a class="mp-contact" href="mailto:${email}">✉️ ${email}</a>` : ''}
      <div class="mp-footer">
        <a class="mp-dir" href="#" data-name="${safeName}" data-addr="${safeAddr}">
          <svg width="10" height="12" viewBox="0 0 11 14" fill="currentColor" aria-hidden="true">
            <path d="M5.5 0C2.46 0 0 2.46 0 5.5 0 9.35 5.5 14 5.5 14S11 9.35 11 5.5C11 2.46 8.54 0 5.5 0zm0 7.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
          </svg>
          Directions
        </a>
        ${site ? `<a class="mp-link" href="${site}" target="_blank" rel="noopener">Website →</a>` : ''}
      </div>
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

  // Support ?only=bars|stores|wineries from concierge navigation
  const initialFilter = (() => {
    if (typeof window === 'undefined') return { bars: true, stores: true, wineries: true };
    const only = new URLSearchParams(window.location.search).get('only');
    if (only && only in { bars: 1, stores: 1, wineries: 1 }) {
      return { bars: only === 'bars', stores: only === 'stores', wineries: only === 'wineries' };
    }
    return { bars: true, stores: true, wineries: true };
  })();

  const [filter,       setFilter]       = useState(initialFilter);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [counts,       setCounts]       = useState({ bars: 0, stores: 0, wineries: 0 });
  const [userLocation, setUserLocation] = useState(null);  // { lat, lng, label }
  const [radius,       setRadius]       = useState(null);  // miles or null = all

  // Pre-fill search from concierge ?near= param
  const nearParam = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('near') || ''
    : '';
  const [searchInput,  setSearchInput]  = useState(nearParam);
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

      // Delegated handler for directions links inside popups
      mapDivRef.current.addEventListener('click', function(e) {
        const link = e.target.closest('.mp-dir');
        if (!link) return;
        e.preventDefault();
        const name = link.dataset.name || '';
        const addr = link.dataset.addr || '';
        const q    = encodeURIComponent(`${name} ${addr}`);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const url  = isIOS
          ? `https://maps.apple.com/?q=${q}`
          : `https://www.google.com/maps/search/?api=1&query=${q}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      });

      // Create one cluster group per category
      const groups = {};
      for (const key of Object.keys(LAYERS)) {
        groups[key] = L.markerClusterGroup({
          maxClusterRadius: 30,
          disableClusteringAtZoom: 13,
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
        const baseIcon     = makeVenueIcon(L, LAYERS[key].color, LAYERS[key].emoji);
        const featuredIcon = makeFeaturedIcon(L, LAYERS[key].color, LAYERS[key].emoji);
        const items = dataRef.current[key];
        for (const item of items) {
          if (!item.lat || !item.lng) continue;
          const icon = item.featured ? featuredIcon : baseIcon;
          const m = L.marker([item.lat, item.lng], { icon, zIndexOffset: item.featured ? 1000 : 0 });
          m.bindTooltip(item.name || '', { direction: 'top', offset: [0, item.featured ? -40 : -28], className: 'map-venue-tooltip' });
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
  const rebuildMarkers = useCallback((activeFilter, location, radiusMiles, featuredOnly) => {
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

      const baseIcon     = makeVenueIcon(L, LAYERS[key].color, LAYERS[key].emoji);
      const featuredIcon = makeFeaturedIcon(L, LAYERS[key].color, LAYERS[key].emoji);
      const items = data[key] || [];
      for (const item of items) {
        if (!item.lat || !item.lng) continue;
        if (featuredOnly && !item.featured) continue;
        if (location && radiusMiles) {
          const dist = haversineDistance(location.lat, location.lng, item.lat, item.lng);
          if (dist > radiusMiles) continue;
        }
        const icon = item.featured ? featuredIcon : baseIcon;
        const m = L.marker([item.lat, item.lng], { icon, zIndexOffset: item.featured ? 1000 : 0 });
        m.bindTooltip(item.name || '', { direction: 'top', offset: [0, item.featured ? -40 : -28], className: 'map-venue-tooltip' });
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
    rebuildMarkers(filter, userLocation, radius, featuredOnly);
  }, [filter, userLocation, radius, featuredOnly, mapReady, rebuildMarkers]);

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

  // ── Auto-geocode ?near= param from concierge ─────────────────
  useEffect(() => {
    if (!mapReady || !nearParam) return;
    (async () => {
      setSearching(true);
      const result = await geocodeQuery(nearParam);
      setSearching(false);
      if (result) {
        setUserLocation(result);
        if (!radius) setRadius(1);
      } else {
        setSearchError('Address not found — try a street name, intersection, or neighborhood.');
      }
    })();
  }, [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setUserLocation(null);
    setRadius(null);
    setSearchInput('');
    setSearchError('');
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

        {/* ── Header ribbon — title + search + filters (all black) ── */}
        <div className="map-page-header">

          {/* Row 1 — title + search + my location */}
          <div className="map-header-top">
            <div className="map-header-title">
              <img src="/images/icons/icon-map.png" className="ribbon-icon" alt="" aria-hidden="true" />
              NYC Wine Map
            </div>

            <form className="map-search-form" onSubmit={handleSearch}>
              <div className="map-search-input-wrap">
                <svg className="map-search-icon" width="15" height="15" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2.2"
                     strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <input
                  type="text"
                  className="map-search-input"
                  placeholder="Address or neighborhood…"
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
              {geoLoading ? (
                <>
                  <span style={{ fontSize: 15 }}>⏳</span>
                  Finding you…
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
                    <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2z"/>
                  </svg>
                  My Location
                </>
              )}
            </button>

            {searchError && <span className="map-search-error">{searchError}</span>}
          </div>

        </div>

        {/* ── White pill ribbon — category filters + reset ─────── */}
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

            {/* Featured filter pill */}
            <button
              className={`map-filter-pill map-featured-pill${featuredOnly ? ' map-featured-pill-active' : ''}`}
              onClick={() => setFeaturedOnly(prev => !prev)}
              title="Show featured venues only"
            >
              <svg width="20" height="20" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
                <circle cx="9" cy="9" r="9" fill={featuredOnly ? 'white' : '#FFB800'} stroke={featuredOnly ? 'rgba(255,255,255,0.6)' : '#e5a600'} strokeWidth="1"/>
                <text x="9" y="9.5" textAnchor="middle" dominantBaseline="middle"
                      fontSize="11" fill={featuredOnly ? '#FFB800' : 'white'} fontWeight="bold" fontFamily="sans-serif">★</text>
              </svg>
              Featured
            </button>

            {/* Reset View — kept next to Featured */}
            <button className="map-action-btn" onClick={resetView} title="Reset map view">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Reset View
            </button>
          </div>

          {userLocation && (
            <div className="map-location-inline">
              <span className="map-location-sep" />
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
