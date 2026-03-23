// components/SocialSection.jsx 
// ─────────────────────────────────────────────────────────────
// Modular social feed grid. 2-column layout; Reddit spans full width.
//
// Each platform card is self-contained.
// To go live: replace the placeholder body inside each card with
// the real embed script from that platform. Config details are
// commented in each card.
//
// To add a new platform: copy one <div className="social-card"> block.
// ─────────────────────────────────────────────────────────────

export default function SocialSection() {
  return (
    <section className="social-section" id="sec-social">

      {/* Header */}
      <div className="social-section-header">
        <div className="section-header-title">📸 NYC Wine Community</div>
        <a href="https://instagram.com/nycwine" className="see-all-link" target="_blank" rel="noopener noreferrer">
          Follow us →
        </a>
      </div>

      <div className="social-grid">

        {/* ── Facebook ─────────────────────────────────────────
            Live: paste Meta Page Plugin iframe/script here.
            Config: NEXT_PUBLIC_FACEBOOK_PAGE_ID in .env.local
        ────────────────────────────────────────────────────── */}
        <div className="social-card">
          <div className="sc-header sc-fb">
            <div className="sc-platform">📘 Facebook</div>
            <a href="https://facebook.com/NYCWine" className="sc-follow" target="_blank" rel="noopener noreferrer">NYCWine →</a>
          </div>
          <div className="sc-body">
            <div className="social-post">
              <div className="sp-handle">NYCWine</div>
              <div className="sp-text">This weekend: natural wine pop-up in Tribeca 🍷 Don&apos;t miss it <span className="sp-tag">#nycwine</span></div>
              <div className="sp-meta">2h ago · 34 likes</div>
            </div>
            <div className="social-post">
              <div className="sp-handle">NYCWine</div>
              <div className="sp-text">Best patio wine bars for spring in NYC — our top picks are live on the site</div>
              <div className="sp-meta">Yesterday · 61 likes</div>
            </div>
          </div>
          <div className="sc-footer">Live via Facebook Page Plugin · configure FACEBOOK_PAGE_ID in .env.local</div>
        </div>

        {/* ── X / Twitter ──────────────────────────────────────
            Live: paste X Timeline embed script here.
            No API key needed — uses public embed.
            Get embed code at: publish.twitter.com
        ────────────────────────────────────────────────────── */}
        <div className="social-card">
          <div className="sc-header sc-x">
            <div className="sc-platform">𝕏 Twitter / X</div>
            <a href="https://twitter.com/nycwine" className="sc-follow" target="_blank" rel="noopener noreferrer">@nycwine →</a>
          </div>
          <div className="sc-body">
            <div className="social-post">
              <div className="sp-handle">@nycwine</div>
              <div className="sp-text">Finger Lakes Riesling is having a moment. Here&apos;s why it belongs in every NYC wine lover&apos;s rotation 🍾</div>
              <div className="sp-meta">3h ago · 28 RTs</div>
            </div>
            <div className="social-post">
              <div className="sp-handle">@nycwine</div>
              <div className="sp-text">New wine bar alert: Coravin just opened on the Lower East Side and it&apos;s stunning</div>
              <div className="sp-meta">Yesterday · 19 RTs</div>
            </div>
          </div>
          <div className="sc-footer">Live via X Timeline Embed · free, no API key needed · publish.twitter.com</div>
        </div>

        {/* ── Pinterest ────────────────────────────────────────
            Live: replace pin-grid with Elfsight Pinterest widget.
            Config: NEXT_PUBLIC_ELFSIGHT_PINTEREST_ID in .env.local
            Cost: ~$5/mo via Elfsight
        ────────────────────────────────────────────────────── */}
        <div className="social-card">
          <div className="sc-header sc-pin">
            <div className="sc-platform">📌 Pinterest</div>
            <a href="https://pinterest.com/nycwine" className="sc-follow" target="_blank" rel="noopener noreferrer">nycwine →</a>
          </div>
          <div className="sc-body">
            <div className="pin-grid">
              <div className="pin-cell">🍷</div>
              <div className="pin-cell">🥂</div>
              <div className="pin-cell">🍇</div>
              <div className="pin-cell">🍾</div>
            </div>
          </div>
          <div className="sc-footer">Live via Elfsight Pinterest widget · ~$5/mo · set ELFSIGHT_PINTEREST_ID</div>
        </div>

        {/* ── Instagram ────────────────────────────────────────
            Live: replace ig-grid with Elfsight Instagram widget.
            Config: NEXT_PUBLIC_ELFSIGHT_IG_ID in .env.local
            Cost: ~$5/mo via Elfsight
        ────────────────────────────────────────────────────── */}
        <div className="social-card">
          <div className="sc-header sc-ig">
            <div className="sc-platform">📸 Instagram</div>
            <a href="https://instagram.com/nycwine" className="sc-follow" target="_blank" rel="noopener noreferrer">@nycwine →</a>
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
          <div className="sc-footer">Live via Elfsight Instagram widget · ~$5/mo · set ELFSIGHT_IG_ID</div>
        </div>

        {/* ── Reddit (full width) ──────────────────────────────
            Live: fetch from Reddit API (free tier).
            Queries: r/wine + r/nyc filtered for wine content.
            Config: REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET
        ────────────────────────────────────────────────────── */}
        <div className="social-card full-width">
          <div className="sc-header sc-reddit">
            <div className="sc-platform">🤖 Reddit — What NYC is asking about wine</div>
            <a href="https://reddit.com/r/wine" className="sc-follow" target="_blank" rel="noopener noreferrer">r/wine →</a>
          </div>
          <div className="reddit-posts">
            <div className="reddit-post">
              <div className="reddit-sub">r/wine</div>
              <div className="reddit-title">&ldquo;Best bottle to bring to a dinner party in NYC for under $30?&rdquo;</div>
              <div className="reddit-meta">892 upvotes · 247 comments</div>
            </div>
            <div className="reddit-post">
              <div className="reddit-sub">r/nyc</div>
              <div className="reddit-title">&ldquo;Best wine shop in Brooklyn with knowledgeable staff?&rdquo;</div>
              <div className="reddit-meta">441 upvotes · 134 comments</div>
            </div>
          </div>
          <div className="sc-footer">Live via Reddit API · free tier · r/wine + r/nyc filtered for NYC wine content</div>
        </div>

      </div>
    </section>
  );
}
