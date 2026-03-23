// components/AdUnit.jsx
// ─────────────────────────────────────────────────────────────
// Google AdSense responsive ad unit.
// Publisher ID: ca-pub-6782277104310503
//
// Usage:
//   <AdUnit slot="homepage-banner" />
//
// The AdSense script is loaded globally in _app.js.
// Each <AdUnit> creates one responsive ad block that auto-sizes
// for mobile vs desktop.
//
// To add a new ad placement: just drop <AdUnit slot="name" />
// anywhere in the page. The slot name is for your reference only
// (AdSense auto-fills with available ads).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';

export default function AdUnit({ slot = 'default', className = '' }) {
  const adRef = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    // Only push the ad once per mount, and only if adsbygoogle is loaded
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
    <div className={`ad-unit ${className}`} data-ad-slot={slot}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-6782277104310503"
        data-ad-format="auto"
        data-full-width-responsive="true"
        ref={adRef}
      />
    </div>
  );
}
