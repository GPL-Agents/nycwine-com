// pages/api/blog.js
// ─────────────────────────────────────────────────────────────
// Serves blog posts from data/blog-posts.json
// GET /api/blog          → all posts (sorted newest first, no content)
// GET /api/blog?slug=x   → single post with full content
// ─────────────────────────────────────────────────────────────

import path from 'path';
import fs from 'fs';

export default function handler(req, res) {
  const dataPath = path.join(process.cwd(), 'data', 'blog-posts.json');

  let posts;
  try {
    posts = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch {
    return res.status(500).json({ error: 'Failed to load blog posts' });
  }

  // Sort newest first
  posts = posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  const { slug } = req.query;

  if (slug) {
    const post = posts.find((p) => p.slug === slug);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.status(200).json(post);
  }

  // List view — strip full content to keep payload small
  const list = posts.map(({ content, ...rest }) => rest);
  return res.status(200).json(list);
}
