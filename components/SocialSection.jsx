// components/SocialSection.jsx
// ─────────────────────────────────────────────────────────────
// Social feed grid — community wine content from multiple sources.
//
// LIVE:
//   - X/Twitter List link card ("NYC Wine Scene")
//   - X/Twitter account link card (@NYCWineReport)
//   - Instagram photo grid (via Instagram Graph API)
//   - Reddit wine discussions (public JSON feeds)
//
// Instagram: fetches from /api/instagram which uses the Graph API.
// Until credentials are configured, shows a link card fallback.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';

export default function SocialSection() {
  const [redditPosts, setRedditPosts] = useState([]);
  const [redditLoading, setRedditLoading] = useState(true);
  const [igPhotos, setIgPhotos] = useState([]);
  const [igLoading, setIgLoading] = useState(true);

  // Load Reddit posts
  useEffect(() => {
    fetch('/api/reddit')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRedditPosts(data);
        setRedditLoading(false);
      })
      .catch(() => setRedditLoading(false));
  }, []);

  // Load Instagram photos
  useEffect(() => {
    fetch('/api/instagram')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setIgPhotos(data);
        setIgLoading(false);
      })
      .catch(() => setIgLoading(false));
  }, []);

  return (
    <section className="social-section" id="sec-social">

      {/* Header */}
      <div className="social-section-header">
        <div className="section-header-title">NYC Wine Community</div>
        <a href="https://twitter.com/NYCWineReport" className="see-all-link" target="_blank" rel="noopener noreferrer">
          Follow @NYCWineReport →
        </a>
      </div>

      <div className="social-grid">

        {/* ── X / Twitter List — "NYC Wine Scene" ──────────────── */}
        <div className="social-card">
          <div className="sc-header sc-x">
            <div className="sc-platform">NYC Wine Scene</div>
            <a href="https://x.com/i/lists/2036448383569625436" className="sc-follow" target="_blank" rel="noopener noreferrer">View list →</a>
          </div>
          <div className="sc-body">
            <a
              href="https://x.com/i/lists/2036448383569625436"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link-card"
            >
              <div className="slc-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>
                </svg>
              </div>
              <div className="slc-content">
                <div className="slc-title">NYC Wine Scene</div>
                <div className="slc-desc">A curated list of NYC wine writers, sommeliers, bars, and shops. Follow the conversation.</div>
              </div>
              <div className="slc-arrow">&rsaquo;</div>
            </a>
          </div>
        </div>

        {/* ── X / Twitter @NYCWineReport ───────────────────────── */}
        <div className="social-card">
          <div className="sc-header sc-x">
            <div className="sc-platform">@NYCWineReport</div>
            <a href="https://twitter.com/NYCWineReport" className="sc-follow" target="_blank" rel="noopener noreferrer">Follow →</a>
          </div>
          <div className="sc-body">
            <a
              href="https://twitter.com/NYCWineReport"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link-card"
            >
              <div className="slc-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>
                </svg>
              </div>
              <div className="slc-content">
                <div className="slc-title">@NYCWineReport</div>
                <div className="slc-desc">Wine events, tastings, and news from around New York City. Follow for updates.</div>
              </div>
              <div className="slc-arrow">&rsaquo;</div>
            </a>
          </div>
        </div>

        {/* ── Instagram #nycwinereport — photo grid ──────────────
            Fetches from /api/instagram (Graph API).
            Falls back to link card if no photos available yet.
        ────────────────────────────────────────────────────── */}
        <div className="social-card full-width">
          <div className="sc-header sc-ig">
            <div className="sc-platform">Instagram · #nycwinereport</div>
            <a href="https://www.instagram.com/explore/tags/nycwinereport/" className="sc-follow" target="_blank" rel="noopener noreferrer">#nycwinereport →</a>
          </div>
          {igPhotos.length > 0 ? (
            <div className="ig-photo-grid">
              {igPhotos.slice(0, 6).map((photo) => (
                <a
                  key={photo.id}
                  href={photo.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ig-photo-cell"
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.caption || 'NYC wine photo'}
                    loading="lazy"
                  />
                  <div className="ig-photo-overlay">
                    <span className="ig-photo-caption">{photo.caption}</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="sc-body">
              <a
                href="https://www.instagram.com/explore/tags/nycwinereport/"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link-card"
              >
                <div className="slc-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/>
                  </svg>
                </div>
                <div className="slc-content">
                  <div className="slc-title">#nycwinereport</div>
                  <div className="slc-desc">
                    {igLoading ? 'Loading photos...' : 'Community photos of wine moments around NYC. Browse the tag on Instagram.'}
                  </div>
                </div>
                <div className="slc-arrow">&rsaquo;</div>
              </a>
            </div>
          )}
        </div>

        {/* ── Pinterest NYC Wine ──────────────────────────────── */}
        <div className="social-card full-width">
          <div className="sc-header sc-pin">
            <div className="sc-platform">Pinterest · NYC Wine</div>
            <a href="https://pinterest.com/search/pins/?q=nyc+wine" className="sc-follow" target="_blank" rel="noopener noreferrer">Explore →</a>
          </div>
          <div className="sc-body">
            <a
              href="https://pinterest.com/search/pins/?q=nyc+wine"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link-card"
            >
              <div className="slc-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.236 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.182-.78 1.172-4.97 1.172-4.97s-.299-.598-.299-1.482c0-1.388.805-2.425 1.808-2.425.852 0 1.264.64 1.264 1.408 0 .858-.546 2.14-.828 3.33-.236.995.499 1.806 1.48 1.806 1.778 0 3.144-1.874 3.144-4.58 0-2.393-1.72-4.068-4.177-4.068-2.845 0-4.515 2.135-4.515 4.34 0 .859.331 1.781.745 2.282a.3.3 0 01.069.288l-.278 1.133c-.044.183-.145.222-.335.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.965-.527-2.291-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="currentColor"/>
                </svg>
              </div>
              <div className="slc-content">
                <div className="slc-title">NYC Wine</div>
                <div className="slc-desc">Wine bars, bottles, and inspiration from NYC. Explore pins and boards.</div>
              </div>
              <div className="slc-arrow">&rsaquo;</div>
            </a>
          </div>
        </div>

        {/* ── Reddit (full width, LIVE) ────────────────────────── */}
        <div className="social-card full-width">
          <div className="sc-header sc-reddit">
            <div className="sc-platform">Reddit — Wine Discussions</div>
            <a href="https://reddit.com/r/wine" className="sc-follow" target="_blank" rel="noopener noreferrer">r/wine →</a>
          </div>
          <div className="reddit-posts">
            {redditLoading && (
              <div className="reddit-post">
                <div className="reddit-title">Loading wine discussions…</div>
              </div>
            )}
            {!redditLoading && redditPosts.length === 0 && (
              <div className="reddit-post">
                <div className="reddit-title">No wine discussions found right now.</div>
              </div>
            )}
            {redditPosts.slice(0, 5).map((post, i) => (
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
        </div>

      </div>
    </section>
  );
}
