// pages/social.js
// ─────────────────────────────────────────────────────────────
// Standalone Social page — uses the same two-column layout as
// the News page (news-page CSS classes), with a black ribbon
// header matching the homepage Social section.
// ─────────────────────────────────────────────────────────────

import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import QuickNav from '../components/QuickNav';
import SocialSection from '../components/SocialSection';

export default function SocialPage() {
  return (
    <>
      <Head>
        <title>NYC Wine Social — Instagram, Reddit &amp; More | NYCWine.com</title>
        <meta
          name="description"
          content="Follow NYC's wine community on Instagram, Reddit, X, Pinterest and Facebook. Real-time posts, discussions, and social updates from New York's wine scene."
        />
      </Head>

      <Header />
      <QuickNav />

      {/*
        Reuse news-page CSS for the proven layout pattern.
        social-page modifier overrides the ribbon to black and
        strips SocialSection's internal double-padding.
      */}
      <main className="news-page social-page">

        {/* Black ribbon — same icon as homepage social section */}
        <div className="section-header news-page-header social-page-header">
          <div className="section-header-title">
            <img src="/images/icons/icon-social.png" className="ribbon-icon" alt="" aria-hidden="true" />
            NYC Wine Social
          </div>
        </div>

        {/* Two-column layout: social feed + sidebar */}
        <div className="news-page-layout">

          {/* Left — full SocialSection (header hidden via CSS, padding stripped) */}
          <div className="news-page-list social-page-list">
            <SocialSection />
          </div>

          {/* Right — sidebar with Facebook featured post */}
          <div className="news-page-sidebar social-page-sidebar">

            <div className="ws-video-heading" style={{ marginBottom: '12px' }}>
              <span className="ws-video-label">Featured Post</span>
              <a
                href="https://www.facebook.com/NYCWine"
                target="_blank"
                rel="noopener noreferrer"
                className="ws-video-channel-link"
              >
                Follow @NYCWine →
              </a>
            </div>

            {/* Facebook post embed — scaled to fit 280px sidebar */}
            <div className="social-page-fb-wrap">
              <iframe
                src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FNYCWine%2Fposts%2Fpfbid03dm8LGaHA1iA5axEbo4LtMwsMtHVmFnzejQTeRmTAnszJtGnz3yxptSqqXGLxs4Ql&show_text=true&width=500"
                width="500"
                height="648"
                style={{ border: 'none', overflow: 'hidden' }}
                scrolling="no"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              />
            </div>

          </div>
        </div>

      </main>

      <Footer />
    </>
  );
}
