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
        style={{
          flex: 1,
          margin: '0 12px',
          background: 'var(--grey)',
          borderRadius: 20,
          padding: '6px 14px',
          fontSize: 12,
          color: 'var(--muted)',
          border: 'none',
          outline: 'none',
          maxWidth: 280,
        }}
      />

      {/* Hamburger — will open nav drawer in a future version */}
      <button
        aria-label="Open menu"
        style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--black)' }}
      >
        ☰
      </button>
    </header>
  );
}
