// pages/api/concierge.js
// ─────────────────────────────────────────────────────────────
// NYC Wine Concierge — API route.
//
// Currently: mock response engine that drives the guided
// questionnaire flow. Each response includes:
//   reply   — the bot's text
//   options — array of { label, silly?, isJoke? }
//
// The GREETING (home screen) has "Make me laugh" as its 4th option.
// All deeper sub-flow options are real, helpful choices.
//
// TODO: Replace mock logic with real Claude API calls using
//       Anthropic SDK + RAG over site data. The option
//       structure stays the same — Claude will return JSON.
// ─────────────────────────────────────────────────────────────

// ── Mock conversation tree ──────────────────────────────────
// Keys are lowercase, trimmed versions of what the user sent.
// Unrecognised input falls through to the DEFAULT response.

const FLOWS = {

  // ── Root choices ──────────────────────────────────────────

  'find me a wine bar': {
    reply: "Great choice! NYC has incredible wine bars. What neighborhood are you heading to?",
    options: [
      { label: 'Manhattan'                 },
      { label: 'Brooklyn'                  },
      { label: 'Queens / Outer Boroughs'   },
      { label: 'Hoboken / Jersey City'     },
    ],
  },

  'recommend a wine shop': {
    reply: "Happy to help! Are you looking for anything specific?",
    options: [
      { label: 'Natural & organic wines'   },
      { label: 'Fine wine & rare bottles'  },
      { label: 'Everyday bottles under $30'},
      { label: 'Wine gifts & accessories'  },
    ],
  },

  'nyc wine events this week': {
    reply: "NYC's wine calendar is always packed! What kind of event sounds good?",
    options: [
      { label: 'Tastings & flights'        },
      { label: 'Winemaker dinners'         },
      { label: 'Wine & food pairings'      },
      { label: 'Wine classes & education'  },
    ],
  },

  // ── Neighborhood follow-ups (wine bar path) ───────────────

  manhattan: {
    reply: "Manhattan has some fantastic wine bars! Here are a few I love:\n\n• **Corkbuzz** (Chelsea) — educator-run, excellent list\n• **Veritas** (Flatiron) — legendary cellar\n• **The Ten Bells** (Lower East Side) — natural wine paradise\n\nWant to narrow it down by vibe?",
    options: [
      { label: 'Cozy & romantic'           },
      { label: 'Lively & social'           },
      { label: 'Serious wine nerd vibe'    },
      { label: 'Great wine + food menu'    },
    ],
  },

  brooklyn: {
    reply: "Brooklyn's wine scene has exploded in recent years! Some standouts:\n\n• **Four Horsemen** (Williamsburg) — James Beard–winning natural list\n• **Rolo's** (Greenpoint) — neighbourhood gem\n• **Stonefruit Espresso + Kitchen** (Crown Heights) — natural wine all day\n\nWhat neighbourhood in Brooklyn?",
    options: [
      { label: 'Williamsburg / Greenpoint' },
      { label: 'Park Slope / Cobble Hill'  },
      { label: 'Bushwick / Crown Heights'  },
      { label: 'DUMBO / Red Hook'          },
    ],
  },

  'queens / outer boroughs': {
    reply: "Queens and the other boroughs have hidden gems worth the trip!\n\n• **Domaine Wine Bar** (Astoria) — Greek-leaning list, great for the neighbourhood\n• **Shreya's** (Woodside) — natural wine meets South Asian flavours\n\nAny particular area?",
    options: [
      { label: 'Astoria / Long Island City'},
      { label: 'Flushing / Woodside'       },
      { label: 'The Bronx'                 },
      { label: 'Staten Island'             },
    ],
  },

  'hoboken / jersey city': {
    reply: "Just across the river — great spots without Manhattan prices!\n\n• **Madison Bar & Grill** (Hoboken) — solid wine selection, lively crowd\n• **Porta** (Jersey City) — great natural wine list, wood-fired food\n• **The Hutton** (Hoboken) — cozy neighbourhood wine bar\n\nAny vibe in mind?",
    options: [
      { label: 'Cozy & low-key'            },
      { label: 'Lively & social'           },
      { label: 'Good food too'             },
      { label: 'Find me a wine bar'        },
    ],
  },

  // ── Manhattan vibe follow-ups ─────────────────────────────

  'cozy & romantic': {
    reply: "Perfect for a date night or a quiet evening. In Manhattan try:\n\n• **Raoul's** (SoHo) — candlelit, intimate, legendary wine list\n• **Peasant** (NoLita) — rustic Italian wines in a beautiful space\n• **Il Buco** (NoHo) — wood-burning fireplace, superb Italian list\n\nCheck the **Wine Bars** page to explore more! 🍷",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'lively & social': {
    reply: "For a buzzy, fun evening with great wine:\n\n• **Anfora** (West Village) — packed, energetic, great by-the-glass\n• **Corkbuzz** (Chelsea) — sommelier-run, lively crowd\n• **Bar Pisellino** (West Village) — Italian aperitivo energy, stellar list\n\nCheck the **Wine Bars** page for the full scoop! 🥂",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'serious wine nerd vibe': {
    reply: "For the true oenophile — places where the list is the star:\n\n• **Veritas** (Flatiron) — one of NYC's most celebrated cellars\n• **Marea** (Midtown) — Italian whites and Burgundy specialists\n• **The NoMad Bar** (Midtown) — ambitious, rotating, impeccably sourced\n\nAlso worth browsing the **Wine Bars** page for curator picks! 🍾",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Fine wine & rare bottles'  },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'great wine + food menu': {
    reply: "Best of both worlds — these NYC spots nail both wine and food:\n\n• **Gramercy Tavern** — seasonal American, legendary wine program\n• **Lilia** (Williamsburg) — pasta heaven with a thoughtful Italian list\n• **Estela** (Nolita) — natural-leaning wine + inventive small plates\n\nBrowse **Wine Bars** for even more options! 🍝",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  // ── Brooklyn neighbourhood follow-ups ────────────────────

  'williamsburg / greenpoint': {
    reply: "North Brooklyn has some of NYC's best natural wine spots:\n\n• **Four Horsemen** (Williamsburg) — James Beard–winning, all-natural list\n• **Rolo's** (Greenpoint) — neighbourhood gem with rotating bottles\n• **Ops** (Bushwick/Williamsburg border) — wine + pizza, unbeatable combo\n\nSee more on the **Wine Bars** page! 🍷",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'park slope / cobble hill': {
    reply: "South Brooklyn's neighbourhood wine scene is thriving:\n\n• **June Wine Bar** (Cobble Hill) — intimate, European-focused list\n• **Bar Chord** (Crown Heights, close by) — craft beer + wine, laid-back\n• **Threes Brewing** (Gowanus) — wine on tap + great pours\n\nExplore the **Wine Bars** page for the full list! 🍷",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'bushwick / crown heights': {
    reply: "These Brooklyn neighbourhoods punch above their weight for wine:\n\n• **Stonefruit Espresso + Kitchen** (Crown Heights) — natural wine all day\n• **Fools Gold** (Bushwick) — wine + cocktails in a cool loft setting\n• **Sunshine Laundromat** (Greenpoint, nearby) — quirky, fun wine picks\n\nSee all spots on the **Wine Bars** page! 🍷",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'dumbo / red hook': {
    reply: "Waterfront wine vibes — some great finds in these areas:\n\n• **Hometown Bar-B-Que** (Red Hook) — surprisingly great bottle list with the BBQ\n• **Fort Defiance** (Red Hook) — neighbourhood classic, rotating wine picks\n• **Atrium DUMBO** (DUMBO) — stylish wine bar with stunning bridge views\n\nCheck the **Wine Bars** page for more! 🍷",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  // ── Outer boroughs ────────────────────────────────────────

  'astoria / long island city': {
    reply: "Queens' northwest corner is great for wine:\n\n• **Domaine Wine Bar** (Astoria) — Greek-influenced list, local favourite\n• **LIC Market** (Long Island City) — casual, good by-the-glass selection\n• **La Guli Pastry Shop** (Astoria) — Italian wines, old-school charm\n\nSee more on the **Wine Bars** page! 🍷",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'flushing / woodside': {
    reply: "Diverse and underrated for wine lovers:\n\n• **Shreya's** (Woodside) — natural wine meets South Asian flavours, a true gem\n• **The Wine Room** (Flushing) — great Asian wine selection, worth the trip\n\nThe **Wine Bars** page has more local picks! 🍷",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'the bronx': {
    reply: "The Bronx wine scene is small but growing!\n\n• **The Bronx Beer Hall** (Fordham) — craft drinks + a rotating wine selection\n• **Zero Otto Nove** (Arthur Avenue) — fantastic Italian wine list with great food\n• **Beccofino** (Riverdale) — neighbourhood Italian with a solid cellar\n\nCheck the **Wine Bars** page for the latest! 🍷",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'staten island': {
    reply: "Staten Island's wine scene is intimate and neighbourhood-driven:\n\n• **Vida** (St. George) — excellent Italian wines, great pasta too\n• **Enoteca Maria** (St. George) — nonnas cook, family wine list\n• **Beso** (St. George) — Spanish-influenced wine and tapas\n\nSee more on the **Wine Bars** page! 🍷",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  // ── Wine shop follow-ups ──────────────────────────────────

  'natural & organic wines': {
    reply: "NYC is one of the best cities in the world for natural wine! Try:\n\n• **Parcelle** (East Village) — curated, all natural\n• **Chambers Street Wines** (Tribeca) — serious natural & biodynamic selection\n• **Uva Wines & Spirits** (Williamsburg) — neighbourhood natural wine shop\n\nShall I look for something close to you?",
    options: [
      { label: "Yes — I'm in Manhattan"    },
      { label: "Yes — I'm in Brooklyn"     },
      { label: 'Just show me the best overall' },
      { label: "I'm in Queens or the Bronx"},
    ],
  },

  'fine wine & rare bottles': {
    reply: "For fine wine and collector bottles, these are top picks:\n\n• **Sherry-Lehmann** (Park Avenue) — NYC's most storied wine merchant\n• **Zachys** (White Plains, ships to NYC) — fine wine & auction house\n• **Acker Wines** (Upper West Side) — rare & aged Burgundy specialists\n\nAny particular region you're hunting?",
    options: [
      { label: 'Burgundy & Bordeaux'       },
      { label: 'Italian — Barolo, Brunello'},
      { label: 'California cult wines'     },
      { label: 'Champagne & sparkling'     },
    ],
  },

  'everyday bottles under $30': {
    reply: "Great everyday wine doesn't have to cost much! Best spots for value:\n\n• **Trader Joe's** — yes, genuinely great $10–15 options\n• **Total Wine** (multiple locations) — huge selection, competitive pricing\n• **K&D Wines** (Upper East Side) — fantastic staff picks under $25\n\nAny specific style you're after?",
    options: [
      { label: 'Crisp whites & rosés'      },
      { label: 'Easy-drinking reds'        },
      { label: 'Bubbles (Prosecco / Cava)' },
      { label: 'Bold reds (Malbec / Zin)'  },
    ],
  },

  'wine gifts & accessories': {
    reply: "For great wine gifts and accessories in NYC:\n\n• **Bottlerocket Wine & Spirit** (Flatiron) — gift-focused, beautifully organised\n• **Astor Wines & Spirits** (East Village) — huge selection + great gift sets\n• **Italian Wine Merchants** (Union Square) — premium gifting with expert guidance\n\nBrowse the **Wine Stores** page for even more options! 🎁",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  // ── Wine shop location follow-ups ─────────────────────────

  "yes — i'm in manhattan": {
    reply: "Best natural wine shops in Manhattan:\n\n• **Parcelle** (East Village) — serious natural curation\n• **Chambers Street Wines** (Tribeca) — biodynamic specialists\n• **Frankly Wines** (Tribeca) — small, excellent natural selection\n\nSee all stores on the **Wine Stores** page! 🍾",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  "yes — i'm in brooklyn": {
    reply: "Best natural wine shops in Brooklyn:\n\n• **Uva Wines & Spirits** (Williamsburg) — neighbourhood institution\n• **Slope Cellars** (Park Slope) — community favourite, strong natural list\n• **Gnarly Vines** (Cobble Hill) — curated, staff are incredibly helpful\n\nSee all stores on the **Wine Stores** page! 🍾",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'just show me the best overall': {
    reply: "NYC's absolute top natural wine shops, borough-agnostic:\n\n• **Parcelle** (East Village) — benchmark for NYC natural wine retail\n• **Chambers Street Wines** (Tribeca) — longest-running biodynamic specialist\n• **Uva Wines & Spirits** (Williamsburg) — beloved Brooklyn institution\n• **Astor Wines & Spirits** (East Village) — largest selection in the city\n\nSee the **Wine Stores** page for the full directory! 🍷",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Fine wine & rare bottles'  },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  "i'm in queens or the bronx": {
    reply: "Great natural wine options outside Manhattan and Brooklyn:\n\n• **Domaine Wine Bar** (Astoria, Queens) — doubles as a retail shop\n• **Zero Otto Nove** (Bronx) — great Italian natural wine selection\n• **Total Wine** (multiple outer borough locations) — solid natural section\n\nSee the **Wine Stores** page for nearby options! 🍷",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  // ── Fine wine region follow-ups ───────────────────────────

  'burgundy & bordeaux': {
    reply: "The classics — NYC has specialists who live for these regions:\n\n• **Acker Wines** (Upper West Side) — Burgundy obsessives, rare back-vintages\n• **Sherry-Lehmann** (Park Ave) — Bordeaux futures and aged bottles\n• **Zachys** (ships to NYC) — auction + retail for serious collectors\n\nSee the **Wine Stores** page for more! 🍷",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Fine wine & rare bottles'  },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'italian — barolo, brunello': {
    reply: "For serious Italian wine in NYC:\n\n• **Italian Wine Merchants** (Union Square) — the definitive NYC Italian specialist\n• **Vino** (East Village) — imports directly from small Italian producers\n• **Eataly** (multiple locations) — huge Italian selection, accessible to all levels\n\nSee the **Wine Stores** page for more! 🇮🇹",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Fine wine & rare bottles'  },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'california cult wines': {
    reply: "Hunting for cult Cali? NYC actually has great access:\n\n• **Sherry-Lehmann** (Park Ave) — allocations for Screaming Eagle, Harlan etc.\n• **Zachys** — auction house for secondary market cult bottles\n• **Crush Wine & Spirits** (Midtown) — strong California program\n\nSee the **Wine Stores** page for more! 🏆",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Fine wine & rare bottles'  },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'champagne & sparkling': {
    reply: "NYC is a great city for bubbles — here's where to shop:\n\n• **Flatiron Wines** (Flatiron) — excellent Grower Champagne selection\n• **Astor Wines** (East Village) — strong Champagne + Crémant + Cava\n• **Sherry-Lehmann** (Park Ave) — prestige cuvées and vintage Champagne\n\nSee the **Wine Stores** page for even more! 🥂",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Fine wine & rare bottles'  },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  // ── Everyday wine style follow-ups ───────────────────────

  'crisp whites & rosés': {
    reply: "Affordable crisp whites and rosés — can't go wrong with these:\n\n• **Trader Joe's** — Charles Shaw Pinot Grigio ($3!), great Provence rosés\n• **Total Wine** — dedicated rosé section, Côtes du Rhône whites under $15\n• **K&D Wines** — knowledgeable staff picks, often Albariño, Grüner, dry rosé\n\nSee the **Wine Stores** page for your nearest shop! 🌸",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'easy-drinking reds': {
    reply: "Great easy reds that won't break the bank:\n\n• **Trader Joe's** — Malbec, Côtes du Rhône, Beaujolais all under $15\n• **Total Wine** — huge selection of sub-$20 reds from every region\n• **Astor Wines** — Friday picks often feature value reds from obscure appellations\n\nSee the **Wine Stores** page for local options! 🍷",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'bubbles (prosecco / cava)': {
    reply: "Affordable bubbles for every occasion:\n\n• **Trader Joe's** — great Cava under $10, reliable Prosecco\n• **Total Wine** — dedicated sparkling section, often $7–15 options\n• **Astor Wines** — Spanish Cava and Italian Franciacorta gems under $25\n\nSee the **Wine Stores** page for your nearest shop! 🥂",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'bold reds (malbec / zin)': {
    reply: "Big, bold reds on a budget — you've got great options:\n\n• **Trader Joe's** — Argentine Malbec under $10, reliably delicious\n• **Total Wine** — Lodi Zinfandel, Petite Sirah, and Aussie Shiraz all under $20\n• **K&D Wines** — staff picks often include bold value reds from Spain and Italy\n\nSee the **Wine Stores** page! 🍷",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  // ── Events follow-ups ─────────────────────────────────────

  'tastings & flights': {
    reply: "Wine flights and walk-around tastings are all over NYC:\n\n• **Corkbuzz** hosts weekly flights and ticketed tasting events\n• **Astor Wines** runs free in-store tastings most Friday evenings\n• **Total Wine** (multiple locations) hosts regular tasting events\n\nCheck the **Events** page for the full weekly calendar! 🍷",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'winemaker dinners': {
    reply: "Winemaker dinners are some of NYC's best wine experiences:\n\n• **Gramercy Tavern** — regularly hosts acclaimed winemakers from around the world\n• **Del Posto** — Italian winemakers in an iconic setting\n• **Corkbuzz** — intimate dinners with visiting producers throughout the year\n\nCheck the **Events** page for upcoming dinners! 🍾",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'wine & food pairings': {
    reply: "Wine and food pairing events are a NYC specialty:\n\n• **Institute of Culinary Education** — runs regular pairing classes and events\n• **Eataly** — frequent food + wine pairing dinners across their NYC locations\n• **Corkbuzz** — pairing dinners and classes for all levels\n\nSee the **Events** page for the full calendar! 🍝",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

  'wine classes & education': {
    reply: "Want to level up your wine knowledge? NYC is the place:\n\n• **Corkbuzz** — WSET courses and casual classes for beginners\n• **International Wine Center** (Midtown) — WSET and Court of Master Sommeliers prep\n• **The French Culinary Institute** — wine programs for serious students\n• **Astor Wines** — free in-store education events regularly\n\nCheck the **Events** page for upcoming classes! 🎓",
    options: [
      { label: 'Find me a wine bar'        },
      { label: 'Recommend a wine shop'     },
      { label: 'NYC wine events this week' },
      { label: 'Make me laugh', isJoke: true },
    ],
  },

};

// ── Default / fallback response ──────────────────────────────
const DEFAULT_RESPONSE = {
  reply: "That's a great question! I'm still learning the full NYC wine map, but here's how I can help right now:",
  options: [
    { label: 'Find me a wine bar'        },
    { label: 'Recommend a wine shop'     },
    { label: 'NYC wine events this week' },
    { label: 'Make me laugh', isJoke: true },
  ],
};

// ── Wine jokes — cycled in order via jokeIndex ───────────────
// isJoke:true + jokeIndex in request → reply is jokes[jokeIndex % len]
// Options are re-served after each joke so user can keep clicking.

const JOKES = [
  "Wine is just grape juice that got a little naughty and never apologized.",
  "I don't need therapy… I just need a corkscrew and poor judgment.",
  "Wine: because sometimes water just isn't risky enough.",
  "I like my wine like I like my flirting… a little bold, slightly inappropriate, and best after dark.",
  "Wine makes everything better… except texting. You'll totally regret that later.",
  "I don't always drink wine… but when I do, my standards go down and my stories get better.",
  "I told my wine it needed to be more open… now it's spilling everything.",
  "Let's open a bottle and make pour decisions together.",
  "Sip Happens!",
  "I'm not saying wine is the answer… but it's worth a shot.",
  "Wine improves with age… I improve with wine.",
  "I only drink wine on days that end in 'y'… and occasionally during meetings.",
  "Wine doesn't judge… it just quietly agrees with all your bad decisions.",
  "Don't worry, you won't regret that last glass until the morning.",
  "I came for one glass of wine… and stayed because my morals left early.",
  "I bought a really expensive bottle of wine and saved it for a special occasion… then realized I'm the special occasion.",
  "I support small businesses… mostly wine bars that support my bad decisions.",
  "I asked the sommelier what pairs well with this wine… he said 'another bottle.'",
  "I let my wine breathe… now it won't stop overthinking everything.",
  "I told myself I'd only drink on special occasions… so now I celebrate minor achievements like opening the bottle.",
  "My wine rack has a very specific system… full and not full.",
  "I asked if the wine was dry… they said 'only if you don't open it.'",
  "I came for one glass… now I live here and know the bartender's zodiac sign.",
  "I dress like I have my life together… then order whatever's cheapest by the glass.",
  "I'm not high maintenance… I just have strong opinions about orange wine.",
  "I'm not avoiding my problems… I'm pairing them with a chilled red.",
  "If it's not a cute wine bar in the West Village, I'm not coming.",
  "I don't need closure… I need a table, a bottle, and my friends texting 'where are you.'",
];

// Re-presented after each joke so the user can keep going
const JOKE_OPTIONS = [
  { label: 'Find me a wine bar'        },
  { label: 'Recommend a wine shop'     },
  { label: 'NYC wine events this week' },
  { label: 'Make me laugh', isJoke: true },
];

// ── Handler ──────────────────────────────────────────────────
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, isJoke, jokeIndex } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message required' });
  }

  // Joke option — jokeIndex is already the resolved shuffled index from the client
  if (isJoke) {
    const idx   = (typeof jokeIndex === 'number' && jokeIndex >= 0 && jokeIndex < JOKES.length)
                  ? jokeIndex
                  : 0;
    const reply = JOKES[idx];
    return setTimeout(() => res.status(200).json({
      reply,
      options: JOKE_OPTIONS,
      isJoke:  true,
      jokeIdx: idx,   // returned so the client can key vote storage correctly
    }), 450);
  }

  const key = message.toLowerCase().trim();
  const response = FLOWS[key] || DEFAULT_RESPONSE;

  // Small artificial delay so the typing indicator feels natural
  // (In production this will be the real LLM latency)
  setTimeout(() => {
    res.status(200).json(response);
  }, 600);
}
