// pages/blog/[slug].js
// ─────────────────────────────────────────────────────────────
// Individual blog post page.
// Uses getStaticProps + getStaticPaths for SSG — fast, SEO-friendly.
// ─────────────────────────────────────────────────────────────

import Head from 'next/head';
import Link from 'next/link';
import path from 'path';
import fs from 'fs';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import QuickNav from '../../components/QuickNav';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function BlogPost({ post, relatedPosts }) {
  if (!post) return null;

  return (
    <>
      <Head>
        <title>{post.title} | NYCWine.com</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://www.nycwine.com/blog/${post.slug}`} />
        {post.image && <meta property="og:image" content={post.image} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt} />
        {/* Structured data: Article */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: post.title,
              description: post.excerpt,
              datePublished: post.date,
              dateModified: post.date,
              image: post.image || 'https://www.nycwine.com/nycwine-logo.png',
              mainEntityOfPage: `https://www.nycwine.com/blog/${post.slug}`,
              author: {
                '@type': 'Organization',
                name: post.author || 'NYCWine.com',
                url: 'https://www.nycwine.com',
              },
              publisher: {
                '@type': 'Organization',
                name: 'NYCWine.com',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://www.nycwine.com/nycwine-logo.png',
                },
              },
            }),
          }}
        />
      </Head>

      <Header />
      <QuickNav />

      <main className="blog-post-page">
        <article className="blog-post-article">

          {/* Breadcrumb */}
          <nav className="blog-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="blog-breadcrumb-sep">›</span>
            <Link href="/blog">Blog</Link>
            <span className="blog-breadcrumb-sep">›</span>
            <span>{post.title}</span>
          </nav>

          {/* Header */}
          <header className="blog-post-header">
            {post.tags && post.tags.length > 0 && (
              <div className="blog-post-tags">
                {post.tags.map((t) => (
                  <span key={t} className="blog-tag">{t}</span>
                ))}
              </div>
            )}
            <h1 className="blog-post-title">{post.title}</h1>
            <div className="blog-post-meta">
              <span className="blog-post-author">{post.author}</span>
              <span className="blog-post-date">{formatDate(post.date)}</span>
            </div>
          </header>

          {/* Hero image */}
          {post.image && (
            <div className="blog-post-hero">
              <img src={post.image} alt={post.title} />
            </div>
          )}

          {/* Body */}
          <div
            className="blog-post-body"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Footer */}
          <footer className="blog-post-footer">
            <Link href="/blog" className="blog-back-link">← Back to all posts</Link>
          </footer>

        </article>

        {/* Sidebar */}
        <aside className="blog-post-sidebar">
          <div className="blog-sidebar-widget">
            <div className="blog-sidebar-heading">NYC Wine Events</div>
            <p className="blog-sidebar-text">Find upcoming tastings, festivals, and events happening around New York City.</p>
            <Link href="/events" className="blog-sidebar-cta">Browse Events →</Link>
          </div>

          <div className="blog-sidebar-widget">
            <div className="blog-sidebar-heading">Wine Bars Near You</div>
            <p className="blog-sidebar-text">Discover the best wine bars across Manhattan, Brooklyn, and beyond.</p>
            <Link href="/bars" className="blog-sidebar-cta">Explore Wine Bars →</Link>
          </div>

          {relatedPosts && relatedPosts.length > 0 && (
            <div className="blog-sidebar-widget">
              <div className="blog-sidebar-heading">More Posts</div>
              {relatedPosts.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="blog-related-item">
                  <span className="blog-related-title">{p.title}</span>
                  <span className="blog-related-date">{formatDate(p.date)}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="blog-sidebar-widget">
            <div className="blog-sidebar-heading">Follow Along</div>
            <div className="blog-sidebar-socials">
              <a href="https://www.instagram.com/explore/tags/nycwine/" target="_blank" rel="noopener noreferrer" className="blog-social-link">Instagram @nycwinereport</a>
              <a href="https://x.com/NYCWineReport" target="_blank" rel="noopener noreferrer" className="blog-social-link">X @NYCWineReport</a>
              <a href="https://www.facebook.com/NYCWine" target="_blank" rel="noopener noreferrer" className="blog-social-link">Facebook @NYCWine</a>
            </div>
          </div>
        </aside>
      </main>

      <Footer />
    </>
  );
}

export async function getStaticPaths() {
  const dataPath = path.join(process.cwd(), 'data', 'blog-posts.json');
  const posts = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  return {
    paths: posts.map((p) => ({ params: { slug: p.slug } })),
    fallback: 'blocking', // new posts auto-served after deploy
  };
}

export async function getStaticProps({ params }) {
  const dataPath = path.join(process.cwd(), 'data', 'blog-posts.json');
  const posts = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return { notFound: true };

  // Related posts: up to 3 others, newest first
  const relatedPosts = posts
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3)
    .map(({ content, ...rest }) => rest);

  return { props: { post, relatedPosts }, revalidate: 60 };
}
