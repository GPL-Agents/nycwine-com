export default function QuickNav() { 
  function scrollTo(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav className="quick-nav" aria-label="Jump to section">
      <a className="qnav-pill events"   href="#sec-events"   onClick={(e) => { e.preventDefault(); scrollTo('sec-events'); }}>📅 Events</a>
      <a className="qnav-pill social"   href="#sec-social"   onClick={(e) => { e.preventDefault(); scrollTo('sec-social'); }}>📸 Social</a>
      <a className="qnav-pill news"     href="#sec-news"     onClick={(e) => { e.preventDefault(); scrollTo('sec-news'); }}>🗞 News</a>
      <a className="qnav-pill stores"   href="#sec-stores"   onClick={(e) => { e.preventDefault(); scrollTo('sec-stores'); }}>🍷 Wine Stores</a>
      <a className="qnav-pill bars"     href="#sec-bars"     onClick={(e) => { e.preventDefault(); scrollTo('sec-bars'); }}>🥂 Wine Bars</a>
      <a className="qnav-pill wineries" href="#sec-wineries" onClick={(e) => { e.preventDefault(); }}>
        🍇 Wineries <span style={{ fontSize: 8, fontWeight: 700, background: '#e0e0e0', color: '#888', borderRadius: 8, padding: '1px 5px', marginLeft: 2 }}>soon</span>
      </a>
    </nav>
  );
}
