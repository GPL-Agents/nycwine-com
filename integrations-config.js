/**
 * NYCWine.com — Integrations Configuration
 * ─────────────────────────────────────────
 * This file contains all non-secret settings for third-party integrations:
 * widget IDs, embed script URLs, RSS feed URLs, and public API endpoints.
 *
 * SAFE TO SHARE with developers. Do NOT put API keys or passwords here.
 * API keys and secrets go in the .env.local file (see .env.template).
 *
 * How to use: when the site is being built, copy this file into the
 * Next.js project at: /config/integrations.js
 *
 * Last updated: March 2026
 */

const integrations = {

  // ─────────────────────────────────────────────────────────────
  // SECTION 1 · EVENTS
  // Source: Eventbrite API (free tier)
  // Docs: https://www.eventbrite.com/platform/api
  // ─────────────────────────────────────────────────────────────
  events: {
    eventbrite: {
      enabled: true,
      // Search terms used to filter wine events in NYC
      searchKeywords: ["wine", "tasting", "sommelier", "winery", "vineyard", "champagne", "rosé", "bordeaux"],
      location: "New York City, NY",
      radiusMiles: 10,
      // How many events to show on homepage
      homepageLimit: 10,
      // API key goes in .env.local as EVENTBRITE_API_KEY
    },
    // Secondary source — NYC.gov Open Data events feed
    nycGovEvents: {
      enabled: true,
      feedUrl: "https://data.cityofnewyork.us/resource/tvpp-9vvx.json",
      category: "arts & entertainment",
    },
  },

  // ─────────────────────────────────────────────────────────────
  // SECTION 2 · SOCIAL FEEDS
  //
  // Two distinct boxes on the site:
  //
  //   Box A — "From @nycwine"
  //     Shows posts published by the NYCWine.com accounts themselves
  //     (your own Instagram, X, Facebook content)
  //
  //   Box B — "Around NYC Right Now"
  //     Shows the public's posts that include #nycwine or related tags
  //     (community content from anyone using the hashtag)
  //
  // ─────────────────────────────────────────────────────────────
  social: {

    // ── BOX A: OUR OWN ACCOUNTS ─────────────────────────────────
    // Shows content posted BY @nycwine / NYCWine Facebook / etc.
    ourAccounts: {

      instagram: {
        enabled: true,
        handle: "@nycwine",
        profileUrl: "https://www.instagram.com/nycwine",
        // Instagram Basic Display API — shows your own posts
        // Access token goes in .env.local as INSTAGRAM_ACCESS_TOKEN
        // Free, just needs a connected Facebook developer app
        postsToShow: 6,
      },

      twitter_x: {
        enabled: true,
        handle: "@nycwine",
        profileUrl: "https://twitter.com/nycwine",
        // Free timeline embed — shows your own @nycwine tweets
        // No API key needed for basic embed
        embedTimelineUrl: "https://twitter.com/nycwine",
        postsToShow: 5,
      },

      facebook: {
        enabled: true,
        pageName: "NYCWine",
        pageUrl: "https://www.facebook.com/NYCWine",
        // Meta Page Plugin — free, shows your Facebook page posts
        // Requires Facebook App ID (free) → goes in .env.local as FACEBOOK_APP_ID
        showTimeline: true,
        showEvents: true,
        postsToShow: 5,
      },

      pinterest: {
        enabled: true,
        handle: "nycwine",
        profileUrl: "https://www.pinterest.com/nycwine",
        // Pinterest board embed — free, no API key needed
        // FILL IN: your Pinterest board embed URL after account setup
        boardEmbedUrl: "YOUR_PINTEREST_BOARD_EMBED_URL",
      },

    },

    // ── BOX B: COMMUNITY POSTS (#nycwine) ────────────────────────
    // Shows anyone's posts that include #nycwine or related hashtags.
    // This is the public "what NYC wine lovers are posting right now" feed.
    communityHashtags: {

      hashtags: ["nycwine", "winenyc", "nycwinebar", "newyorkwine", "naturalwinenyc"],

      instagram: {
        enabled: true,
        // Elfsight widget — only practical way to show IG hashtag feeds
        // Meta's API does not allow hashtag search for third parties
        // Cost: ~$5/month at https://elfsight.com/instagram-feed-widget/
        // FILL IN: your Elfsight widget ID after account setup
        elfsightWidgetId: "YOUR_ELFSIGHT_INSTAGRAM_WIDGET_ID",
        elfsightScriptUrl: "https://static.elfsight.com/platform/platform.js",
        gridColumns: 3,
        postsToShow: 9,
      },

      twitter_x: {
        enabled: false, // hashtag search requires X API Basic ($100/month)
        // Set enabled: true and add X_API_BEARER_TOKEN in .env.local to activate
        searchQuery: "#nycwine OR #winenyc",
        postsToShow: 5,
      },

      pinterest: {
        enabled: true,
        // Elfsight Pinterest widget for hashtag content
        elfsightWidgetId: "YOUR_ELFSIGHT_PINTEREST_WIDGET_ID",
        searchTerm: "NYC wine",
        postsToShow: 6,
      },

      facebook: {
        enabled: false,
        // Meta does not allow public hashtag search via API for third parties
        // Facebook Page Plugin (Box A above) is the practical Facebook option
      },

      reddit: {
        enabled: true,
        // Reddit API — free tier, 100 req/min
        // Credentials go in .env.local as REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET
        subreddits: ["wine", "nyc", "FoodNYC"],
        searchKeywords: ["wine", "winery", "tasting", "sommelier", "vineyard", "NYC"],
        postsToShow: 3,
        sortBy: "hot", // hot | new | top
      },

    },

  },

  // ─────────────────────────────────────────────────────────────
  // SECTION 3 · WINE NEWS  (RSS Feeds)
  // All free — no API keys needed
  // ─────────────────────────────────────────────────────────────
  news: {
    // How often to refresh feeds (minutes)
    refreshIntervalMinutes: 60,
    // Number of stories shown on homepage
    homepageLimit: 8,
    // Keywords used to filter non-wine stories from general news feeds
    filterKeywords: ["wine", "winery", "vineyard", "tasting", "sommelier",
                     "champagne", "rosé", "bordeaux", "pinot", "chardonnay",
                     "merlot", "cabernet", "prosecco", "cava", "riesling"],

    feeds: [
      {
        id: "nytimes",
        name: "NY Times",
        url: "https://rss.nytimes.com/services/xml/rss/nyt/DiningandWine.xml",
        filterByKeyword: true, // filter for wine-related stories only
        color: "#1a1a1a",
        emoji: "🗽",
      },
      {
        id: "nypost",
        name: "NY Post",
        url: "https://nypost.com/food/feed/",
        filterByKeyword: true,
        color: "#d44000",
        emoji: "📰",
      },
      {
        id: "eatery",
        name: "Eater NY",
        url: "https://ny.eater.com/rss/index.xml",
        filterByKeyword: true,
        color: "#c0392b",
        emoji: "🍴",
      },
      {
        id: "grubstreet",
        name: "Grub Street",
        url: "https://www.grubstreet.com/rss/index.xml",
        filterByKeyword: true,
        color: "#888888",
        emoji: "🍽",
      },
      {
        id: "vinepair",
        name: "VinePair",
        url: "https://vinepair.com/feed/",
        filterByKeyword: false, // wine-only publication, no filter needed
        color: "#c0392b",
        emoji: "🍷",
      },
      {
        id: "winespectator",
        name: "Wine Spectator",
        url: "https://www.winespectator.com/rss/rss?t=news",
        filterByKeyword: false,
        color: "#8e44ad",
        emoji: "🍾",
      },
      {
        id: "decanter",
        name: "Decanter",
        url: "https://www.decanter.com/feed/",
        filterByKeyword: false,
        color: "#2980b9",
        emoji: "🥂",
      },
      {
        id: "winenthusiast",
        name: "Wine Enthusiast",
        url: "https://www.winemag.com/feed/",
        filterByKeyword: false,
        color: "#16a085",
        emoji: "📖",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // WINE STORE DIRECTORY — Schema & Filter Definitions
  // Data lives in Supabase. Managed via the Excel file in store-data/
  // ─────────────────────────────────────────────────────────────
  wineStores: {

    // ── Status field ───────────────────────────────────────────
    // Controls whether a store appears on the site.
    // Stores are NEVER deleted — only deactivated. This preserves history.
    statusOptions: {
      active:      "Live on site — visible to all visitors",
      inactive:    "Hidden from site — store closed or removed by request",
      unverified:  "Added but not yet confirmed as open — shown with caution badge",
    },

    // ── Service tags ───────────────────────────────────────────
    // Used as filter pills on the Wine Stores page and on the homepage list.
    // Values: "yes" | "no" | "unknown"
    // Displayed as badges on store cards.
    serviceTags: [
      {
        id:          "online_ordering",
        label:       "Online Ordering",
        badgeIcon:   "🛒",
        badgeColor:  "#2980b9",   // blue
        filterLabel: "Order Online",
        description: "Store has a website where wine can be ordered and paid for online",
      },
      {
        id:          "delivery",
        label:       "Delivery",
        badgeIcon:   "🚚",
        badgeColor:  "#16a085",   // teal
        filterLabel: "Delivers",
        description: "Store offers home delivery (fee may apply)",
      },
      {
        id:          "free_delivery",
        label:       "Free Delivery",
        badgeIcon:   "🎁",
        badgeColor:  "#27ae60",   // green
        filterLabel: "Free Delivery",
        description: "Store offers free delivery (may require minimum order)",
      },
    ],

    // ── Filter pills shown on the Wine Stores page ─────────────
    // Users can combine these — e.g. "Manhattan" + "Delivers"
    filterGroups: [
      {
        id:    "borough",
        label: "Borough",
        type:  "single",  // only one borough at a time
        options: ["All NYC", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"],
      },
      {
        id:    "services",
        label: "Services",
        type:  "multi",   // can combine e.g. Delivers + Free Delivery
        options: ["Online Ordering", "Delivers", "Free Delivery"],
      },
    ],

    // ── Default sort order on store listing ────────────────────
    defaultSort: "neighborhood", // neighborhood | name | recently_added

    // ── How many stores to show on the homepage preview ────────
    homepagePreviewCount: 5,
  },

  // ─────────────────────────────────────────────────────────────
  // SECTION 4 · GET WINE DELIVERED  (V1 — not in MVP)
  // Google Maps + neighborhood filter. Comes after MVP launch.
  // ─────────────────────────────────────────────────────────────
  delivery: {
    enabled: false, // V1 feature — set to true when building
    googleMaps: {
      // Google Maps JavaScript API + Places API
      // Enable at: https://console.cloud.google.com
      // Free tier: Maps Embed unlimited, Places up to 10,000 req/month
      // API key goes in .env.local as GOOGLE_MAPS_API_KEY
      defaultCenter: { lat: 40.7580, lng: -73.9855 }, // Midtown NYC
      defaultZoom: 13,
      searchRadiusMiles: 1.5,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // SECTION 5 · WINE STORE OF THE WEEK  (V1 — not in MVP)
  // ─────────────────────────────────────────────────────────────
  storeOfTheWeek: {
    enabled: false, // V1 feature — set to true when building
    rotationDay: 1, // Monday
  },

  // ─────────────────────────────────────────────────────────────
  // DATABASE  (Supabase — free tier)
  // Supabase project URL and anon key go in .env.local
  // ─────────────────────────────────────────────────────────────
  supabase: {
    // Tables that will be created:
    tables: {
      wineStores:  "wine_stores",   // 335 Manhattan stores (more boroughs coming)
      wineBars:    "wine_bars",     // NYC wine bars
      wineries:    "wineries",      // NY/NJ/CT/PA wineries within driving distance
      storeOfWeek: "store_of_week", // rotation log
    },
    // Supabase project URL + anon key go in .env.local
  },

  // ─────────────────────────────────────────────────────────────
  // EMAIL SIGNUP  (Mailchimp — free up to 500 contacts)
  // ─────────────────────────────────────────────────────────────
  email: {
    mailchimp: {
      enabled: true,
      // Get your embed form URL from: Mailchimp → Audience → Signup forms → Embedded forms
      // FILL IN: paste your Mailchimp embed action URL here
      embedActionUrl: "YOUR_MAILCHIMP_EMBED_ACTION_URL",
      // e.g. "https://nycwine.us1.list-manage.com/subscribe/post?u=XXXXXX&id=XXXXXX"
      listId: "YOUR_MAILCHIMP_LIST_ID",
    },
  },

  // ─────────────────────────────────────────────────────────────
  // ADVERTISING
  // ─────────────────────────────────────────────────────────────
  ads: {
    // ACTION REQUIRED: log in to ads.google.com and confirm which
    // account type you have: Google Ads, AdSense, or Ad Manager.
    // AdSense restricts wine/alcohol content publishers.
    // Ad Manager does not. Use Ad Manager for this site.
    provider: "CONFIRM_ACCOUNT_TYPE", // "adsense" | "ad_manager" | "direct"
    // Publisher ID goes in .env.local as GOOGLE_AD_PUBLISHER_ID
    // Ad slot IDs (non-secret, fine to list here once you have them):
    adSlots: {
      homepageBanner:  "YOUR_AD_SLOT_ID_BANNER",
      homepageSidebar: "YOUR_AD_SLOT_ID_SIDEBAR",
      eventsPage:      "YOUR_AD_SLOT_ID_EVENTS",
    },
  },

  // ─────────────────────────────────────────────────────────────
  // PHASE 2 (not needed at launch — here for future reference)
  // ─────────────────────────────────────────────────────────────
  phase2: {
    wineSearcher: {
      enabled: false,
      // $250/month — 500 API calls/day
      // API key goes in .env.local as WINE_SEARCHER_API_KEY
      baseUrl: "https://api.wine-searcher.com/api/v1",
    },
    youtube: {
      enabled: false,
      // YouTube Data API v3 — free (10,000 units/day)
      channelSearchTerms: ["NYC wine", "New York wine tasting", "wine bar NYC"],
      // API key goes in .env.local as YOUTUBE_API_KEY
    },
  },

};

module.exports = integrations;
