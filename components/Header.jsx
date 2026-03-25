import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/router';

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
      <a href="/" aria-label="NYCWine.com home">
        <Image
          src="/nycwine-logo.png"
          alt="NYCWine.com"
          width={140}
          height={50}
          style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
          priority
        />
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

      {/* Banner ad placeholder (468×60) — right side of header */}
      <div className="header-ad-placeholder">
        <span className="ad-placeholder-label">Ad · 468×60</span>
      </div>
      {/* AdSense banner ad — uncomment once site is approved:
      <ins className="adsbygoogle"
        style={{ display: 'inline-block', width: '468px', height: '60px' }}
        data-ad-client="ca-pub-6782277104310503"
        data-ad-slot="2838548456"
      />
      */}
    </header>
  );
}
