// components/SidebarVerticalAd.jsx
// ============================================================
// Responsive vertical AdSense unit for the right-side column of
// secondary pages (bars, stores, wineries, news, events, social,
// blog index, blog post).
//
// Publisher: ca-pub-6782277104310503
// Slot:      4732692709  ("Responsive vertical ad")
//
// NOTE: The AdSense loader script is already global in _app.js,
// so we only render the <ins> + one push() here.
//
// Always rendered (no hide-until-filled wrapper) -- display:none
// at push time prevents AdSense from measuring the slot and
// blocks fill (same lesson as the header ad, 2026-09-01).
// ============================================================

import { useEffect, useRef } from 'react';

export default function SidebarVerticalAd({ className = '' }) {
  const adRef   = useRef(null);
  const pushed  = useRef(false);

  useEffect(() => {
    if (!pushed.current && adRef.current && typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      } catch (e) {
        console.warn('AdSense push error:', e);
      }
    }
  }, []);

  return (
    <div className={`sidebar-vertical-ad ${className}`.trim()}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-6782277104310503"
        data-ad-slot="4732692709"
        data-ad-format="auto"
        data-full-width-responsive="true"
        ref={adRef}
      />
    </div>
  );
}
