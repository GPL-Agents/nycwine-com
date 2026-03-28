// components/QuickNav.jsx
// ─────────────────────────────────────────────────────────────
// Sticky pill nav shown on every page.
//
// Homepage  → pills scroll to the section on the page.
// All other pages → pills link to the dedicated page.
//   Social has no dedicated page, so it always navigates to /#sec-social.
// The active pill is highlighted:
//   • Homepage: whichever section is in the viewport.
//   • Other pages: whichever path matches the current route.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const SECTIONS = [
  { id: 'sec-events',   label: 'Events',      cls: 'events',   href: '/events'   },
  { id: 'sec-social',   label: 'Social',      cls: 'social',   href: '/#sec-social' },
  { id: 'sec-news',     label: 'News',        cls: 'news',     href: '/news'     },
  { id: 'sec-bars',     label: 'Wine Bars',   cls: 'bars',     href: '/bars'     },
  { id: 'sec-stores',   label: 'Wine Stores', cls: 'stores',   href: '/stores'   },
  { id: 'sec-wineries', label: 'Wineries',    cls: 'wineries', href: '/wineries' },
];

export default function QuickNav() {
  const router = useRouter();
  const isHome = router.pathname === '/';
  const [activeId, setActiveId] = useState('sec-events');

  // On the homepage, track which section is visible via IntersectionObserver.
  useEffect(() => {
    if (!isHome) return;

    let observer;
    let hasScrolled = false;

    function startObserver() {
      if (observer) return;
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) setActiveId(entry.target.id);
          }
        },
        { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
      );
      SECTIONS.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }

    function onScroll() {
      if (!hasScrolled) { hasScrolled = true; startObserver(); }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (observer) observer.disconnect();
    };
  }, [isHome]);

  // Smooth-scroll to a section (homepage only).
  function scrollTo(id) {
    setActiveId(id);
    const el = document.getElementById(id);
    if (!el) return;
    const nav = document.querySelector('.quick-nav');
    const navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
    const elTop = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: elTop - navBottom, behavior: 'smooth' });
  }

  // Which pill is active on inner pages (matched by pathname).
  function isActive(s) {
    if (isHome) return activeId === s.id;
    return router.pathname === s.href;
  }

  return (
    <nav className="quick-nav" aria-label="Jump to section">
      {SECTIONS.map((s) => {
        const active = isActive(s);
        if (isHome) {
          // Homepage: scroll behaviour
          return (
            <a
              key={s.id}
              className={`qnav-pill ${s.cls}${active ? ' qnav-active' : ''}`}
              href={`#${s.id}`}
              onClick={(e) => { e.preventDefault(); scrollTo(s.id); }}
            >
              {s.label}
            </a>
          );
        }
        // All other pages (and Social on any page): navigate to href
        return (
          <a
            key={s.id}
            className={`qnav-pill ${s.cls}${active ? ' qnav-active' : ''}`}
            href={s.href}
          >
            {s.label}
          </a>
        );
      })}
      <a
        className={`qnav-pill map${router.pathname === '/map' ? ' qnav-active' : ''}`}
        href="/map"
      >
        Map
      </a>
    </nav>
  );
}
