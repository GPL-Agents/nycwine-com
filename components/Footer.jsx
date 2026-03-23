// components/Footer.jsx 
// ─────────────────────────────────────────────────────────────
// Minimal site footer. Update links/text here as the site grows.
// ─────────────────────────────────────────────────────────────

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div style={{ marginBottom: 6 }}>
        <a href="/about">About</a>
        {' · '}
        <a href="/contact">Contact</a>
        {' · '}
        <a href="/stores">Wine Stores</a>
        {' · '}
        <a href="/bars">Wine Bars</a>
        {' · '}
        <a href="/events">Events</a>
      </div>
      <div>© {year} NYCWine.com — All rights reserved</div>
    </footer>
  );
}
