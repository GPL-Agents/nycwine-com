// pages/sitemap.xml.js
// ─────────────────────────────────────────────────────────────
// Dynamic XML sitemap served at /sitemap.xml.
// Includes all static pages plus every blog post from
// data/blog-posts.json. New blog posts appear automatically.
// ─────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://www.nycwine.com';

// Static pages: [route, changefreq, priority]
const STATIC_PAGES = [
  ['/', 'daily', '1.0'],
  ['/bars', 'weekly', '0.9'],
  ['/stores', 'weekly', '0.9'],
  ['/wineries', 'weekly', '0.9'],
  ['/events', 'daily', '0.9'],
  ['/map', 'weekly', '0.8'],
  ['/blog', 'weekly', '0.8'],
  ['/news', 'daily', '0.7'],
  ['/social', 'daily', '0.6'],
  ['/about', 'monthly', '0.5'],
  ['/advertise', 'monthly', '0.5'],
  ['/submit', 'monthly', '0.4'],
  ['/search', 'monthly', '0.3'],
  ['/privacy', 'yearly', '0.2'],
];

function generateSitemap(posts) {
  const today = new Date().toISOString().split('T')[0];

  const staticUrls = STATIC_PAGES.map(
    ([route, changefreq, priority]) => `  <url>
    <loc>${SITE_URL}${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  );

  // Dedupe by slug, keeping the most recent date for each.
  const bySlug = new Map();
  for (const post of posts) {
    const existing = bySlug.get(post.slug);
    if (!existing || post.date > existing.date) bySlug.set(post.slug, post);
  }
  const uniquePosts = [...bySlug.values()];

  const blogUrls = uniquePosts.map(
    (post) => `  <url>
    <loc>${SITE_URL}/blog/${post.slug}</loc>
    <lastmod>${post.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...blogUrls].join('\n')}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  let posts = [];
  try {
    const filePath = path.join(process.cwd(), 'data', 'blog-posts.json');
    posts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    // If blog data is unavailable, still serve the static pages.
    posts = [];
  }

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.write(generateSitemap(posts));
  res.end();

  return { props: {} };
}

// Page component is never rendered — getServerSideProps writes the
// XML response directly — but Next.js requires a default export.
export default function Sitemap() {
  return null;
}
