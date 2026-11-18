// data/seasonal-hero.js
// ─────────────────────────────────────────────────────────────
// Seasonal promo hero (homepage, between QuickNav and Upcoming Events).
//
// To swap a promotion: replace the object below (or add a new one
// to PROMOS and point ACTIVE_PROMO at it). Drop the image in
// /public/images/seasonal/ (3:2 ratio, ~1200x800 JPG).
//
// The hero hides itself automatically after `end`.
// Set `active: false` to hide it immediately.
//
// partner: optional affiliate panel. Remove the key to hide it.
// Wine.com counts toward the 3-ads-per-page limit (header banner
// + events 300x250 + this panel = 3 on the homepage).
// ─────────────────────────────────────────────────────────────

const LS = 'https://click.linksynergy.com/fs-bin/click?id=*DRwXnoxF7Y&offerid=1568530.';
const ls = (offer) => `${LS}${offer}&type=3&subid=0`;

const PROMOS = {
  'thanksgiving-2026': {
    active: true,
    end: '2026-11-30T23:59:59-05:00',
    theme: { bg: '#fbf4ea', text: '#3a2418', accent: '#c4561d', pattern: 'thanksgiving' },
    image: {
      src: '/images/seasonal/thanksgiving-2026.jpg',
      alt: 'Happy Thanksgiving from NYCWine: a turkey in sunglasses raising a glass of red wine over a holiday table',
    },
    eyebrow: 'Thanksgiving 2026',
    headline: 'Four bottles for the whole table',
    blurb:
      'Our NYC Thanksgiving wine guide: the four-bottle lineup that handles every dish, free tastings in the city, and three new fall wine rooms.',
    cta: {
      label: 'Read the guide',
      href: '/blog/nyc-thanksgiving-wine-2026-guide-four-bottles-bar-chimera',
    },
    partner: {
      name: 'Wine.com',
      heading: 'Shop the holiday table at Wine.com',
      links: [
        { label: 'Thanksgiving Guide', href: ls('10005037') },
        { label: 'Sparkling & Champagne', href: ls('10005036') },
        { label: 'Holiday Gift Guide', href: ls('10005041') },
        { label: 'Wine.com Top 100 of 2026', href: ls('10005035') },
      ],
      deals: [
        { code: 'GRATEFUL20', text: '$20 off $200+. New customers. Ends 11/30/26.', href: ls('10005026') },
        { code: 'FSGIFT', text: 'Free shipping on $100+ of select wines. Ends 12/31/26.', href: ls('10005032') },
        { code: 'JOVIAL25', text: '$25 off $350+. New customers. Ends 12/31/26.', href: ls('10005024') },
      ],
      allDeals: { label: 'Shop Holiday Deals', href: ls('10005043') },
    },
  },
};

export const ACTIVE_PROMO = 'thanksgiving-2026';
export default PROMOS[ACTIVE_PROMO] || null;
