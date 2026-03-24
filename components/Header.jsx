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

      {/* Hamburger — will open nav drawer in a future version */}
      <button
        aria-label="Open menu"
        className="header-menu-btn"
      >
        <svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line y1="1" x2="20" y2="1" stroke="currentColor" strokeWidth="1.5"/>
          <line y1="8" x2="20" y2="8" stroke="currentColor" strokeWidth="1.5"/>
          <line y1="15" x2="20" y2="15" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      </button>
    </header>
  );
}
