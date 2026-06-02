// pages/blog/index.js
// ─────────────────────────────────────────────────────────────
// Blog listing page -- all posts, newest first.
// Mirrors the layout pattern of news.js and events.js.
// ─────────────────────────────────────────────────────────────

import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import QuickNav from '../../components/QuickNav';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function BlogIndex() {
  const [posts, setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  useEffect(() => {
    fetch('/api/blog')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setPosts(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  return (
    <>
      <Head>
        <title>Blog -- NYC Wine Events, Bars &amp; Tastings | NYCWine.com</title>
        <meta
          name="description"
          content="The NYCWine.com blog -- weekly guides to wine events, new bar openings, tasting tips, and everything happening in the New York City wine scene."
        />
      </Head>

      <Header />
      <QuickNav />

      <main className="blog-page">
        <div className="blog-page-hero">
          <h1 className="blog-page-hero-title">NYC Wine Blog</h1>
          <p className="blog-page-hero-subtitle">
            Weekly guides to events, new openings, tasting notes, and everything happening in the NYC wine scene.
          </p>
        </div>

        <div className="blog-page-layout">
          <div className="blog-post-list">
            {loading && <div className="blog-page-msg">Loading posts…</div>}
            {error && <div className="blog-page-msg">Unable to load posts right now. Please try again later.</div>}
            {!loading && !error && posts.length === 0 && (
              <div className="blog-page-msg">No posts yet -- check back soon!</div>
            )}
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card">
                {post.image && (
                  <div className="blog-card-img">
                    <img src={post.image} alt={post.title} loading="lazy" />
                  </div>
                )}
                <div className="blog-card-body">
                  <div className="blog-card-meta">
                    <span className="blog-card-date">{formatDate(post.date)}</span>
                    {post.tags && post.tags.length > 0 && (
                      <span className="blog-card-tags">
                        {post.tags.slice(0, 3).map((t) => (
                          <span key={t} className="blog-tag">{t}</span>
                        ))}
                      </span>
                    )}
                  </div>
                  <h2 className="blog-card-title">{post.title}</h2>
                  <p className="blog-card-excerpt">{post.excerpt}</p>
                  <span className="blog-card-read-more">Read more →</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Sidebar */}
          <aside className="blog-page-sidebar">
            <div className="blog-sidebar-widget">
              <div className="blog-sidebar-heading">About This Blog</div>
              <p className="blog-sidebar-text">
                NYCWine.com is your go-to source for the New York City wine scene -- events, bar openings, tasting picks, and insider tips, published weekly.
              </p>
            </div>
            <div className="blog-sidebar-widget">
              <div className="blog-sidebar-heading">Follow Along</div>
              <div className="blog-sidebar-socials">
                <a href="https://www.instagram.com/explore/tags/nycwine/" target="_blank" rel="noopener noreferrer" className="blog-social-link">Instagram @nycwinereport</a>
                <a href="https://x.com/NYCWineReport" target="_blank" rel="noopener noreferrer" className="blog-social-link">X @NYCWineReport</a>
                <a href="https://www.facebook.com/NYCWine" target="_blank" rel="noopener noreferrer" className="blog-social-link">Facebook @NYCWine</a>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </>
  );
}
