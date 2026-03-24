// components/SocialSection.jsx
// ─────────────────────────────────────────────────────────────
// Social feed grid — community wine content from multiple sources.
//
// LIVE:
//   - X/Twitter timeline embed (@nycwine) — free, no API key
//   - Reddit wine discussions — /api/reddit (needs credentials)
//
// COMING SOON (need Elfsight ~$5/mo each):
//   - Instagram #nycwine community photos
//   - Pinterest NYC wine community pins
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';

export default function SocialSection() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const twitterRef = useRef(null);

  // Load Reddit posts (uses free public JSON feeds, no API key needed)
  useEffect(() => {
    fetch('/api/reddit')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPosts(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Load X/Twitter embed widget script
  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('twitter-wjs')) {
      const script = document.createElement('script');
      script.id = 'twitter-wjs';
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      document.body.appendChild(script);
    } else if (typeof window !== 'undefined' && window.twttr?.widgets) {
      window.twttr.widgets.load(twitterRef.current);
    }
  }, []);

  return (
    <section className="social-section" id="sec-social">

      {/* Header */}
      <div className="social-section-header">
        <div className="section-header-title">NYC Wine Community</div>
        <a href="https://twitter.com/nycwine" className="see-all-link" target="_blank" rel="noopener noreferrer">
          Follow @nycwine →
        </a>
      </div>

      <div className="social-grid">

        {/* ── X / Twitter Timeline Embed ──────────────────────────
            LIVE: Public timeline embed, no API key needed.
            Uses publish.twitter.com embed markup.
        ────────────────────────────────────────────────────── */}
        <div className="social-card" ref={twitterRef}>
          <div className="sc-header sc-x">
            <div className="sc-platform">𝕏 @nycwine</div>
            <a href="https://twitter.com/nycwine" className="sc-follow" target="_blank" rel="noopener noreferrer">Follow →</a>
          </div>
          <div className="sc-body sc-body-embed" style={{ maxHeight: 400, overflow: 'auto' }}>
            <a
              className="twitter-timeline"
              data-height="400"
              data-width="100%"
              data-chrome="noheader nofooter noborders transparent"
              data-tweet-limit="5"
              href="https://twitter.com/nycwine"
            >
              Loading @nycwine tweets…
            </a>
          </div>
          <div className="sc-footer">Live · X Timeline Embed · free, no API key</div>
        </div>

        {/* ── Instagram #nycwine ─────────────────────────────────
            COMING SOON: Elfsight widget (~$5/mo)
            Shows community photos tagged #nycwine
        ────────────────────────────────────────────────────── */}
        <div className="social-card">
          <div className="sc-header sc-ig">
            <div className="sc-platform">Instagram · #nycwine</div>
            <a href="https://www.instagram.com/explore/tags/nycwine/" className="sc-follow" target="_blank" rel="noopener noreferrer">#nycwine →</a>
          </div>
          <div className="sc-body">
            <div className="social-coming-soon">
              <div className="scs-title">Instagram Feed</div>
              <div className="scs-text">Community photos from #nycwine will appear here. Coming soon via Elfsight widget.</div>
            </div>
          </div>
          <div className="sc-footer">Coming soon · Elfsight Instagram widget · ~$5/mo</div>
        </div>

        {/* ── Pinterest NYC Wine ─────────────────────────────────
            COMING SOON: Elfsight widget (~$5/mo)
            Shows community pins about NYC wine
        ────────────────────────────────────────────────────── */}
        <div className="social-card">
          <div className="sc-header sc-pin">
            <div className="sc-platform">Pinterest · NYC Wine</div>
            <a href="https://pinterest.com/search/pins/?q=nyc+wine" className="sc-follow" target="_blank" rel="noopener noreferrer">Explore →</a>
          </div>
          <div className="sc-body">
            <div className="social-coming-soon">
              <div className="scs-title">Pinterest Feed</div>
              <div className="scs-text">NYC wine pins and boards will appear here. Coming soon via Elfsight widget.</div>
            </div>
          </div>
          <div className="sc-footer">Coming soon · Elfsight Pinterest widget · ~$5/mo</div>
        </div>

        {/* ── Reddit (full width, LIVE) ────────────────────────── */}
        <div className="social-card full-width">
          <div className="sc-header sc-reddit">
            <div className="sc-platform">Reddit — Wine Discussions</div>
            <a href="https://reddit.com/r/wine" className="sc-follow" target="_blank" rel="noopener noreferrer">r/wine →</a>
          </div>
          <div className="reddit-posts">
            {loading && (
              <div className="reddit-post">
                <div className="reddit-title">Loading wine discussions…</div>
              </div>
            )}
            {!loading && posts.length === 0 && (
              <div className="reddit-post">
                <div className="reddit-title">No wine discussions found right now.</div>
              </div>
            )}
            {posts.slice(0, 5).map((post, i) => (
              <a
                key={i}
                className="reddit-post"
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <div className="reddit-sub">{post.subreddit}</div>
                <div className="reddit-title">{post.title}</div>
                <div className="reddit-meta">
                  {post.score.toLocaleString()} upvotes · {post.comments.toLocaleString()} comments · {post.ago}
                </div>
              </a>
            ))}
          </div>
          <div className="sc-footer">Live · r/wine + r/nyc + r/FoodNYC · no API key needed</div>
        </div>

      </div>
    </section>
  );
}
