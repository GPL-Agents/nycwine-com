// pages/_app.js
// ─────────────────────────────────────────────────────────────
// Global app wrapper. Imports global CSS + external scripts.
// ─────────────────────────────────────────────────────────────

import Head from 'next/head';
import Script from 'next/script';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* Google AdSense — site ownership verification */}
        <meta name="google-adsense-account" content="ca-pub-6782277104310503" />

        {/* Google Fonts — Playfair Display (editorial serif) + DM Sans (clean body) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Google AdSense — loads once, available to all <AdUnit> components */}
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6782277104310503"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />

      {/* Elfsight — powers the Instagram social feed widget */}
      <Script
        src="https://elfsightcdn.com/platform.js"
        strategy="afterInteractive"
      />
      <Component {...pageProps} />
    </>
  );
}
