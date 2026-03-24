// pages/search.js
// ─────────────────────────────────────────────────────────────
// Site-wide search — searches stores, events, and news.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import storesData from '../data/wine-stores.json';
import barsData from '../data/wine-bars.json';

export default function SearchPage() {
  const router = useRouter();
  const { q } = router.query;
  const [events, setEvents] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch events and news on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/events').then(r => r.json()).catch(() => []),
      fetch('/api/news').then(r => r.json()).catch(() => []),
    ]).then(([evts, nws]) => {
      if (Array.isArray(evts)) setEvents(evts);
      if (Array.isArray(nws)) setNews(nws);
      setLoading(false);
    });
  }, []);

  const query = (q || '').toLowerCase().trim();

  // Search stores
  const storeResults = query
    ? storesData.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.address.toLowerCase().includes(query) ||
        s.neighborhood.toLowerCase().includes(query)
      )
    : [];

  // Search wine bars
  const barResults = query
    ? barsData.filter(b =>
        b.name.toLowerCase().includes(query) ||
        b.address.toLowerCase().includes(query) ||
        b.borough.toLowerCase().includes(query)
      )
    : [];

  // Search events
  const eventResults = query
    ? events.filter(e =>
        (e.title || '').toLowerCase().includes(query) ||
        (e.venue || '').toLowerCase().includes(query) ||
        (e.tag || '').toLowerCase().includes(query)
      )
    : [];

  // Search news
  const newsResults = query
    ? news.filter(n =>
        (n.title || '').toLowerCase().includes(query) ||
        (n.source || '').toLowerCase().includes(query) ||
        (n.snippet || '').toLowerCase().includes(query)
      )
    : [];

  const totalResults = storeResults.length + barResults.length + eventResults.length + newsResults.length;

  return (
    <>
      <Head>
        <title>{q ? `"${q}" — Search NYCWine.com` : 'Search — NYCWine.com'}</title>
      </Head>
      <Header />

      <div className="search-page">
        <div className="search-page-header">
          <h1 className="search-page-title">
            {query ? (
              <>Results for &ldquo;{q}&rdquo;</>
            ) : (
              'Search NYCWine.com'
            )}
          </h1>
          {query && !loading && (
            <p className="search-page-count">
              {totalResults} result{totalResults !== 1 ? 's' : ''} found
            </p>
          )}
        </div>

        {loading && query && (
          <p className="search-loading">Searching…</p>
        )}

        {!loading && query && totalResults === 0 && (
          <div className="search-empty">
            <p>No results found for &ldquo;{q}&rdquo;.</p>
            <p>Try searching for a store name, neighborhood, event type, or wine keyword.</p>
          </div>
        )}

        {/* ── Store results ──────────────────────────────── */}
        {storeResults.length > 0 && (
          <div className="search-section">
            <h2 className="search-section-title">Wine Stores ({storeResults.length})</h2>
            <div className="search-results">
              {storeResults.slice(0, 20).map((s, i) => (
                <div key={i} className="search-result-card">
                  <div className="src-name">{s.name}</div>
                  <div className="src-meta">{s.address} · {s.neighborhood}</div>
                  {s.phone && <div className="src-meta">{s.phone}</div>}
                  {s.website && (
                    <a href={s.website} className="src-link" target="_blank" rel="noopener noreferrer">
                      Visit website →
                    </a>
                  )}
                </div>
              ))}
              {storeResults.length > 20 && (
                <p className="search-more">
                  Showing 20 of {storeResults.length} stores.{' '}
                  <a href={`/stores?search=${encodeURIComponent(q)}`}>View all on Stores page →</a>
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Wine bar results ──────────────────────────── */}
        {barResults.length > 0 && (
          <div className="search-section">
            <h2 className="search-section-title">Wine Bars ({barResults.length})</h2>
            <div className="search-results">
              {barResults.slice(0, 20).map((b, i) => (
                <div key={i} className="search-result-card">
                  <div className="src-name">{b.name}</div>
                  <div className="src-meta">{b.address} · {b.borough}</div>
                  {b.phone && <div className="src-meta">{b.phone}</div>}
                  {b.website && (
                    <a href={b.website} className="src-link" target="_blank" rel="noopener noreferrer">
                      Visit website →
                    </a>
                  )}
                </div>
              ))}
              {barResults.length > 20 && (
                <p className="search-more">
                  Showing 20 of {barResults.length} wine bars.{' '}
                  <a href="/bars">View all on Wine Bars page →</a>
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Event results ──────────────────────────────── */}
        {eventResults.length > 0 && (
          <div className="search-section">
            <h2 className="search-section-title">Events ({eventResults.length})</h2>
            <div className="search-results">
              {eventResults.slice(0, 10).map((e, i) => (
                <a key={i} className="search-result-card" href={e.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="src-name">{e.title}</div>
                  <div className="src-meta">
                    {e.dateDisplay && <span>{e.dateDisplay} · </span>}
                    {e.venue && <span>{e.venue} · </span>}
                    <span className="src-tag" data-tag={e.tag}>{e.tag}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── News results ──────────────────────────────── */}
        {newsResults.length > 0 && (
          <div className="search-section">
            <h2 className="search-section-title">Wine News ({newsResults.length})</h2>
            <div className="search-results">
              {newsResults.slice(0, 10).map((n, i) => (
                <a key={i} className="search-result-card" href={n.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="src-name">{n.title}</div>
                  <div className="src-meta">{n.source}{n.ago ? ` · ${n.ago}` : ''}</div>
                  {n.snippet && <div className="src-snippet">{n.snippet}</div>}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
