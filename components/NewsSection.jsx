// components/NewsSection.jsx
// ─────────────────────────────────────────────────────────────
// LIVE wine news feed from 13 RSS sources.
//
// Fetches from /api/news on mount, shows real articles.
// Falls back to a "Loading..." state, then error message
// if the API is unreachable.
//
// Source filter tabs are built dynamically from API data.
// NYC-local sources get a star badge in the tabs.
// Ticker scrolls the top 5 headlines.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useRef } from 'react';

// In-feed ad that matches the news card layout
function InFeedAd() {
  const adRef = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!pushed.current && adRef.current && typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      } catch (e) {
        console.warn('AdSense push error:', e);
      }
    }
  }, []);

  return (
    <div className="news-card-ad">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-format="fluid"
        data-ad-layout-key="-fu+19-4-tz+1j5"
        data-ad-client="ca-pub-6782277104310503"
        data-ad-slot="2794449877"
        ref={adRef}
      />
    </div>
  );
}

export default function NewsSection() {
  const [activeTab, setActiveTab] = useState('All');
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/news')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => {
        setNews(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  // Build tabs dynamically from the data
  const sources = useMemo(() => {
    const seen = new Set();
    return ['All', ...news.map((n) => n.source).filter((s) => {
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    })];
  }, [news]);

  // Filter by active tab
  const filtered =
    activeTab === 'All'
      ? news
      : news.filter((n) => n.source === activeTab);

  // Build ticker text from top headlines
  const tickerText = news
    .slice(0, 6)
    .map((n) => n.title)
    .join(' · ');

  return (
    <section className="news-section" id="sec-news">

      {/* Scrolling ticker */}
      <div className="news-ticker">
        <span className="ticker-badge">Wine News</span>
        <span className="ticker-text">
          {tickerText || 'Loading latest wine news…'}
        </span>
      </div>

      {/* Source filter tabs (built dynamically from API data) */}
      <div className="news-source-tabs">
        {sources.map((s) => (
          <button
            key={s}
            className={`news-tab${activeTab === s ? ' active' : ''}`}
            onClick={() => setActiveTab(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* News cards */}
      <div className="news-cards">
        {loading && (
          <div className="news-card">
            <div>
              <div className="news-card-title">Loading wine news…</div>
            </div>
          </div>
        )}
        {error && (
          <div className="news-card">
            <div>
              <div className="news-card-title">
                Unable to load news right now. Please try again later.
              </div>
            </div>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="news-card">
            <div>
              <div className="news-card-title">
                No wine news from {activeTab} right now.
              </div>
            </div>
          </div>
        )}
        {filtered.map((item, i) => (
          <React.Fragment key={`${item.source}-${i}`}>
            {/* In-feed ad after 3rd and 8th articles */}
            {i === 3 && <InFeedAd />}
            {i === 8 && <InFeedAd />}
            <a
              className={`news-card${item.image ? ' has-image' : ''}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              {item.image && (
                <div className="news-card-img">
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="news-card-text">
                <div className="news-card-source" style={{ color: item.color }}>
                  {item.source}
                </div>
                <div className="news-card-title">{item.title}</div>
                {item.snippet && <div className="news-card-snippet">{item.snippet}</div>}
                <div className="news-card-date">{item.ago}</div>
              </div>
            </a>
          </React.Fragment>
        ))}
      </div>

    </section>
  );
}
