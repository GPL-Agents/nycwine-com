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
const FEATURED_VENUES = [
  {
    name: 'Penny',
    neighborhood: 'East Village',
    address: '90 E 10th St',
    rating: '9.4',
    excerpt: 'This breezy wine bar in the East Village serves exceptional seafood.',
    url: 'https://www.theinfatuation.com/new-york/reviews/penny',
    image: '/images/venues/NYC_Penny_BNRMarketing_KatePrevite_00001_1_eqtzul.avif',
  },
  {
    name: 'Place des Fêtes',
    neighborhood: 'Clinton Hill',
    address: '212 Greene Ave',
    rating: '8.7',
    excerpt: 'This Clinton Hill wine bar from the team behind Oxalis serves impressive small plates in an unreasonably pleasant space.',
    url: 'https://www.theinfatuation.com/new-york/reviews/place-des-fetes',
    image: '/images/venues/NYC_PlaceDesFetes_GroupShot_EmilySchindler_03_me7oze.avif',
  },
  {
    name: 'The Four Horsemen',
    neighborhood: 'Williamsburg',
    address: '295 Grand St',
    rating: '8.8',
    excerpt: 'Everyone does small plates and natural wine. Williamsburg wine bar The Four Horsemen does them better.',
    url: 'https://www.theinfatuation.com/new-york/reviews/four-horsemen',
    image: '/images/venues/NYC_FourHorsemen_FoodGroup_KatePrevite_00001_amaolg.avif',
  },
  {
    name: 'Claud',
    neighborhood: 'East Village',
    address: '90 E 10th St',
    rating: '8.6',
    excerpt: 'A wine bar in the East Village serving delicious riffs on classic European fare.',
    url: 'https://www.theinfatuation.com/new-york/reviews/claud',
    image: '/images/venues/NYC_Claud_Interior_EmilySchindler_01_aogl1u.avif',
  },
  {
    name: 'Wildair',
    neighborhood: 'Lower East Side',
    address: '142 Orchard St',
    rating: '8.6',
    excerpt: 'A casual wine bar on the Lower East Side, attached to the acclaimed tasting menu restaurant Contra.',
    url: 'https://www.theinfatuation.com/new-york/reviews/wildair',
    image: '/images/venues/NYC_Wildair_FoodGroup_KatePrevite_00001_vpaplo.avif',
  },
  {
    name: 'Ruffian',
    neighborhood: 'East Village',
    address: '125 E 7th St',
    rating: '8.8',
    excerpt: 'A tiny wine bar devoted to Eastern European natural wines and bold Mediterranean small plates cooked right behind the bar.',
    url: 'https://www.theinfatuation.com/new-york/reviews/ruffian-wine-bar',
    image: '/images/venues/EmilyS_NYC_Ruffian_09.avif',
  },
  {
    name: "Justine's on Hudson",
    neighborhood: 'West Village',
    address: '518 Hudson St',
    rating: '8.5',
    excerpt: 'A warm, multi-generational wine bistro on Hudson Street serving sophisticated food and interesting bottles.',
    url: 'https://www.theinfatuation.com/new-york/reviews/justines-on-hudson',
    image: '/images/venues/NYC_JustinesOnHudson_Interior_KatePrevite_00002_ctgymu.avif',
  },
  {
    name: 'Parcelle',
    neighborhood: 'Greenwich Village',
    address: '72 MacDougal St',
    rating: '8.5',
    excerpt: 'A mellow Greenwich Village wine bar with 500+ bottles — everything from esoteric naturals to collectible Burgundy.',
    url: 'https://www.theinfatuation.com/new-york/reviews/parcelle-greenwich-village',
    image: '/images/venues/Parcelle2-Seating-Collin.avif',
  },
  {
    name: 'Elvis',
    neighborhood: 'NoHo',
    address: '54 Great Jones St',
    rating: '8.4',
    excerpt: 'A French-inspired natural wine bar in a legendary NoHo space, with cozy chic atmosphere and standout small plates.',
    url: 'https://www.theinfatuation.com/new-york/reviews/elvis',
    image: '/images/venues/Elvis0120_1_2_bo9ytt.avif',
  },
  {
    name: "Di Palo's",
    neighborhood: 'Little Italy',
    address: '200 Grand St',
    rating: '8.6',
    excerpt: 'A legendary Little Italy institution spanning four generations — exceptional Italian wines, cured meats, and artisan cheeses.',
    url: 'https://www.theinfatuation.com/new-york/reviews/di-palos',
    image: '/images/venues/NYC_CDiPalo_Interior_AlexStaniloff-1_r31pbx.avif',
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

        {/* Right column: Sip. Explore. Repeat. */}
        <aside className="featured-venues-sidebar">
          <div className="featured-venues-heading">Sip. Explore. Repeat.</div>
          {FEATURED_VENUES.map((venue, i) => (
            <a
              key={i}
              href={venue.url}
              className="featured-venue-item"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="featured-venue-photo">
                <img
                  src={venue.image}
                  alt={venue.name}
                  loading="lazy"
                  onError={(e) => { e.target.closest('.featured-venue-photo').style.display = 'none'; }}
                />
              </div>
              <div className="featured-venue-body">
                <div className="featured-venue-meta">
                  <span className="featured-venue-neighborhood">{venue.neighborhood}</span>
                  <span className="featured-venue-rating">★ {venue.rating}</span>
                </div>
                <div className="featured-venue-name">{venue.name}</div>
                <div className="featured-venue-excerpt">{venue.excerpt}</div>
                <div className="featured-venue-address">{venue.address}</div>
              </div>
            </a>
          ))}
          <a
            className="featured-venues-credit"
            href="https://www.theinfatuation.com/new-york/guides/wine-bars-nyc"
            target="_blank"
            rel="noopener noreferrer"
          >
            via The Infatuation &rarr;
          </a>
        </aside>

      </div>
    </section>
  );
}
