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

// TODO: Uncomment InFeedAd once Google AdSense is approved
// function InFeedAd() {
//   const adRef = useRef(null);
//   const pushed = useRef(false);
//
//   useEffect(() => {
//     if (!pushed.current && adRef.current && typeof window !== 'undefined') {
//       try {
//         (window.adsbygoogle = window.adsbygoogle || []).push({});
//         pushed.current = true;
//       } catch (e) {
//         console.warn('AdSense push error:', e);
//       }
//     }
//   }, []);
//
//   return (
//     <div className="news-card-ad">
//       <ins
//         className="adsbygoogle"
//         style={{ display: 'block' }}
//         data-ad-format="fluid"
//         data-ad-layout-key="-fu+19-4-tz+1j5"
//         data-ad-client="ca-pub-6782277104310503"
//         data-ad-slot="2794449877"
//         ref={adRef}
//       />
//     </div>
//   );
// }

// ── Featured Venues data ─────────────────────────────────────
// Venues sourced from The Infatuation's Best Wine Bars in NYC guide.
// Ratings and details from theinfatuation.com.
const FEATURED_VENUES = [
  {
    name: 'Penny',
    neighborhood: 'East Village',
    address: '90 E 10th St',
    rating: '9.4',
    url: 'https://www.theinfatuation.com/new-york/reviews/penny',
    image: '/images/venues/NYC_Penny_BNRMarketing_KatePrevite_00001_1_eqtzul.avif',
  },
  {
    name: 'Place des Fêtes',
    neighborhood: 'Clinton Hill',
    address: '212 Greene Ave',
    rating: '8.7',
    url: 'https://www.theinfatuation.com/new-york/reviews/place-des-fetes',
    image: '/images/venues/NYC_PlaceDesFêtes_GroupShot_EmilySchindler_03_me7oze.avif',
  },
  {
    name: 'The Four Horsemen',
    neighborhood: 'Williamsburg',
    address: '295 Grand St',
    rating: '8.8',
    url: 'https://www.theinfatuation.com/new-york/reviews/four-horsemen',
    image: '/images/venues/NYC_FourHorsemen_FoodGroup_KatePrevite_00001_amaolg.avif',
  },
  {
    name: 'Claud',
    neighborhood: 'East Village',
    address: '90 E 10th St',
    rating: '8.6',
    url: 'https://www.theinfatuation.com/new-york/reviews/claud',
    image: '/images/venues/NYC_Claud_Interior_EmilySchindler_01_aogl1u.avif',
  },
  {
    name: 'Wildair',
    neighborhood: 'Lower East Side',
    address: '142 Orchard St',
    rating: '8.6',
    url: 'https://www.theinfatuation.com/new-york/reviews/wildair',
    image: '/images/venues/NYC_Wildair_FoodGroup_KatePrevite_00001_vpaplo.avif',
  },
];

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

  return (
    <section className="news-section" id="sec-news">

      {/* Pink ribbon — label only */}
      <div className="news-ticker">
        <span className="ticker-badge">Wine News</span>
      </div>

      {/* Two-column layout */}
      <div className="news-layout">

        {/* Left column: source tabs + article list */}
        <div className="news-main">
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
                {/* In-feed ad after 3rd and 8th articles (uncomment when AdSense approved) */}
                {/* {i === 3 && <InFeedAd />} */}
                {/* {i === 8 && <InFeedAd />} */}
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
        </div>

        {/* Right column: Featured Venues */}
        <aside className="featured-venues-sidebar">
          <div className="featured-venues-heading">Featured Venues</div>
          {FEATURED_VENUES.map((venue, i) => (
            <a
              key={i}
              href={venue.url}
              className="featured-venue-item"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={venue.image}
                alt={venue.name}
                loading="lazy"
                onError={(e) => { e.target.parentElement.style.display = 'none'; }}
              />
              <div className="featured-venue-label">
                <div className="featured-venue-meta">
                  <span className="featured-venue-neighborhood">{venue.neighborhood}</span>
                  <span className="featured-venue-rating">★ {venue.rating}</span>
                </div>
                <div className="featured-venue-name">{venue.name}</div>
                <div className="featured-venue-address">{venue.address}</div>
              </div>
            </a>
          ))}
          <div className="featured-venues-credit">
            Curated by{' '}
            <a
              href="https://www.theinfatuation.com/new-york/guides/wine-bars-nyc"
              target="_blank"
              rel="noopener noreferrer"
            >
              The Infatuation
            </a>
          </div>
        </aside>

      </div>
    </section>
  );
}
