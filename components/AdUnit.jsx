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
// IMPORTANT: The wrapper starts with display:none and height:0
// to prevent blank gaps. It only becomes visible when AdSense
// confirms an ad has filled the slot.
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

    // Poll for AdSense to fill the slot (check every 500ms for up to 5s)
    let checks = 0;
    const interval = setInterval(() => {
      checks++;
      if (adRef.current) {
        const status = adRef.current.getAttribute('data-ad-status');
        if (status === 'filled') {
          setHasAd(true);
          clearInterval(interval);
        }
      }
      if (checks >= 10) clearInterval(interval);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Hide completely until an ad fills — prevents blank white gaps
  const wrapperStyle = hasAd
    ? undefined
    : { display: 'none', height: 0, overflow: 'hidden' };

  return (
    <div
      className={`ad-unit ${className}`}
      data-ad-slot={slot}
      style={wrapperStyle}
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
