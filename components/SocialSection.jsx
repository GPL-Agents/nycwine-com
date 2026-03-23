// components/SocialSection.jsx
// ─────────────────────────────────────────────────────────────
// Social feed grid — community content only ("hub not publisher").
//
// Active cards:
//   - Reddit (live API, full width) — wine discussions from r/wine, r/nyc
//   - Instagram #nycwine (Elfsight widget placeholder) — community photos
//   - Pinterest (Elfsight widget placeholder) — community pins
//
// Removed:
//   - Facebook — Page Plugin only shows our own posts
//   - X/Twitter — Timeline embed only shows our own tweets
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';

export default function SocialSection() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    fetch('/api/reddit')
      .then((res) => res.json())
      .then((data) => {
        if (data.needsSetup) {
          setNeedsSetup(true);
        } else if (Array.isArray(data)) {
          setPosts(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section className="social-section" id="sec-social">

      {/* Header */}
      <div className="social-section-header">
        <div className="section-header-title">📸 NYC Wine Community</div>
        <a href="https://reddit.com/r/wine" className="see-all-link" target="_blank" rel="noopener noreferrer">
          See more →
        </a>
      </div>

      <div className="social-grid">

        {/* ── Instagram #nycwine (Elfsight widget) ─────────────
            Placeholder until Elfsight account is set up.
            Shows community photos tagged #nycwine.
            Config: NEXT_PUBLIC_ELFSIGHT_IG_ID in .env.local
        ────────────────────────────────────────────────────── */}
        <div className="social-card">
          <div className="sc-header sc-ig">
            <div className="sc-platform">📸 Instagram · #nycwine</div>
            <a href="https://www.instagram.com/explore/tags/nycwine/" className="sc-follow" target="_blank" rel="noopener noreferrer">#nycwine →</a>
          </div>
          <div className="sc-body">
            <div className="ig-grid">
              {['🍷','🥂','🍇','🌆','🍾','🗽','🌿','✨','🎉'].map((em, i) => (
                <div key={i} className="ig-cell">
                  {em}
                  <span className="ig-hashtag">#nycwine</span>
                </div>
              ))}
            </div>
          </div>
          <div className="sc-footer">Community photos · Elfsight widget · coming soon</div>
        </div>

        {/* ── Pinterest "NYC wine" (Elfsight widget) ───────────
            Placeholder until Elfsight account is set up.
            Shows community pins about NYC wine.
            Config: NEXT_PUBLIC_ELFSIGHT_PINTEREST_ID in .env.local
        ────────────────────────────────────────────────────── */}
        <div className="social-card">
          <div className="sc-header sc-pin">
            <div className="sc-platform">📌 Pinterest · NYC Wine</div>
            <a href="https://pinterest.com/search/pins/?q=nyc+wine" className="sc-follow" target="_blank" rel="noopener noreferrer">Explore →</a>
          </div>
          <div className="sc-body">
            <div className="pin-grid">
              <div className="pin-cell">🍷</div>
              <div className="pin-cell">🥂</div>
              <div className="pin-cell">🍇</div>
              <div className="pin-cell">🍾</div>
            </div>
          </div>
          <div className="sc-footer">Community pins · Elfsight widget · coming soon</div>
        </div>

        {/* ── Reddit (full width, LIVE) ────────────────────────
            Fetches from /api/reddit — wine posts from
            r/wine, r/nyc, r/FoodNYC sorted by popularity.
            Requires REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET
        ────────────────────────────────────────────────────── */}
        <div className="social-card full-width">
          <div className="sc-header sc-reddit">
            <div className="sc-platform">🤖 Reddit — What NYC is asking about wine</div>
            <a href="https://reddit.com/r/wine" className="sc-follow" target="_blank" rel="noopener noreferrer">r/wine →</a>
          </div>
          <div className="reddit-posts">
            {loading && (
              <div className="reddit-post">
                <div className="reddit-title">Loading wine discussions…</div>
              </div>
            )}
            {needsSetup && (
              <div className="reddit-post">
                <div className="reddit-title">Reddit API credentials needed — add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET to .env.local</div>
              </div>
            )}
            {!loading && !needsSetup && posts.length === 0 && (
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
          <div className="sc-footer">Live via Reddit API · r/wine + r/nyc + r/FoodNYC</div>
        </div>

      </div>
    </section>
  );
}
