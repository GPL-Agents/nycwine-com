// components/NewsSection.jsx
// ─────────────────────────────────────────────────────────────
// LIVE wine news feed from 8 RSS sources.
//
// Fetches from /api/news on mount, shows real articles.
// Falls back to a "Loading..." state, then error message
// if the API is unreachable.
//
// Source filter tabs let users filter by publication.
// Ticker scrolls the top 5 headlines.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';

// Tab labels — "All" plus the source names from the API
const SOURCES = ['All', 'NY Times', 'NY Post', 'Eater NY', 'VinePair', 'Grub St.', 'Wine Spectator', 'Decanter', 'Wine Enthusiast'];

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

  // Filter by active tab
  const filtered =
    activeTab === 'All'
      ? news
      : news.filter((n) => n.source.includes(activeTab));

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

      {/* Source filter tabs */}
      <div className="news-source-tabs">
        {SOURCES.map((s) => (
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
            <div className="news-card-emoji">⏳</div>
            <div>
              <div className="news-card-title">Loading wine news…</div>
            </div>
          </div>
        )}
        {error && (
          <div className="news-card">
            <div className="news-card-emoji">⚠️</div>
            <div>
              <div className="news-card-title">
                Unable to load news right now. Please try again later.
              </div>
            </div>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="news-card">
            <div className="news-card-emoji">🔍</div>
            <div>
              <div className="news-card-title">
                No wine news from {activeTab} right now.
              </div>
            </div>
          </div>
        )}
        {filtered.map((item, i) => (
          <a
            key={`${item.source}-${i}`}
            className="news-card"
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="news-card-emoji">{item.emoji}</div>
            <div>
              <div className="news-card-source" style={{ color: item.color }}>
                {item.source}
              </div>
              <div className="news-card-title">{item.title}</div>
              <div className="news-card-date">{item.ago}</div>
            </div>
          </a>
        ))}
      </div>

    </section>
  );
}
