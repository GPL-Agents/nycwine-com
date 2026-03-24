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

| Source | Status | Feed URL | Needs keyword filter? | Cost | Notes |
|---|---|---|---|---|---|
| **NY Times** | 🟢 Live | Dining & Wine RSS | Yes | Free | Filter for wine-related keywords |
| **NY Post** | 🟢 Live | Food RSS | Yes | Free | Filter for wine-related keywords |
| **Eater NY** | 🟢 Live | NY feed RSS | Yes | Free | Filter for wine-related keywords |
| **Grub Street** | 🟢 Live | Main feed RSS | Yes | Free | Filter for wine-related keywords |
| **VinePair** | 🟢 Live | Main feed RSS | No (wine-only pub) | Free | No filtering needed |
| **Wine Spectator** | 🟢 Live | News RSS | No (wine-only pub) | Free | No filtering needed |
| **Decanter** | 🟢 Live | Main feed RSS | No (wine-only pub) | Free | No filtering needed |
| **Wine Enthusiast** | 🟢 Live | Magazine RSS | No (wine-only pub) | Free | No filtering needed |
| **Grape Collective** | 🟢 Live | NYC wine shop + magazine RSS | No (wine-only, NYC local) | Free | NYC-specific: store reviews, events, tastings. Based on Broadway, NYC |
| **Dame Wine** | 🟢 Live | Blog RSS | No (wine-only, NYC local) | Free | NYC-specific: "Celebrating Wine, Life and Inspiring Colorful People in New York City" |
| **SevenFifty Daily** | 🟢 Live | Industry magazine RSS | No (wine/spirits pub) | Free | Wine/spirits business and culture. NYC-based publication |
| **PUNCH** | 🟢 Live | Drinks magazine RSS | Yes | Free | Narrative journalism on wine, spirits, cocktails. Filter for wine keywords |
| **Wine Folly** | 🟢 Live | Education blog RSS | No (wine-only pub) | Free | Popular wine education site. Shareable, accessible content |

**Ticker:** Auto-generated from top 6 headlines.
**Refresh interval:** 60 minutes (in-memory cache in API route).
**Filter keywords:** wine, winery, vineyard, tasting, sommelier, champagne, rosé, bordeaux, pinot, chardonnay, merlot, cabernet, prosecco, cava, riesling + many more.

**Current state:** `NewsSection.jsx` fetches from `/api/news` on mount. Shows real articles with links. Source filter tabs built dynamically from API data. Loading and error states handled.
**API route:** `pages/api/news.js` — fetches all 13 RSS feeds in parallel, filters, merges, sorts by date, caches 60 min.
**Dependency:** `rss-parser` in package.json.
**NYC-local feeds:** Grape Collective and Dame Wine are flagged as `nycLocal: true` in the API for future prioritization.

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
