// pages/about.js
// ─────────────────────────────────────────────────────────────
// About page — quick intro to NYCWine.com
// ─────────────────────────────────────────────────────────────

import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About — NYCWine.com</title>
        <meta
          name="description"
          content="NYCWine.com is your guide to wine events, wine bars, wine stores, and wine culture across New York City."
        />
      </Head>

      <Header />

      <main className="about-page">
        {/* Hero image */}
        <div className="about-hero">
          <img
            src="/images/about-hero.jpg"
            alt="Friends enjoying wine together in New York City"
            className="about-hero-img"
          />
        </div>

        {/* Content */}
        <div className="about-content">
          <h1 className="about-title">About NYCWine.com</h1>

          <p className="about-lead">
            New York City is one of the greatest wine cities in the world. NYCWine.com is here to help you explore it.
          </p>

          <p>
            We bring together everything wine lovers need in one place — upcoming tastings,
            classes, and dinners happening across the five boroughs, a curated directory of
            over 335 wine stores in Manhattan, 110+ wine bars citywide, and the latest
            wine news and community conversations.
          </p>

          <p>
            Whether you&apos;re a seasoned collector looking for your next case or
            someone who just wants to find a great glass of wine on a Tuesday night,
            NYCWine.com is built for you.
          </p>

          <div className="about-features">
            <div className="about-feature">
              <span className="about-feature-icon">&#127863;</span>
              <div>
                <strong>Wine Events</strong>
                <span>Tastings, classes, dinners, and festivals updated daily from sources across NYC.</span>
              </div>
            </div>
            <div className="about-feature">
              <span className="about-feature-icon">&#128722;</span>
              <div>
                <strong>Wine Stores</strong>
                <span>335+ shops across Manhattan with addresses, phone numbers, and website links.</span>
              </div>
            </div>
            <div className="about-feature">
              <span className="about-feature-icon">&#127863;</span>
              <div>
                <strong>Wine Bars</strong>
                <span>110+ wine bars in Manhattan, Brooklyn, and Queens — search by name or borough.</span>
              </div>
            </div>
            <div className="about-feature">
              <span className="about-feature-icon">&#128240;</span>
              <div>
                <strong>Wine News</strong>
                <span>The latest headlines and stories from top wine publications, refreshed automatically.</span>
              </div>
            </div>
            <div className="about-feature">
              <span className="about-feature-icon">&#128172;</span>
              <div>
                <strong>Community</strong>
                <span>Conversations from Reddit, Instagram, X, and more — all in one feed.</span>
              </div>
            </div>
          </div>

          <div className="about-contact">
            <h2 className="about-contact-title">Get in Touch</h2>
            <p>
              Have a question, suggestion, or want to collaborate? Reach us at{' '}
              <a href="mailto:sommelier@nycwine.com">sommelier@nycwine.com</a>{' '}
              or find us on social media.
            </p>
          </div>

          <p className="about-closing">
         
          </p>
 
      </main>

      <Footer />
    </>
  );
}
