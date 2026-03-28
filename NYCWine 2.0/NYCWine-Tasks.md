# NYCWine 2.0 — Project Task Tracker

> **This is the source of truth for the NYCWine 2.0 project.**
> Claude reads this file at the start of each session to get up to speed, and updates it as work is completed and new ideas emerge.

---

## 📅 Session Log

### March 28, 2026
- Project folder created; site confirmed live
- Task tracker created and established as source of truth
- Identified placeholder/unconnected features: News RSS, Twitter, Facebook, Instagram, Maps, Chatbot
- Prioritized backlog into ASAP / Soon / Longer Term tiers
- **News audit:** RSS feeds are already live with 5 active sources (Decanter, Wine Enthusiast, VinePair, NY Post, SevenFifty Daily). 7 configured feeds are failing silently (blocked by publishers). 2 working feeds (Wine Folly, NY Times) were being buried by a 20-article cap.
- **News fixes applied to `pages/api/news.js`:**
  - Fixed keyword filter bug (was running after item mapping, so `contentSnippet` was already gone — now filters before map using full content)
  - Added per-source cap of 8 articles so prolific publishers (VinePair, Decanter) can't crowd out slower ones
  - Raised total article limit from 20 → 60 so all active sources surface
- Deploy via GitHub Desktop → Vercel to activate fixes. After deploy, check which sources now appear — any still missing are confirmed broken server-side and should be replaced.

---

## 🔴 Do ASAP

These are built or nearly-built items that just need to be wired up — low effort, high impact.

### News: RSS Feeds — Bug Fixes + Source Expansion *(in progress)*
- [x] RSS feeds are live — 5 sources confirmed working
- [x] Fixed keyword filter bug (was filtering by title only — now checks full content)
- [x] Added per-source cap (8 articles max) to prevent VinePair/Decanter from dominating
- [x] Raised article limit from 20 → 60 so all active sources appear
- [x] Removed confirmed-dead feeds: Wine Spectator, Grape Collective, Dame Wine (blocked server-side, no data returned)
- [x] Added Food & Wine (foodandwine.com/syndication/rss/all.rss) — keyword filtered
- [x] Added Jancis Robinson (jancisrobinson.com/rss) — wine-only critic
- [x] Flagged Eater NY + Grub St. as nycLocal: true
- [x] Filtered out no-image articles at source level (Jancis Robinson, PUNCH, Imbibe had none)
- [x] Converted source filter from underline tabs → wrapping pill style (matches event filters)
- [x] Fixed pill layout bug — buttons were display:block, forcing vertical stack; added display:inline-flex
- [x] Standardized source label color — removed per-source brand colors, all now use site hot pink (var(--rose))
- [ ] **Deploy latest CSS/JSX fixes and verify pills render horizontally**
- [ ] After deploy: visit nycwine.com/api/news and check which source tabs appear — anything still missing is confirmed dead server-side
- [ ] Replace any still-broken feeds (candidates in Ideas Parking Lot)

### X / Twitter Embed
- [ ] Ready to wire — just needs the embed code dropped in
- [ ] Add embed snippet to the Social section of the site
- [ ] Verify styling fits the layout

### Facebook Embed
- [ ] Embed is ready to go
- [ ] Drop embed code into the Social section
- [ ] Verify styling fits the layout

---

## 🟡 Do Soon

These require a bit of setup or external account access before they can go live.

### Instagram Integration
- [ ] Secure the **@nycwine** Instagram handle (if not already claimed)
- [ ] Create a **Meta Developer App** and get the necessary API credentials
- [ ] Replace the current placeholder with the live Instagram feed
- [ ] Test display on mobile and desktop

### Maps: Directions to Venues
- [ ] Add deep-link support to **Apple Maps** and **Google Maps** for every venue on the site
- [ ] Scope: wine bars, wine stores, and wineries
- [ ] Link format: tap/click opens Maps with destination pre-loaded
- [ ] Decide on a consistent UI pattern (button, icon, inline link)
- [ ] Test links on iOS, Android, and desktop browsers

---

## 🔵 Longer Term

More complex features that require planning, design, and/or external integrations.

### AI Chatbot / Concierge Agent
- [ ] Design the conversational flow and decision tree
- [ ] User is greeted and asked what they'd like help with
- [ ] **Core use cases to support:**
  - [ ] Find a wine bar
  - [ ] Plan a night out
  - [ ] Plan a winery weekend
  - [ ] Order wine for delivery
- [ ] Choose a chatbot platform or build custom (e.g., OpenAI, Claude API, Intercom, etc.)
- [ ] Design UI widget — floating button, sidebar, or inline
- [ ] Connect to venue data and wine delivery options already on the site
- [ ] Test across all use case flows
- [ ] Mobile-friendly UI review

---

## 📋 Ideas Parking Lot

Features and ideas to evaluate — not yet scoped or prioritized.

### News: Candidate Replacement / New RSS Sources
To replace broken feeds (Wine Spectator, PUNCH, Eater NY, Grub St., Grape Collective, Dame Wine, Imbibe) and expand coverage:
- **Food & Wine** — mainstream editorial, good wine coverage, filter by keyword
- **Bon Appétit** — mainstream food/drink, filter by keyword
- **Wine-Searcher News** — price and market news, wine-specific
- **Punch Drink** — try alternate URL (punchdrink.com has wine/spirits longform)
- **Eater NY** — try alternate Vox Media feed URL (current one blocks)
- **Jancis Robinson** — premium wine critic blog, widely respected

---

## ✅ Completed

*(Completed items move here with a date)*

---

*Updated by Claude at the end of each session. To add tasks or ideas, just mention them in conversation.*
