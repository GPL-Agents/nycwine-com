# NYCWine.com — Feed & Integration Tracker

Last updated: 2026-03-23

---

## Project Goals

1. **Live on nycwine.com, mobile-first.** Site is hosted on Vercel. All integrations must work well on mobile.
2. **Hub, not publisher.** Zero original content. Everything comes from external feeds, APIs, widgets, and embeds. The site curates and aggregates all things wine in NYC. Architecture should make adding new sources easy.
3. **Google AdSense for revenue.** ✅ Approved — publisher ID `ca-pub-6782277104310503`. Three responsive ad units live on homepage.

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

## 2. SOCIAL FEEDS

### Box A — "From @nycwine" (our accounts)

| Platform | Status | Method | Account needed | Env vars required | Cost | Notes |
|---|---|---|---|---|---|---|
| **X / Twitter** | 🟡 Ready to wire | Free timeline embed | @nycwine X account | None | Free | Embed from `publish.twitter.com`. No API key needed |
| **Instagram** | 🔴 Placeholder | Basic Display API | @nycwine IG + Meta developer app | `INSTAGRAM_ACCESS_TOKEN` | Free | Shows 6 posts. Token expires every 60 days — needs refresh flow |
| **Facebook** | 🟢 Live | Meta Page Plugin (iframe) | NYCWine Facebook Page (facebook.com/NYCWine) | None (free iframe embed) | Free | Shows timeline. No API key needed for basic page plugin |
| **Pinterest** | 🔴 Placeholder | Board embed or Elfsight | nycwine Pinterest account | Board embed URL or `ELFSIGHT_PINTEREST_ID` | Free (embed) or ~$5/mo (Elfsight) | Need to fill in `boardEmbedUrl` in integrations-config.js |

### Box B — "Around NYC Right Now" (community/hashtag posts)

| Platform | Status | Method | Account needed | Env vars required | Cost | Notes |
|---|---|---|---|---|---|---|
| **Instagram hashtags** | 🔴 Placeholder | Elfsight widget | Elfsight account | `ELFSIGHT_IG_ID` | ~$5/mo | Only practical way — Meta blocks hashtag search for third parties. Grid 3 cols, 9 posts |
| **X hashtag search** | ⬛ Disabled | X API Basic | X developer account | `X_API_BEARER_TOKEN` | $100/mo | Expensive. Disabled in config. Query: `#nycwine OR #winenyc` |
| **Pinterest community** | 🔴 Placeholder | Elfsight widget | Elfsight account | `ELFSIGHT_PINTEREST_WIDGET_ID` | ~$5/mo | Search term: "NYC wine", 6 posts |
| **Facebook hashtags** | ⬛ Disabled | N/A | N/A | N/A | N/A | Meta does not allow public hashtag search via API. Not feasible |
| **Reddit** | 🔴 Placeholder | Reddit API | Reddit developer app | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` | Free | Subreddits: r/wine, r/nyc, r/FoodNYC. 3 posts, sort by hot |

**Current state:** `SocialSection.jsx` shows 5 cards with dummy text/emoji placeholders.
**To go live:** Each card needs its embed script or API call wired in, replacing the placeholder `<div>` contents.

---

## 3. NEWS / RSS FEEDS

| Source | Status | Feed URL | Needs keyword filter? | Cost | Notes |
|---|---|---|---|---|---|
| **NY Times** | 🔴 Placeholder | Dining & Wine RSS | Yes | Free | Filter for wine-related keywords |
| **NY Post** | 🔴 Placeholder | Food RSS | Yes | Free | Filter for wine-related keywords |
| **Eater NY** | 🔴 Placeholder | NY feed RSS | Yes | Free | Filter for wine-related keywords |
| **Grub Street** | 🔴 Placeholder | Main feed RSS | Yes | Free | Filter for wine-related keywords |
| **VinePair** | 🔴 Placeholder | Main feed RSS | No (wine-only pub) | Free | No filtering needed |
| **Wine Spectator** | 🔴 Placeholder | News RSS | No (wine-only pub) | Free | No filtering needed |
| **Decanter** | 🔴 Placeholder | Main feed RSS | No (wine-only pub) | Free | No filtering needed |
| **Wine Enthusiast** | 🔴 Placeholder | Magazine RSS | No (wine-only pub) | Free | No filtering needed |

**Ticker:** Currently hardcoded sample text. Will pull headlines from the same RSS feeds.
**Refresh interval:** 60 minutes (configured in `integrations-config.js`).
**Filter keywords:** wine, winery, vineyard, tasting, sommelier, champagne, rosé, bordeaux, pinot, chardonnay, merlot, cabernet, prosecco, cava, riesling.

**Current state:** `NewsSection.jsx` shows 8 hardcoded sample articles + a static ticker.
**To go live:** Build a Next.js API route (or `getServerSideProps`) that fetches all RSS feeds server-side, filters by keyword, merges, sorts by date, and returns to the component.

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
