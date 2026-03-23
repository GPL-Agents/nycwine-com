// components/NewsSection.jsx
// ─────────────────────────────────────────────────────────────
// Wine news feed from multiple RSS sources + Reddit.
//
// DATA: Currently uses placeholder data.
// V1 upgrade: replace PLACEHOLDER_NEWS with server-side fetch
// of RSS feeds via getServerSideProps or an API route.
// Sources: NY Times, NY Post, Eater NY, VinePair, Grub Street,
//          Wine Spectator, Decanter, Reddit r/wine + r/nyc
//
// To add a source: add a tab to SOURCES and an item to PLACEHOLDER_NEWS.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';

// ── Placeholder data ───────────────────────────────────────────
const SOURCES = ['All', 'NY Times', 'NY Post', 'Eater NY', 'VinePair', 'Reddit', 'Grub St.', 'Wine Spec.'];

const PLACEHOLDER_NEWS = [
  { id: 1, emoji: '🗞',  source: 'Eater NY',       sourceColor: '#c0392b', title: 'Best New Wine Bars Opening in NYC This Spring',                              date: '2 hours ago' },
  { id: 2, emoji: '🗽',  source: 'NY Times',        sourceColor: '#1a1a1a', title: 'The Best Wine Bars in NYC Right Now, Ranked',                               date: '4 hours ago' },
  { id: 3, emoji: '🍷',  source: 'VinePair',        sourceColor: '#c0392b', title: '5 Bottles Under $20 That Actually Taste Like $50',                          date: 'Yesterday' },
  { id: 4, emoji: '🤖',  source: 'Reddit · r/wine', sourceColor: '#ff4500', title: '"What\'s a good bottle to bring to a dinner party in NYC for under $30?" — 247 comments', date: '3 hours ago · 892 upvotes' },
  { id: 5, emoji: '📰',  source: 'NY Post',         sourceColor: '#d44000', title: 'NYC\'s Hottest New Wine Bar Opened in the West Village',                    date: 'Yesterday' },
  { id: 6, emoji: '📰',  source: 'Grub St.',        sourceColor: '#888',    title: 'Where to Drink Outside in NYC This Weekend',                               date: '2 days ago' },
  { id: 7, emoji: '🍾',  source: 'Wine Spec.',      sourceColor: '#8e44ad', title: 'Finger Lakes Riesling Is Having Its Moment — Here\'s Why',                  date: '2 days ago' },
  { id: 8, emoji: '🤖',  source: 'Reddit · r/nyc',  sourceColor: '#ff4500', title: '"Best wine shop in Brooklyn with knowledgeable staff?" — 134 comments',    date: '5 hours ago · 441 upvotes' },
];
// ──────────────────────────────────────────────────────────────

export default function NewsSection() {
  const [activeTab, setActiveTab] = useState('All');

  const filtered = activeTab === 'All'
    ? PLACEHOLDER_NEWS
    : PLACEHOLDER_NEWS.filter(n => n.source.includes(activeTab));

  return (
    <section className="news-section" id="sec-news">

      {/* Scrolling ticker */}
      <div className="news-ticker">
        <span className="ticker-badge">Wine News</span>
        <span className="ticker-text">
          Best Natural Wine Bars Opening in NYC · Finger Lakes Wins Gold · 5 Bottles Under $20 ·
          Reddit: What wine for a first date? · NYT: The Best Bottles of 2025…
        </span>
      </div>

      {/* Source filter tabs */}
      <div className="news-source-tabs">
        {SOURCES.map(s => (
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
        {filtered.map(item => (
          <div key={item.id} className="news-card">
            <div className="news-card-emoji">{item.emoji}</div>
            <div>
              <div className="news-card-source" style={{ color: item.sourceColor }}>{item.source}</div>
              <div className="news-card-title">{item.title}</div>
              <div className="news-card-date">{item.date}</div>
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}
