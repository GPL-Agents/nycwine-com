// components/WineComAd.jsx
// ─────────────────────────────────────────────────────────────
// Wine.com affiliate banners (Rakuten / LinkShare, "Fall Evergreen
// Banner Refresh" creatives). Replaces the AdSense units.
//
// Usage: <WineComAd size="300x250" />
// Sizes: 300x250 (900x750 retina file), 728x90, 570x236, 180x150
//
// Plain <img> on purpose: the src is Rakuten's impression tracker,
// so it must load from ad.linksynergy.com, not via next/image.
// ─────────────────────────────────────────────────────────────

const RAKUTEN_ID = '%2aDRwXnoxF7Y';
const ADVERTISER = '1568530';

const CREATIVES = {
  '300x250': { offer: '10001858', grid: '0',  w: 300, h: 250 },
  '728x90':  { offer: '10001860', grid: '16', w: 728, h: 90 },
  '570x236': { offer: '10001853', grid: '0',  w: 570, h: 236 },
  '180x150': { offer: '10001856', grid: '11', w: 180, h: 150 },
};

export default function WineComAd({ size = '300x250', className = '' }) {
  const c = CREATIVES[size] || CREATIVES['300x250'];
  const href = `https://click.linksynergy.com/fs-bin/click?id=${RAKUTEN_ID}&offerid=${ADVERTISER}.${c.offer}&subid=0&type=4`;
  const src  = `https://ad.linksynergy.com/fs-bin/show?id=${RAKUTEN_ID}&bids=${ADVERTISER}.${c.offer}&subid=0&type=4&gridnum=${c.grid}`;

  return (
    <div className={`winecom-ad ${className}`.trim()}>
      <a href={href} target="_blank" rel="sponsored noopener">
        <img
          src={src}
          alt="Shop wine at Wine.com"
          width={c.w}
          height={c.h}
          loading="lazy"
          style={{ maxWidth: '100%', height: 'auto', display: 'inline-block', border: 0 }}
        />
      </a>
    </div>
  );
}
