// components/SidebarVerticalAd.jsx
// Right-column ad on secondary pages (bars, stores, wineries, news,
// events, social, blog index, blog post). One Wine.com 300x250 that
// sticks while the column's empty space scrolls by.
// Previously AdSense slot 4732692709.

import WineComAd from './WineComAd';

export default function SidebarVerticalAd({ className = '' }) {
  return (
    <div className={`sidebar-vertical-ad sidebar-sticky-ad ${className}`.trim()}>
      <WineComAd size="300x250" />
    </div>
  );
}
