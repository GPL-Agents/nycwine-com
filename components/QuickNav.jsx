import { useState, useEffect } from 'react';

const SECTIONS = [
  { id: 'sec-events', label: 'Events', cls: 'events' },
  { id: 'sec-social', label: 'Social', cls: 'social' },
  { id: 'sec-news', label: 'News', cls: 'news' },
  { id: 'sec-stores', label: 'Wine Stores', cls: 'stores' },
  { id: 'sec-bars', label: 'Wine Bars', cls: 'bars' },
];

export default function QuickNav() {
  const [active, setActive] = useState('sec-events');

  // Track which section is in view using IntersectionObserver.
  // Delay observer until user scrolls so the default "Events" sticks on load.
  useEffect(() => {
    let observer;
    let hasScrolled = false;

    function startObserver() {
      if (observer) return;
      const ids = SECTIONS.map((s) => s.id);
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActive(entry.target.id);
            }
          }
        },
        { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
      );
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }

    function onScroll() {
      if (!hasScrolled) {
        hasScrolled = true;
        startObserver();
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (observer) observer.disconnect();
    };
  }, []);

  function scrollTo(id) {
    setActive(id);
    const el = document.getElementById(id);
    if (!el) return;
    // Offset by the bottom of the sticky nav so the section ribbon
    // lands flush with the bottom edge of the QuickNav bar.
    const nav = document.querySelector('.quick-nav');
    const navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
    const elTop = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: elTop - navBottom, behavior: 'smooth' });
  }

  return (
    <nav className="quick-nav" aria-label="Jump to section">
      {SECTIONS.map((s) => (
        <a
          key={s.id}
          className={`qnav-pill ${s.cls}${active === s.id ? ' qnav-active' : ''}`}
          href={`#${s.id}`}
          onClick={(e) => { e.preventDefault(); scrollTo(s.id); }}
        >
          {s.label}
        </a>
      ))}
      <a className="qnav-pill wineries" href="#sec-wineries" onClick={(e) => { e.preventDefault(); }}>
        Wineries <span style={{ fontSize: 9, fontWeight: 500, background: 'var(--cream-dark, #efe9e1)', color: 'var(--muted)', borderRadius: 8, padding: '1px 6px', marginLeft: 4, letterSpacing: '0.02em' }}>soon</span>
      </a>
      <a className="qnav-pill map" href="/map">
        Map
      </a>
    </nav>
  );
}
