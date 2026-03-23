// pages/index.js
// ─────────────────────────────────────────────────────────────
// Homepage — assembles all section components.
//
// To reorder sections: move the component tags.
// To add a section: import its component and drop it in here.
// To remove a section: comment it out or delete the line.
//
// Each component lives in /components/ as its own file.
// ─────────────────────────────────────────────────────────────

import Head from 'next/head';
import Header from '../components/Header';
import QuickNav from '../components/QuickNav';
import EventsSection from '../components/EventsSection';
import SocialSection from '../components/SocialSection';
import NewsSection from '../components/NewsSection';
import StoresSection from '../components/StoresSection';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <>
      <Head>
        <title>NYCWine.com — Wine Events, News & Stores in New York City</title>
        <meta name="description" content="Discover wine events, tastings, and the best wine stores and bars in New York City. Your source for everything wine in NYC." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* ── Sticky site chrome ───────────────────────────── */}
      <Header />
      <QuickNav />

      {/* ── Main content ─────────────────────────────────── */}
      <main>
        <EventsSection />
        <SocialSection />
        <NewsSection />
        <StoresSection />
      </main>

      {/* ── Footer ───────────────────────────────────────── */}
      <Footer />
    </>
  );
}
