// pages/social.js
// ─────────────────────────────────────────────────────────────
// Standalone Social page — full social section content on the
// left (~2/3) with a sidebar on the right (~1/3) for featured
// posts and future social content.
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

      <main className="social-page">

        {/* Two-column layout: social content + sidebar */}
        <div className="social-page-layout">

          {/* Left column — full SocialSection content */}
          <div className="social-page-main">
            <SocialSection />
          </div>

          {/* Right column — featured post + future content */}
          <div className="social-page-sidebar">

            <div className="social-page-sidebar-heading">Featured Post</div>

            {/* Facebook post embed */}
            <div className="social-fb-embed-wrap">
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
