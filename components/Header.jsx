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
      <a href="/" aria-label="NYCWine.com home" className="logo-skyline-frame">
        <svg className="logo-skyline-top" viewBox="0 0 160 14" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,14 L0,10 L4,10 L4,8 L8,8 L8,6 L12,6 L12,8 L16,8 L16,5 L20,5 L20,7 L24,7 L24,4 L28,4 L28,6 L32,6 L32,3 L34,3 L34,5 L38,5 L38,2 L40,2 L40,4 L44,4 L44,1 L46,0 L48,1 L48,3 L52,3 L52,5 L56,5 L56,3 L58,3 L58,5 L62,5 L62,7 L66,7 L66,9 L70,9 L70,11 L74,11 L74,13 L78,13 L78,14 L82,14 L82,13 L86,13 L86,11 L90,11 L90,9 L94,9 L94,7 L98,7 L98,5 L102,5 L102,3 L104,3 L104,5 L108,5 L108,3 L110,3 L110,1 L112,0 L114,1 L114,4 L118,4 L118,2 L120,2 L120,5 L124,5 L124,3 L126,3 L126,6 L130,6 L130,4 L134,4 L134,7 L138,7 L138,5 L142,5 L142,8 L146,8 L146,6 L150,6 L150,8 L154,8 L154,10 L160,10 L160,14 Z" fill="#ccc" opacity="0.5"/>
        </svg>
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

      {/* Banner ad (468×60) — right side of header */}
      <a
        href="https://yorkshirewines.com"
        target="_blank"
        rel="noopener noreferrer"
        className="header-ad-link"
      >
        <img
          src="/images/yorkshire2.png"
          alt="Yorkshire Wines & Spirits — Fast delivery to Upper East Side"
          className="header-ad-img"
        />
      </a>
    </header>
  );
}
