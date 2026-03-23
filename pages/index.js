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
        <meta name="description" content="Discover wine events, tastings, and the best wine stores and bars in New York City." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Header />
      <QuickNav />

      <main>
        <EventsSection />
        <SocialSection />
        <NewsSection />
        <StoresSection />
      </main>

      <Footer />
    </>
 );
}
