import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/router';
/* v2 – logo frame + ad fixes */

export default function Header() {
  const router = useRouter();
  const [query, setQuery] = useState('');

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

      {/* Banner ad (468×60) — right side of header */}
      <a
        href="https://yorkshirewines.com"
        target="_blank"
        rel="noopener noreferrer"
        className="header-ad-link"
      >
        <img
          src="/images/yorkshire2.png?v=6"
          alt="Yorkshire Wines & Spirits — Fast delivery to Upper East Side"
          className="header-ad-img"
        />
      </a>
    </header>
  );
}
