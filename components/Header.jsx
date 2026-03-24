import Image from 'next/image'; 

export default function Header() {
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

      {/* Search input — visible on desktop, collapses on mobile */}
      <input
        type="search"
        placeholder="Search wine, stores, events…"
        className="header-search"
      />

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
