import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
/* v2 – logo frame + ad fixes */

export default function Header() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [hasHeaderAd, setHasHeaderAd] = useState(false);
  const headerAdRef = useRef(null);
  const headerAdPushed = useRef(false);

  useEffect(() => {
    // Push the AdSense ad slot once the <ins> is in the DOM.
    if (!headerAdPushed.current && headerAdRef.current && typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        headerAdPushed.current = true;
      } catch (e) {
        console.warn('AdSense push error:', e);
      }
    }

    // Poll for AdSense to fill the slot (hide until filled — no blank box in the header)
    let checks = 0;
    const interval = setInterval(() => {
      checks++;
      if (headerAdRef.current) {
        const status = headerAdRef.current.getAttribute('data-ad-status');
        if (status === 'filled') {
          setHasHeaderAd(true);
          clearInterval(interval);
        }
      }
      if (checks >= 10) clearInterval(interval);
    }, 500);

    return () => clearInterval(interval);
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

      {/* Banner ad — right side of header (AdSense unit: Top right corner header) */}
      <div
        className="header-ad-link"
        style={hasHeaderAd ? undefined : { display: 'none' }}
      >
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: 468, height: 60 }}
          data-ad-client="ca-pub-6782277104310503"
          data-ad-slot="2838548456"
          data-ad-format="auto"
          ref={headerAdRef}
        />
      </div>
    </header>
  );
}
