# NYCWine.com — Feed & Integration Tracker

Last updated: 2026-03-24

---

## Corporate & Domain Info

**Parent entity:** Metropolitan Vintners, LLC (NY DOS ID: 3771977, filed 02/06/2009, Active)
⚠️ Biennial statement past due since 02/28/2011 — needs filing with NY Dept of State.

**Domains owned:**
- nycwine.com — events, social feeds, community hub (THIS SITE)
- nycwinestores.com — wine store directory & online ordering (future)
- nycwinereport.com — news, editorial, regional winery reviews (future)
- metropolitanvintners.com — parent company
- manhattanvintners.com — parent company alternate

**Facebook Page:** facebook.com/NYCWine (currently showing as "Manhattan Vintners")

---

## Project Goals

1. **Live on nycwine.com, mobile-first.** Site is hosted on Vercel. All integrations must work well on mobile.
2. **Hub, not publisher.** Zero original content. Everything comes from external feeds, APIs, widgets, and embeds. The site curates and aggregates all things wine in NYC. Architecture should make adding new sources easy.
3. **Google AdSense for revenue.** ✅ Approved — publisher ID `ca-pub-6782277104310503`. Three responsive ad units live on homepage.
4. **Multi-site network.** nycwine.com is one of three planned sites under Metropolitan Vintners, LLC. Sites will cross-link and support each other.

---

## How to use this file

This tracks every external feed, widget, API, and integration on nycwine.com.
Update the **Status** column as each one goes live. Keep credentials in `.env.local` (never commit secrets).

---

## 1. EVENTS

| Integration | Status | What it does | Account needed | Env vars required | Cost | Notes |
|---|---|---|---|---|---|---|
| **NYC Open Data** | 🟢 Live | City events filtered for wine content | None (public API) | None | Free | API route: `pages/api/events.js`. Fetches from `data.cityofnewyork.us`, filters by wine keywords, auto-formats dates |
| **Eventbrite API** | 🟡 Ready to wire | Wine events near NYC | Eventbrite developer account | `EVENTBRITE_API_KEY` | Free tier | Already coded in events.js — just add the API key and it activates automatically |

**Current state:** `EventsSection.jsx` fetches from `/api/events` on mount. Shows real NYC wine events. Filter pills work on live data. Loading and error states handled. Cards link to event pages.
**API route:** `pages/api/events.js` — fetches NYC Open Data + Eventbrite (when key set), filters for wine content, 30min cache.

---

## 2. SOCIAL FEEDS (community content)

| Platform | Status | Method | Account needed | Env vars required | Cost | Notes |
|---|---|---|---|---|---|---|
| **X / Twitter** | 🟢 Live | Timeline embed (@nycwine) | None | None | Free | Uses `platform.twitter.com/widgets.js` — no API key needed. Shows @nycwine timeline |
| **Reddit** | 🟡 Ready to wire | Reddit API via `/api/reddit` | Reddit developer app | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` | Free | Code done. Shows "needs setup" message until env vars added. Greg setting up account |
| **Instagram #nycwine** | 🔴 Placeholder | Elfsight widget | Elfsight account | `ELFSIGHT_IG_ID` | Free tier or ~$5/mo | Clean "coming soon" card displayed. Only practical method — Meta blocks hashtag API |
| **Pinterest "NYC wine"** | 🔴 Placeholder | Elfsight widget | Elfsight account | `ELFSIGHT_PINTEREST_WIDGET_ID` | Free tier or ~$5/mo | Clean "coming soon" card displayed |

**Current state:** X/Twitter timeline embed is live (free). Reddit is coded and ready (needs credentials). Instagram and Pinterest show polished "coming soon" placeholders.
**API routes:** `pages/api/reddit.js`

---

## 3. NEWS / RSS FEEDS

Last audited: 2026-03-28

| Source | Status | Feed URL | Keyword filter? | Notes |
|---|---|---|---|---|
| **NY Times** | 🟢 Live | `rss.nytimes.com/…/DiningandWine.xml` | Yes | Confirmed working |
| **NY Post** | 🟢 Live | `nypost.com/food/feed/` | Yes | Confirmed working |
| **VinePair** | 🟢 Live | `vinepair.com/feed/` | No | Confirmed working |
| **Decanter** | 🟢 Live | `decanter.com/feed/` | No | Confirmed working |
| **Wine Enthusiast** | 🟢 Live | `winemag.com/feed/` | No | Confirmed working |
| **SevenFifty Daily** | 🟢 Live | `daily.sevenfifty.com/feed/` | No | Confirmed working |
| **Wine Folly** | 🟢 Live | `winefolly.com/feed/` | No | Confirmed working — was buried by old 20-article cap |
| **Eater NY** | 🟡 Unconfirmed | `ny.eater.com/rss/index.xml` | Yes | Flagged nycLocal. Has not appeared in API response — may be blocked server-side |
| **Grub St.** | 🟡 Unconfirmed | `grubstreet.com/feed/rss` | Yes | Flagged nycLocal. Has not appeared in API response — watch after next deploy |
| **Food & Wine** | 🟡 Newly added | `foodandwine.com/syndication/rss/all.rss` | Yes | Added 2026-03-28 — check after deploy |
| **PUNCH** | 🟡 Unconfirmed | `punchdrink.com/feed/` | Yes | Has not appeared in API response — watch after next deploy |
| **Imbibe** | 🟡 Unconfirmed | `imbibemagazine.com/feed/` | Yes | Has not appeared in API response — watch after next deploy |
| **Jancis Robinson** | 🟡 Newly added | `jancisrobinson.com/rss` | No | Added 2026-03-28 — leading wine critic. Check after deploy |
| ~~Wine Spectator~~ | ❌ Removed | — | — | Confirmed blocked server-side. Never appeared in API response |
| ~~Grape Collective~~ | ❌ Removed | — | — | Feed unreliable, never appeared in API response |
| ~~Dame Wine~~ | ❌ Removed | — | — | Feed unreliable, never appeared in API response |

**Bug fixes applied 2026-03-28:**
- Keyword filter now runs BEFORE item mapping (was only checking titles, now checks full content)
- Per-source cap added (max 8 articles per source) — prevents VinePair/Decanter from crowding out slower publishers
- Article limit raised from 20 → 60 so all active sources can surface

**Ticker:** Auto-generated from top headlines.
**Refresh interval:** 60 minutes (in-memory cache in API route).
**Filter keywords:** wine, winery, vineyard, tasting, sommelier, champagne, rosé, bordeaux, pinot, chardonnay, merlot, cabernet, prosecco, cava, riesling + many more.

**Current state:** `NewsSection.jsx` fetches from `/api/news` on mount. Shows real articles with links. Source filter tabs built dynamically from API data. Loading and error states handled.
**API route:** `pages/api/news.js` — fetches all feeds in parallel, filters, caps per source, merges, sorts by date, caches 60 min.
**Dependency:** `rss-parser` in package.json.
**To verify after each deploy:** Visit `/api/news` and check which source names appear. Any source not represented despite being 🟢 or 🟡 should be investigated or replaced.

---

## 4. WINE STORES DIRECTORY

| Integration | Status | What it does | Account needed | Env vars required | Cost | Notes |
|---|---|---|---|---|---|---|
| **Static JSON** | 🟢 Live | 335 Manhattan wine stores | None | None | Free | Data in `public/data/wine-stores.json`. Search + neighborhood filter. Paginated (show 10, load more). Phone links. |
| **Supabase database** | ⬛ Deferred to V1 | Dynamic store management | Supabase account | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Free tier | Migrate from static JSON when ready |

**Current state:** `StoresSection.jsx` loads all 335 stores from `public/data/wine-stores.json`. Search bar and neighborhood dropdown filter live. "Show more" pagination. Phone numbers are clickable call links. Visit buttons link to store websites where available.
**Data source:** Converted from `store-data/wine-stores-manhattan.csv` (also in `data/wine-stores.json` for reference).

---

## 5. EMAIL SIGNUP

| Integration | Status | What it does | Account needed | Env vars required | Cost | Notes |
|---|---|---|---|---|---|---|
| **Mailchimp** | 🔴 Not wired | Email newsletter signup | Mailchimp account | `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID`, `MAILCHIMP_SERVER_PREFIX` | Free up to 500 contacts | Need to fill in `embedActionUrl` and `listId` in integrations-config.js |

**Current state:** No signup form component yet.
**To go live:** Create Mailchimp account, get embed action URL, add signup form component to footer or homepage.

---

## 6. ADVERTISING

| Integration | Status | What it does | Account needed | Env vars required | Cost | Notes |
|---|---|---|---|---|---|---|
| **Google AdSense** | 🟢 Live | Display ads (primary revenue) | ✅ Approved — ca-pub-6782277104310503 | Script loaded in `_app.js` | Free (revenue generating) | 3 responsive ad units placed: after-events, after-social, after-news. Auto-sizes for mobile/desktop |

**Current state:** AdSense script loaded globally via `next/script`. Three `<AdUnit>` components placed between content sections.
**Component:** `components/AdUnit.jsx` — drop `<AdUnit slot="name" />` anywhere to add more placements.

---

## 7. PHASE 2 (NOT NEEDED AT LAUNCH)

| Integration | Status | What it does | Cost | Notes |
|---|---|---|---|---|
| **Wine-Searcher API** | ⬛ Disabled | Wine price comparison | $250/mo | 500 API calls/day |
| **YouTube API** | ⬛ Disabled | Wine video content | Free (10k units/day) | Search: NYC wine, tastings |
| **Google Maps + Places** | ⬛ Disabled | "Get Wine Delivered" map | Pay-per-use | Map centered on Midtown, 1.5mi radius |
| **Store of the Week** | ⬛ Disabled | Featured store rotation | Free | Rotates every Monday |

---

## Status Key

| Icon | Meaning |
|---|---|
| 🟢 Live | Working on the site |
| 🟡 Ready to wire | Code done, just needs credentials or config |
| 🔴 Placeholder | Showing "coming soon" message, needs account setup |
| ⬛ Disabled | Intentionally off — future phase or too expensive |

---

## Credentials Checklist

All secrets go in `.env.local` (see `.env.template` for the full list). Never commit this file.

- [ ] `EVENTBRITE_API_KEY` — unlocks Eventbrite events (code already written)
- [ ] `REDDIT_CLIENT_ID` — Greg setting up account
- [ ] `REDDIT_CLIENT_SECRET` — Greg setting up account
- [ ] `ELFSIGHT_IG_ID` — for Instagram #nycwine widget
- [ ] `ELFSIGHT_PINTEREST_WIDGET_ID` — for Pinterest widget
- [ ] `MAILCHIMP_API_KEY` — for email signup
- [ ] `MAILCHIMP_LIST_ID`
- [ ] `MAILCHIMP_SERVER_PREFIX`
