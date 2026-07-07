// components/BlogSection.jsx
// ─────────────────────────────────────────────────────────────
// Latest blog posts — shows the 3 most recent posts from
// data/blog-posts.json as image cards linking to /blog/[slug].
// Placed on the homepage so original content gets indexed.
// ─────────────────────────────────────────────────────────────

import posts from '../data/blog-posts.json';

const latest = posts.slice(0, 3);

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function BlogSection() {
  return (
    <section className="blog-section" id="sec-blog">

      {/* Pink ribbon */}
      <div className="blog-ribbon">
        <span className="ticker-badge">From the Blog</span>
        <a href="/blog" className="blog-ribbon-view-all">All Posts →</a>
      </div>

      <div className="blog-cards">
        {latest.map((post) => (
          <a key={post.slug} href={`/blog/${post.slug}`} className="blog-card">
            <div className="blog-card-img">
              <img
                src={post.image}
                alt={post.title}
                loading="lazy"
                onError={(e) => { e.target.closest('.blog-card-img').style.display = 'none'; }}
              />
            </div>
            <div className="blog-card-body">
              <div className="blog-card-date">{formatDate(post.date)}</div>
              <div className="blog-card-title">{post.title}</div>
              <div className="blog-card-excerpt">{post.excerpt}</div>
              <span className="blog-card-read-more">Read more →</span>
            </div>
          </a>
        ))}
      </div>

    </section>
  );
}
