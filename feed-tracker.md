# NYCWine.com — Feed & Integration Tracker

Last updated: 2026-03-23

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
| **Eventbrite API** | 🔴 Placeholder | Pull wine events near NYC | Eventbrite developer account | `EVENTBRITE_API_KEY` | Free tier | Search: wine, tasting, sommelier, etc. 10mi radius of NYC. Limit 10 on homepage |
| **NYC Open Data** | 🔴 Placeholder | City arts/entertainment events | None (public API) | None | Free | URL: `data.cityofnewyork.us/resource/tvpp-9vvx.json` |

**Current state:** `EventsSection.jsx` shows 5 hardcoded sample events + 3 list items.
**To go live:** Build an API route that fetches from Eventbrite + Open Data, replace `PLACEHOLDER_EVENTS` with real data.

---

## 2. SOCIAL FEEDS (community content only — "hub not publisher")

| Platform | Status | Method | Account needed | Env vars required | Cost | Notes |
|---|---|---|---|---|---|---|
| **Reddit** | 🟢 Live (needs credentials) | Reddit API via `/api/reddit` | Reddit developer app | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` | Free | r/wine + r/nyc + r/FoodNYC, filtered for wine content, sorted by popularity. 30min cache. Shows "needs setup" message until env vars added |
| **Instagram #nycwine** | 🔴 Placeholder | Elfsight widget | Elfsight account (free tier available) | `ELFSIGHT_IG_ID` | Free tier or ~$5/mo | Community photos tagged #nycwine. Only practical method — Meta blocks hashtag API |
| **Pinterest "NYC wine"** | 🔴 Placeholder | Elfsight widget | Elfsight account (free tier available) | `ELFSIGHT_PINTEREST_WIDGET_ID` | Free tier or ~$5/mo | Community pins about NYC wine |

### Removed (only show our own posts — doesn't fit hub model)

| Platform | Status | Reason |
|---|---|---|
| **Facebook** | ⬛ Removed | Page Plugin only shows our own posts. No FB API for community/hashtag content |
| **X / Twitter** | ⬛ Removed | Timeline embed only shows our own tweets. Hashtag search costs $100/mo |
| **Instagram own account** | ⬛ Removed | Graph API only shows our own posts |

**Current state:** Reddit card is wired to `/api/reddit` (live once credentials added). Instagram and Pinterest cards show placeholders until Elfsight is set up.
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

**Ticker:** Auto-generated from top 6 headlines.
**Refresh interval:** 60 minutes (in-memory cache in API route).
**Filter keywords:** wine, winery, vineyard, tasting, sommelier, champagne, rosé, bordeaux, pinot, chardonnay, merlot, cabernet, prosecco, cava, riesling + many more.

**Current state:** `NewsSection.jsx` fetches from `/api/news` on mount. Shows real articles with links. Source filter tabs work. Loading and error states handled.
**API route:** `pages/api/news.js` — fetches all 8 RSS feeds in parallel, filters, merges, sorts by date, caches 60 min.
**Dependency added:** `rss-parser` in package.json.

---

## 4. WINE STORES DIRECTORY

| Integration | Status | What it does | Account needed | Env vars required | Cost | Notes |
|---|---|---|---|---|---|---|
| **Supabase database** | 🔴 Placeholder | Store wine stores, bars, wineries | Supabase account | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Free tier | Tables: wine_stores, wine_bars, wineries, store_of_week |

**Current state:** `StoresSection.jsx` shows 5 hardcoded preview stores. Wineries card says "Coming in V1".
**To go live:** Set up Supabase project, create tables, import `wine-stores-manhattan.csv`, query from component.
**Data available:** 335 Manhattan wine stores from CSV (more boroughs to come).

---

## 5. EMAIL SIGNUP

| Integration | Status | What it does | Account needed | Env vars required | Cost | Notes |
|---|---|---|---|---|---|---|
| **Mailchimp** | 🔴 Not wired | Email newsletter signup | Mailchimp account | `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID`, `MAILCHIMP_SERVER_PREFIX` | Free up to 500 contacts | Need to fill in `embedActionUrl` and `listId` in integrations-config.js |

**Current state:** Configured in `integrations-config.js` but no signup form exists in any component yet.
**To go live:** Create Mailchimp account, get embed action URL, add signup form component to footer or homepage.

---

## 6. ADVERTISING

| Integration | Status | What it does | Account needed | Env vars required | Cost | Notes |
|---|---|---|---|---|---|---|
| **Google AdSense** | 🟢 Live | Display ads (primary revenue) | ✅ Approved — ca-pub-6782277104310503 | Script loaded in `_app.js` | Free (revenue generating) | 3 responsive ad units placed: after-events, after-social, after-news. Auto-sizes for mobile/desktop |

**Current state:** AdSense script loaded globally via `next/script`. Three `<AdUnit>` components placed between content sections. Ads are responsive (`data-ad-format="auto"` + `data-full-width-responsive="true"`).
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
| 🟡 Ready to wire | No account/key needed, just code changes |
| 🔴 Placeholder | Showing dummy data, needs account setup + code |
| ⬛ Disabled | Intentionally off — future phase or too expensive |

---

## Credentials Checklist

All secrets go in `.env.local` (see `.env.template` for the full list). Never commit this file.

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `EVENTBRITE_API_KEY`
- [ ] `REDDIT_CLIENT_ID`
- [ ] `REDDIT_CLIENT_SECRET`
- [ ] `INSTAGRAM_ACCESS_TOKEN`
- [ ] `FACEBOOK_APP_ID`
- [ ] `ELFSIGHT_IG_ID` (if using Elfsight for Instagram hashtags)
- [ ] `ELFSIGHT_PINTEREST_WIDGET_ID` (if using Elfsight for Pinterest)
- [ ] `MAILCHIMP_API_KEY`
- [ ] `MAILCHIMP_LIST_ID`
- [ ] `MAILCHIMP_SERVER_PREFIX`
- [ ] `GOOGLE_AD_PUBLISHER_ID`
