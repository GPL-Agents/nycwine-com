// components/Footer.jsx 
// ─────────────────────────────────────────────────────────────
// Minimal site footer. Update links/text here as the site grows.
// ─────────────────────────────────────────────────────────────

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <nav className="footer-links">
        <a href="/about">About</a>
        <span className="footer-dot">&middot;</span>
        <a href="/contact">Contact</a>
        <span className="footer-dot">&middot;</span>
        <a href="/stores">Wine Stores</a>
        <span className="footer-dot">&middot;</span>
        <a href="/bars">Wine Bars</a>
        <span className="footer-dot">&middot;</span>
        <a href="/events">Events</a>
      </nav>
      <div className="footer-copy">&copy; {year} NYCWine.com &mdash; All rights reserved</div>
    </footer>
  );
}
