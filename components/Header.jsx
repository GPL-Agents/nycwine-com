import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
/* v2 – logo frame + header ad (right side) */

export default function Header() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const headerAdRef = useRef(null);
  const headerAdPushed = useRef(false);

  useEffect(() => {
    // Push the AdSense ad slot once the <ins> is in the DOM.
    // The slot container is always visible (no hide-until-filled), so AdSense
    // can measure it and fill it as soon as the account starts serving ads.
    if (!headerAdPushed.current && headerAdRef.current && typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        headerAdPushed.current = true;
      } catch (e) {
        console.warn('AdSense push error:', e);
      }
    }
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <header className="site-header">
      <a href="/" aria-label="NYCWine.com home" className="logo-frame">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
          {/* width/height must match actual PNG dimensions so Next.js serves full resolution on Retina */}
          <Image
            src="/nycwine-logo.png"
            alt="NYCWine.com"
            width={1013}
            height={304}
            style={{ height: '44px', width: 'auto', objectFit: 'contain' }}
            priority
          />
          <span style={{
            fontFamily: "'DM Sans', -apple-system, 'Helvetica Neue', Arial, sans-serif",
            fontStyle: 'italic',
            fontWeight: 700,
            fontSize: '12px',
            color: '#e91e8c',
            letterSpacing: '0.12em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}>Uncork the City</span>
        </div>
      </a>

      {/* Search input — navigates to /search?q=... on Enter */}
      <form onSubmit={handleSearch} className="header-search-form">
        <input
          type="search"
          placeholder="Search wine, stores, events…"
          className="header-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      {/* Banner ad — right side of header (AdSense unit: Top right corner header, 468×60) */}
      <div className="header-ad-link">
        <ins
          className="adsbygoogle"
          style={{ display: 'inline-block', width: 468, height: 60 }}
          data-ad-client="ca-pub-6782277104310503"
          data-ad-slot="2838548456"
          ref={headerAdRef}
        />
      </div>
    </header>
  );
}
