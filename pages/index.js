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
import WineBarsSection from '../components/WineBarsSection';
import WineriesSection from '../components/WineriesSection';
// TODO: Uncomment ad imports once Google AdSense is approved
// import AdUnit from '../components/AdUnit';
// import LeaderboardAd from '../components/LeaderboardAd';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <>
      <Head>
        <title>NYCWine.com - Wine Events &amp; News, Wine Bars, Wine Stores and Wineries</title>
        <meta name="description" content="Discover wine events, tastings, and the best wine stores and bars in New York City. Your source for everything wine in NYC." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* ── Sticky site chrome ───────────────────────────── */}
      <Header />
      <QuickNav />

      {/* ── Leaderboard banner ad (uncomment when AdSense approved) ── */}
      {/* <LeaderboardAd /> */}

      {/* ── Main content ─────────────────────────────────── */}
      <main>
        <EventsSection />
        {/* <AdUnit slot="after-events" /> */}

        <SocialSection />
        {/* <AdUnit slot="after-social" /> */}

        <NewsSection />
        {/* <AdUnit slot="after-news" /> */}

        <WineBarsSection />

        <StoresSection />

        <WineriesSection />
      </main>

      {/* ── Footer ───────────────────────────────────────── */}
      <Footer />
    </>
  );
}
