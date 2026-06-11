// pages/_app.js
// ─────────────────────────────────────────────────────────────
// Global app wrapper. Imports global CSS + external scripts.
// ─────────────────────────────────────────────────────────────

import Head from 'next/head';
import Script from 'next/script';
import { useRouter } from 'next/router';
import '../styles/globals.css';

const SITE_URL = 'https://www.nycwine.com';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  // Canonical URL: strip query string / hash, drop trailing slash (except home)
  const cleanPath = router.asPath.split('?')[0].split('#')[0].replace(/\/$/, '');
  const canonicalUrl = `${SITE_URL}${cleanPath || '/'}`;

  return (
    <>
      <Head>
        {/* Canonical URL — pages can override with their own key="canonical" */}
        <link rel="canonical" href={canonicalUrl} key="canonical" />

        {/* Favicon — all pages */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
        <link rel="apple-touch-icon" href="/favicon-512.png" />

        {/* Google AdSense — site ownership verification */}
        <meta name="google-adsense-account" content="ca-pub-6782277104310503" />

        {/* Pinterest — site ownership verification */}
        <meta name="p:domain_verify" content="61a0857fd3a5d8fee61ad9821e902761" />

        {/* Google Fonts — Playfair Display (editorial serif) + DM Sans (clean body) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Google Analytics 4 */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-L27LZ1EKHZ"
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-L27LZ1EKHZ');
        `}
      </Script>

      {/* Google AdSense */}
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
