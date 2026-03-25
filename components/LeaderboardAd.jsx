// components/LeaderboardAd.jsx
// ─────────────────────────────────────────────────────────────
// Horizontal leaderboard ad that sits below the sticky nav.
// Hidden until AdSense confirms an ad has filled the slot.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';

export default function LeaderboardAd() {
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

    // Poll for AdSense to fill the slot
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
    <div className="leaderboard-ad" style={wrapperStyle}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-6782277104310503"
        data-ad-slot="2838548456"
        data-ad-format="horizontal"
        data-full-width-responsive="true"
        ref={adRef}
      />
    </div>
  );
}
