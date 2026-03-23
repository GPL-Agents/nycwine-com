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
// The component watches for AdSense to fill the slot. If no ad
// loads within 3 seconds, or the ad container stays empty, the
// wrapper collapses to zero height so there's no blank gap.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';

export default function AdUnit({ slot = 'default', className = '' }) {
  const adRef = useRef(null);
  const pushed = useRef(false);
  const [hasAd, setHasAd] = useState(false);

  useEffect(() => {
    if (!pushed.current && adRef.current && typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      } catch (e) {
        console.warn('AdSense push error:', e);
      }
    }

    // Check if AdSense actually filled the slot
    const timer = setTimeout(() => {
      if (adRef.current) {
        const ins = adRef.current;
        // AdSense sets data-ad-status="filled" when an ad loads
        const status = ins.getAttribute('data-ad-status');
        if (status === 'filled') {
          setHasAd(true);
        }
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`ad-unit ${className}`}
      data-ad-slot={slot}
      style={!hasAd ? { minHeight: 0, padding: 0, overflow: 'hidden' } : undefined}
    >
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
