// components/SidebarVerticalAd.jsx
// Right-column ads on secondary pages (bars, stores, wineries, news,
// events, social, blog index, blog post). Two Wine.com banners:
// a 300x250, then a 570x236 (scaled to column width) that sticks
// while the column's empty space scrolls by. With the header banner
// that is 3 Wine.com ads per page. Previously AdSense slot 4732692709.

import WineComAd from './WineComAd';

export default function SidebarVerticalAd({ className = '' }) {
  return (
    <>
      <div className={`sidebar-vertical-ad ${className}`.trim()}>
        <WineComAd size="300x250" />
      </div>
      <div className="sidebar-sticky-ad">
        <WineComAd size="570x236" />
      </div>
    </>
  );
}
