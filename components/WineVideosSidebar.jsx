// components/WineVideosSidebar.jsx
// ─────────────────────────────────────────────────────────────
// Compact sidebar widget showing recent NYC-wine YouTube videos.
// Loads from /data/youtube-cache.json (updated weekly by
// scripts/youtube-fetch.js via GitHub Actions).
//
// Replaces the old AuctionsSidebar. Designed to never go blank:
// even if the cache is empty, a friendly "Watch on YouTube" CTA
// renders so the slot is always filled.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';

const FALLBACK_URL = 'https://www.youtube.com/results?search_query=NYC+wine';

export default function WineVideosSidebar() {
  const [videos, setVideos] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/data/youtube-cache.json')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.videos)) setVideos(data.videos);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  return (
    <div className="videos-sidebar">
      {/* Header: title left, YouTube wordmark right */}
      <div className="videos-sidebar-header">
        <div className="videos-sidebar-title">Wine on YouTube</div>
        <a
          href={FALLBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="videos-header-logo"
          aria-label="Search NYC wine on YouTube"
        >
          <span className="videos-yt-wordmark">
            <span className="videos-yt-play" aria-hidden="true">▶</span>
            YouTube
          </span>
        </a>
      </div>

      {/* Empty state — slot stays filled even with zero cached videos */}
      {loaded && videos.length === 0 && (
        <a
          className="videos-empty"
          href={FALLBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="videos-empty-icon" aria-hidden="true">▶</div>
          <div className="videos-empty-text">
            <div className="videos-empty-title">Watch NYC wine videos</div>
            <div className="videos-empty-sub">Open YouTube &rarr;</div>
          </div>
        </a>
      )}

      {/* Loading state — just below the header */}
      {!loaded && (
        <div className="videos-loading">Loading videos&hellip;</div>
      )}

      {/* Video list */}
      {videos.length > 0 && (
        <div className="videos-list">
          {videos.slice(0, 4).map((v) => (
            <a
              key={v.videoId}
              className="video-item"
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="video-item-inner">
                {v.thumbnail && (
                  <div
                    className="video-thumb"
                    style={{ backgroundImage: `url(${v.thumbnail})` }}
                  >
                    <span className="video-thumb-play" aria-hidden="true">▶</span>
                  </div>
                )}
                <div className="video-text">
                  <div className="video-title">{v.title}</div>
                  <div className="video-meta">
                    <span className="video-channel">{v.channelTitle}</span>
                    {v.publishedRelative && (
                      <>
                        <span className="video-meta-dot">&middot;</span>
                        <span className="video-when">{v.publishedRelative}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* "more on YouTube →" attribution link */}
      <a
        className="videos-source"
        href={FALLBACK_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        more on YouTube &rarr;
      </a>
    </div>
  );
}
