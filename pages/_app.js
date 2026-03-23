// pages/_app.js
// ─────────────────────────────────────────────────────────────
// Global app wrapper. Imports global CSS + external scripts.
// ─────────────────────────────────────────────────────────────

import Script from 'next/script';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      {/* Google AdSense — loads once, available to all <AdUnit> components */}
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6782277104310503"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <Component {...pageProps} />
    </>
  );
}
