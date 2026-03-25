// components/SocialSection.jsx
// ─────────────────────────────────────────────────────────────
// Social feed grid — community wine content from multiple sources.
//
// Order: Instagram, Reddit (NYC Wine), Reddit (r/wine), X, Pinterest, Facebook
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';

function RedditGrid({ posts, loading, emptyMsg }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [posts, loading, checkScroll]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className="reddit-carousel-wrap">
      {canScrollLeft && (
        <button
          className="reddit-arrow reddit-arrow-left"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          &#8249;
        </button>
      )}
      <div className="reddit-carousel" ref={scrollRef}>
        {loading && (
          <div className="reddit-card">
            <div className="reddit-title">Loading…</div>
          </div>
        )}
        {!loading && posts.length === 0 && (
          <div className="reddit-card">
            <div className="reddit-title">{emptyMsg}</div>
          </div>
        )}
        {posts.slice(0, 10).map((post, i) => (
          <a
            key={i}
            className="reddit-card"
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="reddit-sub">{post.subreddit}</div>
            <div className="reddit-title">{post.title}</div>
            <div className="reddit-meta">
              {post.score.toLocaleString()} pts · {post.comments.toLocaleString()} comments · {post.ago}
            </div>
          </a>
        ))}
      </div>
      {canScrollRight && (
        <button
          className="reddit-arrow reddit-arrow-right"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          &#8250;
        </button>
      )}
    </div>
  );
}

export default function SocialSection() {
  const [winePosts, setWinePosts] = useState([]);
  const [nycPosts, setNycPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reddit')
      .then((res) => res.json())
      .then((data) => {
        // New format: { wine: [...], nyc: [...] }
        if (data && !Array.isArray(data)) {
          if (Array.isArray(data.wine)) setWinePosts(data.wine);
          if (Array.isArray(data.nyc)) setNycPosts(data.nyc);
        }
        // Legacy format: flat array (fallback)
        if (Array.isArray(data)) {
          setWinePosts(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section className="social-section" id="sec-social">

      {/* Header */}
      <div className="social-section-header">
        <div className="section-header-title">NYC Wine Social</div>
      </div>

      <div className="social-grid">

        {/* ── 1. Instagram (Elfsight Social Feed widget) ──────────── */}
        <div className="social-card full-width">
          <div className="sc-header sc-ig">
            <svg className="sc-brand-icon" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ig" r="150%" cx="30%" cy="107%"><stop offset="0" stopColor="#fdf497"/><stop offset=".05" stopColor="#fdf497"/><stop offset=".45" stopColor="#fd5949"/><stop offset=".6" stopColor="#d6249f"/><stop offset=".9" stopColor="#285AEB"/></radialGradient></defs><path d="M7.75 2h8.5A5.75 5.75 0 0122 7.75v8.5A5.75 5.75 0 0116.25 22h-8.5A5.75 5.75 0 012 16.25v-8.5A5.75 5.75 0 017.75 2zm0 1.5A4.25 4.25 0 003.5 7.75v8.5A4.25 4.25 0 007.75 20.5h8.5a4.25 4.25 0 004.25-4.25v-8.5A4.25 4.25 0 0016.25 3.5h-8.5zM12 7a5 5 0 110 10 5 5 0 010-10zm0 1.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm5.25-2.5a1 1 0 110 2 1 1 0 010-2z" fill="url(#ig)"/></svg>
            <div className="sc-platform">Instagram · #nycwine</div>
            <a href="https://www.instagram.com/explore/tags/nycwine/" className="sc-follow" target="_blank" rel="noopener noreferrer">#nycwine →</a>
          </div>
          <div className="sc-body elfsight-body">
            <div className="elfsight-app-5c219adb-d249-478a-a3da-e1d087a08843" data-elfsight-app-lazy></div>
          </div>
        </div>

        {/* ── 2. Reddit — NYC Wine Discussions ────────────────────── */}
        <div className="social-card full-width">
          <div className="sc-header sc-reddit">
            <svg className="sc-brand-icon" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.066 13.612c.037.2.057.406.057.613 0 3.132-3.646 5.672-8.143 5.672s-8.143-2.54-8.143-5.672c0-.207.02-.413.057-.613A1.533 1.533 0 011.5 12.1a1.533 1.533 0 012.611-1.086c1.44-1.037 3.42-1.703 5.626-1.779l.946-4.452a.345.345 0 01.411-.264l3.147.668a1.09 1.09 0 012.044.5 1.09 1.09 0 01-2.106.395l-2.8-.595-.85 3.985c2.183.087 4.14.753 5.564 1.778A1.533 1.533 0 0118.066 13.612zM8.25 13.125a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm6.622 2.799a4.702 4.702 0 01-3.372 1.026 4.702 4.702 0 01-3.372-1.026.375.375 0 01.53-.53c.767.646 2.087.87 2.842.87s2.075-.224 2.842-.87a.375.375 0 01.53.53zM14.625 14.25a1.125 1.125 0 110-2.25 1.125 1.125 0 010 2.25z" fill="#FF4500"/></svg>
            <div className="sc-platform">Reddit — NYC Wine Discussions</div>
            <a href="https://www.reddit.com/search/?q=nyc+wine" className="sc-follow" target="_blank" rel="noopener noreferrer">Search Reddit →</a>
          </div>
          <RedditGrid
            posts={nycPosts}
            loading={loading}
            emptyMsg="No NYC wine discussions found right now."
          />
        </div>

        {/* ── 3. Reddit — r/wine (general) ───────────────────────── */}
        <div className="social-card full-width">
          <div className="sc-header sc-reddit">
            <svg className="sc-brand-icon" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.066 13.612c.037.2.057.406.057.613 0 3.132-3.646 5.672-8.143 5.672s-8.143-2.54-8.143-5.672c0-.207.02-.413.057-.613A1.533 1.533 0 011.5 12.1a1.533 1.533 0 012.611-1.086c1.44-1.037 3.42-1.703 5.626-1.779l.946-4.452a.345.345 0 01.411-.264l3.147.668a1.09 1.09 0 012.044.5 1.09 1.09 0 01-2.106.395l-2.8-.595-.85 3.985c2.183.087 4.14.753 5.564 1.778A1.533 1.533 0 0118.066 13.612zM8.25 13.125a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm6.622 2.799a4.702 4.702 0 01-3.372 1.026 4.702 4.702 0 01-3.372-1.026.375.375 0 01.53-.53c.767.646 2.087.87 2.842.87s2.075-.224 2.842-.87a.375.375 0 01.53.53zM14.625 14.25a1.125 1.125 0 110-2.25 1.125 1.125 0 010 2.25z" fill="#FF4500"/></svg>
            <div className="sc-platform">Reddit — r/wine</div>
            <a href="https://reddit.com/r/wine" className="sc-follow" target="_blank" rel="noopener noreferrer">r/wine →</a>
          </div>
          <RedditGrid
            posts={winePosts}
            loading={loading}
            emptyMsg="No wine discussions found right now."
          />
        </div>

        {/* ── 4–6. Social links + ad sidebar ─────────────────────── */}
        <div className="social-links-row">
          <div className="social-links-col">

            {/* ── 4. X / Twitter List — "NYC Wine Scene" ────────────── */}
            <div className="social-card full-width">
              <div className="sc-header sc-x">
                <svg className="sc-brand-icon" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white"/></svg>
                <div className="sc-platform">X · @NYCWineReport</div>
                <a href="https://x.com/i/lists/2036448383569625436" className="sc-follow" target="_blank" rel="noopener noreferrer">View list →</a>
              </div>
              <div className="sc-body">
                <a
                  href="https://x.com/i/lists/2036448383569625436"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link-card"
                >
                  <div className="slc-icon slc-icon-x">
                    <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#000"/>
                    </svg>
                  </div>
                  <div className="slc-content">
                    <div className="slc-title">NYC Wine Scene</div>
                    <div className="slc-desc">A curated list of NYC wine writers, sommeliers, bars, and shops.</div>
                  </div>
                  <div className="slc-arrow">&rsaquo;</div>
                </a>
              </div>
            </div>

            {/* ── 5. Pinterest NYC Wine ────────────────────────────── */}
            <div className="social-card full-width">
              <div className="sc-header sc-pin">
                <svg className="sc-brand-icon" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.236 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.182-.78 1.172-4.97 1.172-4.97s-.299-.598-.299-1.482c0-1.388.805-2.425 1.808-2.425.852 0 1.264.64 1.264 1.408 0 .858-.546 2.14-.828 3.33-.236.995.499 1.806 1.48 1.806 1.778 0 3.144-1.874 3.144-4.58 0-2.393-1.72-4.068-4.177-4.068-2.845 0-4.515 2.135-4.515 4.34 0 .859.331 1.781.745 2.282a.3.3 0 01.069.288l-.278 1.133c-.044.183-.145.222-.335.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.965-.527-2.291-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#E60023"/></svg>
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
                  <div className="slc-icon slc-icon-pinterest">
                    <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.236 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.182-.78 1.172-4.97 1.172-4.97s-.299-.598-.299-1.482c0-1.388.805-2.425 1.808-2.425.852 0 1.264.64 1.264 1.408 0 .858-.546 2.14-.828 3.33-.236.995.499 1.806 1.48 1.806 1.778 0 3.144-1.874 3.144-4.58 0-2.393-1.72-4.068-4.177-4.068-2.845 0-4.515 2.135-4.515 4.34 0 .859.331 1.781.745 2.282a.3.3 0 01.069.288l-.278 1.133c-.044.183-.145.222-.335.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.965-.527-2.291-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#E60023"/>
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

            {/* ── 6. Facebook — NYCWineReport ───────────────────────── */}
            <div className="social-card full-width">
              <div className="sc-header sc-fb">
                <svg className="sc-brand-icon" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z" fill="#1877F2"/></svg>
                <div className="sc-platform">Facebook · @NYCWine</div>
                <a href="https://www.facebook.com/NYCWine" className="sc-follow" target="_blank" rel="noopener noreferrer">Follow →</a>
              </div>
              <div className="sc-body">
                <a
                  href="https://www.facebook.com/NYCWine"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link-card"
                >
                  <div className="slc-icon slc-icon-fb">
                    <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z" fill="#1877F2"/>
                    </svg>
                  </div>
                  <div className="slc-content">
                    <div className="slc-title">NYC Wine Report</div>
                    <div className="slc-desc">Wine news, events, and community updates from New York City.</div>
                  </div>
                  <div className="slc-arrow">&rsaquo;</div>
                </a>
              </div>
            </div>

          </div>

          {/* ── In-feed ad unit ────── */}
          <div className="social-ad-sidebar">
            <div className="ad-placeholder ad-infeed" style={{ width: '100%' }}>
              <span className="ad-placeholder-label">In-feed Ad</span>
            </div>
            {/* AdSense in-feed ad — uncomment once site is approved:
            <ins className="adsbygoogle"
              style={{ display: 'block' }}
              data-ad-format="fluid"
              data-ad-layout-key="-fb+5w+4e-db+86"
              data-ad-client="ca-pub-6782277104310503"
              data-ad-slot="2849490464"
            />
            */}
          </div>
        </div>

      </div>
    </section>
  );
}
