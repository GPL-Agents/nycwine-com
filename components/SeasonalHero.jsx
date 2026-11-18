// components/SeasonalHero.jsx
// ─────────────────────────────────────────────────────────────
// Small swappable seasonal promo band. Content lives in
// data/seasonal-hero.js; this file is layout only.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import promo from '../data/seasonal-hero';

function isExpired(p) {
  return Boolean(p && p.end && Date.now() > new Date(p.end).getTime());
}

export default function SeasonalHero() {
  // Server render uses build-time date; re-check on the client so a
  // stale build never shows an expired promo.
  const [hidden, setHidden] = useState(!promo || !promo.active || isExpired(promo));
  useEffect(() => { if (isExpired(promo)) setHidden(true); }, []);
  if (hidden) return null;

  const { theme = {}, image, eyebrow, headline, blurb, cta, partner } = promo;

  return (
    <section
      className={`seasonal-hero${theme.pattern ? ` sh-pattern-${theme.pattern}` : ''}`}
      aria-label={eyebrow || 'Seasonal feature'}
      style={{ '--sh-bg': theme.bg, '--sh-text': theme.text, '--sh-accent': theme.accent }}
    >
      <div className="sh-inner">
        {image && (
          <a className="sh-media" href={cta?.href}>
            <img src={image.src} alt={image.alt} width={1200} height={800} />
          </a>
        )}

        <div className="sh-copy">
          {eyebrow && <div className="sh-eyebrow">{eyebrow}</div>}
          {headline && <h2 className="sh-headline">{headline}</h2>}
          {blurb && <p className="sh-blurb">{blurb}</p>}
          {cta && (
            <a className="sh-cta" href={cta.href}>
              {cta.label} <span aria-hidden="true">&rarr;</span>
            </a>
          )}
        </div>

        {partner && (
          <aside className="sh-partner" aria-label={`${partner.name} offers`}>
            <div className="sh-partner-tag">Partner</div>
            <div className="sh-partner-heading">{partner.heading}</div>
            <div className="sh-partner-links">
              {partner.links?.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="sponsored noopener">{l.label}</a>
              ))}
            </div>
            {partner.deals?.length > 0 && (
              <ul className="sh-deals">
                {partner.deals.map((d) => (
                  <li key={d.code}>
                    <a href={d.href} target="_blank" rel="sponsored noopener">
                      <span className="sh-code">{d.code}</span>
                      <span className="sh-deal-text">{d.text}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {partner.allDeals && (
              <a className="sh-all-deals" href={partner.allDeals.href} target="_blank" rel="sponsored noopener">
                {partner.allDeals.label} <span aria-hidden="true">&rarr;</span>
              </a>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}
