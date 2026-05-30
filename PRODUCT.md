# Bridge Buddy — Product Brief
> Living document. Update this as decisions are made. Last updated: 2026-05-29 (session 2).
> **Working name:** Bridge Buddy (placeholder — real name still TBD, see §10/§11).
> **Latest change:** **Phase 1 (bridge lookup) functionally complete (2026-05-29) — pending iPhone Safari visual check + deploy.** Search (Nominatim, case-insensitive, deduped, region labels) → results list with structure badge → detail page (badge, facts, Wikipedia summary/photo, OSM-embed map pin). Pipeline `Nominatim → Overpass(bbox) → Wikidata → Wikipedia` verified live. Not yet committed/pushed (batched). See **Current status**.

---

## Current status — 2026-05-29 (end of session 2)

**Active phase:** Phase 1 — Bridge lookup (no auth). **Phase 0 is closed** (all sub-steps ✅).

### Done

| Sub-step | Status | Notes |
|---|---|---|
| 0a — Validate Overpass + Wikipedia | ✅ | Throwaway script `phase-0/validate-apis.mjs`. Both APIs work. Surfaced that bridges are many OSM elements, not one (Brooklyn=31 ways, Hawthorne=69), and that `bridge:structure` is missing for some famous bridges (GWB). See §7 "Phase 0 findings." |
| 0a′ — Test Wikidata as fallback | ✅ | `phase-0/test-wikidata.mjs` + `phase-0/inspect-all-tags.mjs`. Wikidata's `P31 instance of` recovers structure type for GWB (suspension) and exposes hybrid bridges for Brooklyn (suspension + cable-stayed). Resolved open decision #7 — Wikidata is now MVP-tier. |
| 0b — Scaffold Vite + React + Tailwind | ✅ | `app/` subfolder. React 19.2 + TypeScript 6 + Tailwind v4 + Vite 8. iPhone viewport meta tags set in `app/index.html`. Default Vite demo assets removed. `npm run build` passes. |
| 0c — Wire up Supabase client | ✅ | `@supabase/supabase-js` installed. `app/src/lib/supabase.ts` reads env vars. **Supabase project provisioned (ref `vtqdcxzyfxainyfshcoz`).** Credentials stored in `app/.env.local` (gitignored). Smoke-tested: `GET /auth/v1/health` returns 200 OK with valid anon key. |

| 0d — Deploy empty shell to Vercel | ✅ | GitHub push done (`origin/main` = `f8dd776`, no secrets leaked). Vercel project imported with **Root Directory = `app`** (first deploy 404'd because that wasn't set; fixed + redeployed). Live at https://bridge-buddy-zeta.vercel.app — root + both assets return 200, asset hashes match local build. 2 Supabase env vars set in Vercel (not yet exercised — `App.tsx` is a static placeholder, no Supabase import). |

| 0e — Verify shell loads on iPhone Safari | ✅ | **Final Phase 0 gate (§5.5) — confirmed 2026-05-29.** User opened https://bridge-buddy-zeta.vercel.app in iPhone Safari: "Bridge Buddy / Coming soon" renders, no console errors, looks right at 390px. **Phase 0 closed.** |

### Resume here (next session) — exact steps

**Phase 0 is closed — all sub-steps ✅.** **Phase 1 begins** — bridge lookup (no auth), built on the OSM aggregated → Wikidata → Wikipedia pipeline. Resolve open decisions #2 (map library), #3 (color palette), #4 ("unknown structure" display), #5 (Overpass timeout), #6 (Wiki disambiguation), #8 (OSM↔Wikidata conflict), #9 (Wikidata→9-type mapping) before/during Phase 1. Note: auto-deploy on `git push` is now wired (Vercel ↔ GitHub), so Phase 1 work ships to the same URL on every push to `main`.

### Project facts to carry forward

- **GitHub repo:** https://github.com/joshmei/BridgeBuddy.git (pushed — `origin/main` = `f8dd776`)
- **Live URL:** https://bridge-buddy-zeta.vercel.app (Vercel, Root Directory = `app`, auto-deploys on push to `main`)
- **Supabase project ref:** `vtqdcxzyfxainyfshcoz` (URL: `https://vtqdcxzyfxainyfshcoz.supabase.co`)
- **Anon key JWT payload:** `{iss: 'supabase', role: 'anon', exp: 2036}` — verified before storing
- **Local commit SHA:** `f8dd776` (root-commit, main branch, 23 files, identity `joshmei <jgoog612@gmail.com>` via env vars — no git config was modified)
- **`gh` install path:** via `winget install --id GitHub.cli` (already completed)

### Code layout

```
Bridge/
├── PRODUCT.md           ← this file (the brief)
├── CLAUDE.md            ← instructions for future Claude sessions
├── .gitignore           ← repo root (.claude/ excluded so settings.local.json stays private)
├── phase-0/             ← throwaway API validation scripts (keep for reference)
│   ├── validate-apis.mjs
│   ├── inspect-all-tags.mjs
│   └── test-wikidata.mjs
└── app/                 ← the Vite app
    ├── src/
    │   ├── App.tsx           (minimal "Coming soon" placeholder)
    │   ├── index.css         (Tailwind v4 import only)
    │   ├── main.tsx
    │   └── lib/supabase.ts   (env-driven client, throws if missing keys)
    ├── .env.example          (committed — template)
    ├── .env.local            (gitignored — has real Supabase creds)
    ├── index.html            (iPhone viewport meta tags set)
    ├── package.json
    └── vite.config.ts        (Tailwind + React plugins)
```

### Decisions logged this session (2026-05-28 / 2026-05-29)
- Working name set to **Bridge Buddy** (placeholder; §10, §11 #1)
- Build phases 0–7 documented (§5.5)
- Beta location-tracking gets a one-tap homescreen toggle (§5, §5.5 Phase 5, §10)
- **Three-source data pipeline confirmed:** OSM aggregated → Wikidata → Wikipedia → "unknown" (§7)
- Vite scaffold lives in `app/` subfolder (chosen over root for cleaner doc/code separation)
- TypeScript chosen over JS (not in §8 originally — picked for bridge-data optional-field safety)
- Tailwind v4 (no PostCSS config, `@import "tailwindcss"` in `src/index.css`, `@tailwindcss/vite` plugin)
- First commit author identity set via one-off env vars (`GIT_AUTHOR_*` / `GIT_COMMITTER_*`) — no git config modified. If `joshmei <jgoog612@gmail.com>` is wrong, amend the first commit before pushing.
- Memory file written: `collaboration-pace.md` (user prefers moderation at scope/phase points, not micro-decisions)

---

---

## 1. What is this?

BridgeLog is a personal bridge-tracking app built as a gift for a professional bridge engineer. She drives over bridges constantly and wants to know what type they are, learn their history, and keep a log of every bridge she's crossed or seen.

It is not a general-audience app. It is built for someone who already loves bridges — the goal is to delight that person, not to explain what a bridge is.

---

## 2. Who is it for?

**Primary user (MVP):** One person. A licensed professional engineer (PE) who specializes in bridges. She notices bridges the way most people don't — structure type, span, materials, condition. The app should respect that expertise. Don't dumb it down. **She uses an iPhone — iOS is the primary target platform.**

**Future users (V3+):** Other bridge engineers and enthusiasts who want a social layer — shared profiles, comments on bridges, following friends' collections.

---

## 3. The core problem it solves

When driving over or past a bridge, she wants to:
- Know immediately what type of bridge it is (suspension? cable-stayed? arch?)
- Look up its history, architect, builder, year built
- Mark that she's crossed or seen it
- Over time, build a personal record of every bridge she's encountered

Currently she has no good tool for this. Wikipedia requires knowing the name first. There is no "bridge journal" app that respects the engineering side.

---

## 4. What success looks like (MVP, 30 days in)

- She has logged at least 20 bridges without being prompted
- She has used the structure type filter at least once
- She has shown it to at least one colleague
- She says "I opened it while stopped at a light" at least once
- No broken states, missing images, or crashes have embarrassed the gift

---

## 5. Version roadmap

### MVP — Mobile web app, iPhone-first (build now)
The simplest version that is still genuinely useful and delightful. No location tracking. She finds bridges manually by name or location search. Structure type is prominently displayed everywhere.

**Primary target:** iPhone Safari. Every screen must look and feel right on an iPhone before anything else. Desktop is secondary.

**Features:**
- Search bridges by name or location (named bridges only — see scope rules)
- Bridge detail page: structure type, year built, architect, builder, Wikipedia summary, photo, map pin
- Structure type displayed as a visual badge on every bridge card and detail page
- Manual log: mark a bridge as "crossed" or "seen", add optional date and note
- My Bridges: personal list of all logged bridges, filterable by structure type
- Map view: all logged bridges as pins, colored by structure type
- Stats: total crossed, breakdown by structure type
- Basic account: email + password via Supabase, data syncs across devices

### Beta — Location-aware, iOS native first
GPS detects bridge crossings automatically in the background. Works when she's asleep or not using the app. Requires a native mobile app for background location access.

> **⚠ iOS FIRST.** She has an iPhone. Build and ship iOS before touching Android. Android follows only once the iOS version is stable and she's actively using it.

**Adds:** Auto-detect crossings, push notifications ("You just crossed the GWB!"), crossing counter per bridge, trip replay with bridges highlighted, sleep mode passive detection, **a homescreen toggle to turn location tracking on/off for battery preservation** (must be one tap from the homescreen, not buried in settings).

**Requires:** App Store submission, Apple Developer account ($99/yr), APNs for push notifications.

### V2 — Engineering depth
Pulls in the National Bridge Inventory (NBI) for all ~620,000 US bridges. Adds engineering-grade data: span length, deck width, load rating, material, condition rating. Also: user photo attachments, rich notes, milestone badges (first suspension bridge, all 50 states, etc.).

### V3 — Community
Social layer for bridge engineers and enthusiasts. Shareable public profiles, comments on individual bridges, follow friends, leaderboards (most bridges crossed, rarest types seen), community data contributions back to OSM.

**Note logged:** V3 social features were specifically requested — shared profiles and commenting with other bridge engineers.

---

## 5.5 Build phases

The version roadmap in §5 describes *what* each release contains. This section breaks down *how* we get there, phase by phase. Each phase ends with a visible thing she could try, and a checkpoint where we pause for review before moving to the next. The user wants to moderate progress — do not skip checkpoints.

### Phase 0 — Validate APIs + scaffold
- **Deliverable:** A throwaway script that hits Overpass and Wikipedia for known bridges (Brooklyn Bridge, GWB, a small regional one) and prints parsed results. Then: empty Vite + React + Tailwind app with a Supabase client wired up, deployed to Vercel under a placeholder domain.
- **Why this phase:** The brief explicitly says "validate the Overpass + Wikipedia APIs manually before writing any code." The free APIs are the riskiest dependency — if structure-type tagging is sparser than expected, or Wikipedia coverage is worse, we need to know before building UI on top of them.
- **Done when:** A known bridge returns its `bridge:structure` tag from Overpass and its summary + thumbnail from Wikipedia. The empty deployed app loads on her iPhone Safari without console errors.

### Phase 1 — Bridge lookup (no auth)
- **Deliverable:** Search box → results list → bridge detail page. Detail page shows structure-type badge, year built, architect, Wikipedia summary, photo, and a map pin. No login. No saving. Just read-only lookup.
- **Why this phase:** Proves the core "what is this bridge?" loop on her actual device. Every later feature sits on top of this view, so getting it right (especially the structure-type badge — the #1 feature) de-risks everything downstream.
- **Done when:** She can search "Brooklyn Bridge" on her phone and the detail page looks right at 390px. Empty states are handled (no `bridge:structure` shows "Structure type unknown" per §6).

### Phase 2 — Auth + personal log
- **Deliverable:** Supabase email/password auth. "Crossed" and "Seen" buttons on the detail page. My Bridges list, filterable by structure type. Bridge data cached in Supabase on first lookup per §9.
- **Why this phase:** Unlocks the "personal record" half of the product. Also installs the cache layer that protects Overpass/Wikipedia from being hit on every view.
- **Done when:** She logs a bridge, signs out, signs back in on another device, and sees it. The structure-type filter on My Bridges works.

### Phase 3 — Map + stats
- **Deliverable:** Leaflet map showing all logged bridges as pins, colored by the 9 structure-type palette. Stats screen with total crossed + breakdown by type.
- **Why this phase:** This is the visual-reward layer that turns the log into a collection. Also covers Success Metric #2 from §4 (used the structure-type filter at least once) by surfacing structure type in three places now.
- **Done when:** Map renders correctly on iPhone Safari with all logged bridges. Stats numbers match the My Bridges list.

### Phase 4 — iPhone polish + ship the gift
- **Deliverable:** Full visual pass on a real iPhone (not just DevTools). Custom domain on Vercel. Every empty/error state handled — no Wikipedia article, missing photo, Overpass timeout, unknown structure type, offline. Final hand-off.
- **Why this phase:** §4 sets the success bar — "no broken states, missing images, or crashes have embarrassed the gift." This phase exists entirely to clear that bar.
- **Done when:** She has used it for a week, logged ≥20 bridges, and hasn't reported a broken state. (This is also the §4 30-day success metric.)

### Phase 5 — Beta: native iOS with background location
- **Deliverable:** React Native (Expo) app on the App Store. Background location detects crossings automatically. Push notifications via APNs ("You just crossed the GWB!"). **Homescreen toggle to switch location tracking on/off for battery preservation — one tap, no menu diving.** Code-sharing strategy with the web MVP decided.
- **Why this phase:** Unlocks passive/auto-logging — the thing she can't get from a web app. Requires Apple Developer account ($99/yr) and App Store review.
- **Done when:** She gets a push notification when she crosses a real bridge.

### Phase 6 — V2: engineering depth
- **Deliverable:** NBI dataset imported to Supabase (one-time). Span length, deck width, material, condition rating shown where available. User photo attachments, rich notes, milestone badges.
- **Why this phase:** Deepens the respect-her-expertise tone §10 calls out. Gives the app something Wikipedia can't.
- **Done when:** She can see a load rating on a US bridge she logs.

### Phase 7 — V3: community
- **Deliverable:** Shareable public profiles, comments on individual bridges, follow friends, leaderboards. Optional contributions back to OSM.
- **Why this phase:** Specifically requested in §5 — shared profiles and commenting with other bridge engineers.
- **Done when:** Two engineers she knows can see each other's profiles and comment on a bridge.

---

## 6. Scope rules (do not move these without a decision)

### What counts as a bridge in this app
Only **named bridges** — bridges that have a `name` tag in OpenStreetMap. This is the single filter rule for MVP.

**Why:** Anonymous highway overpasses and culverts have no name, no Wikipedia article, and no engineering history worth surfacing. They are not interesting to a bridge engineer in this context. This filter quietly excludes ~95% of infrastructure noise while keeping everything genuinely notable.

**What's excluded by this rule:**
- Anonymous highway overpasses (bridge=yes, no name)
- Culverts and drainage structures
- Temporary construction bridges
- Most pedestrian footbridges in subdivisions

**What's included:**
- All famous named bridges (GWB, Brooklyn Bridge, Golden Gate, etc.)
- Named historic bridges
- Named regional bridges of local significance
- Any bridge OSM contributors have cared enough to name

### Geographic scope (MVP)
**Global.** The Wikipedia and Overpass APIs both work globally. No reason to restrict to US only at this stage. NBI (US-only engineering data) is a V2 concern.

### Structure types supported (MVP)
These are the 9 types the app will recognize, sourced from OSM's `bridge:structure` tag:

| Type | OSM tag value | Plain description |
|---|---|---|
| Suspension | `suspension` | Deck hung from vertical cables attached to main cables strung between towers (GWB, Golden Gate) |
| Cable-stayed | `cable-stayed` | Deck supported by cables running directly from towers to deck (no catenary cable) |
| Arch | `arch` | Load carried by one or more curved arches below or above the deck |
| Truss | `truss` | Triangulated framework of members carries the load |
| Beam / girder | `beam` | Horizontal beam(s) carry load between supports — the most common type |
| Viaduct | `viaduct` | Series of spans on tall piers, usually over a valley or urban area |
| Movable | `movable` | Span moves to allow vessel passage (drawbridge, swing bridge, bascule) |
| Cantilever | `cantilever` | Horizontal beams anchored at one end, extending over a span |
| Floating | `floating` | Deck rests on pontoons or floats — used for temporary or low-traffic crossings |

**When OSM has no structure type:** Display "Structure type unknown" — do not hide the field. This creates an honest gap the user notices, which in V3 could become a community contribution feature.

---

## 7. Data sources

### Primary: OpenStreetMap via Overpass API
- **URL:** `https://overpass-api.de/api/interpreter`
- **What it provides:** Bridge name, GPS coordinates, `bridge:structure` tag, sometimes year built and Wikipedia link
- **Cost:** Free, no API key required
- **Rate limit:** Fair use — no hard limit but throttle under load. For MVP traffic, not a concern.
- **Query filter:** `nwr[bridge][name]` — bridges with a name tag only (enforces scope rule above)

### Secondary: Wikidata
- **Entity URL:** `https://www.wikidata.org/wiki/Special:EntityData/{QID}.json`
- **Search URL:** `https://www.wikidata.org/w/api.php?action=wbsearchentities&...`
- **Why it's here:** Phase 0 confirmed OSM's `bridge:structure` tag is missing for some famous bridges (e.g. GWB). Wikidata's `P31 instance of` reliably encodes bridge type (e.g. `suspension bridge`, `cable-stayed bridge`, `vertical-lift bridge`) and also gives us architect (`P84`), structural engineer (`P631`), length (`P2043`), and inception (`P571`) when OSM is bare.
- **How we get the QID:** Prefer the `wikidata` tag from OSM when present (e.g. Brooklyn → `Q125006`). Fall back to a name search via `wbsearchentities` filtered to results whose description contains "bridge."
- **Hybrid bridges:** `P31` returns *all* types a bridge instances — Brooklyn returns both `suspension` and `cable-stayed`. Preserve as `structure_primary` + `structure_secondary[]` rather than collapsing to one value.
- **Mapping note:** Wikidata uses finer-grained subtypes (vertical-lift, swing, bascule are all under "movable"). Phase 1 needs a small lookup table mapping Wikidata Q-IDs to our 9 canonical types from §6.

### Tertiary: Wikipedia REST API
- **URL:** `https://en.wikipedia.org/api/rest_v1/page/summary/{bridge_name}`
- **What it provides:** Summary text, main thumbnail image, description, page URL
- **Cost:** Free, no API key required. Set a descriptive `User-Agent` header as per Wikimedia policy.
- **Coverage:** Excellent for famous bridges, patchy for regional ones, nothing for obscure ones — handle gracefully

### Phase 0 findings — OSM data shape (2026-05-28)
Initial validation against 4 bridges (Brooklyn, GWB, Hawthorne, Walnut Street) surfaced rules that change how Phase 1 must query:

1. **A bridge is many OSM elements, not one.** Brooklyn Bridge returned 31 ways, Hawthorne returned 69. The deck, approaches, and side segments are tagged separately. Querying the first match alone misses most of the data.
2. **Tags must be aggregated across all matching elements.** Brooklyn's `bridge:structure=suspension` lives on one way, `start_date=1883-05-24` on another, `architect=John Augustus Roebling` on a third. Aggregating recovered all of them. Without aggregation, all three appeared "missing."
3. **Hawthorne Bridge's structure tag only appears after aggregation.** First-element-only said `(missing)`; aggregating across 69 elements found `truss`. This means real-world structure-type coverage is meaningfully better than a naive query suggests.
4. **Some famous bridges are still bare.** GWB returned 1 element with 6 tags and no structure/architect/wiki link even after aggregation. Wikipedia is the fallback for these — its summary + thumbnail were available for all 4 test bridges.
5. **Wikidata IDs appear in OSM tags** (Brooklyn → `wikidata=Q125006`). Worth keeping as a future enrichment hook — Wikidata has structured properties OSM often lacks.
6. **Wikipedia name lookups can land on disambiguation pages** (Walnut Street Bridge returned `type=disambiguation`, 34-char summary, no image). Phase 1 must detect this and handle it — likely by disambiguating with lat/lng from the OSM result.

**Implications for Phase 1:**
- Use `out tags center;` on the Overpass query (added `center` to the validated `out tags;` so ways/relations carry a coordinate for the map pin)
- Aggregate tag values across all returned elements into a set per key; resolve conflicts by preferring more specific values
- Treat Wikipedia disambiguation responses as a "not found" until we add a picker
- Cache the aggregated result, not the raw response

### Phase 1 findings + decisions — bridge identity (2026-05-29)
Building the live lookup pipeline (`app/src/lib/`, smoke-tested via `phase-1/smoke-lookup.ts`) surfaced that **a name is not a unique identity**:

1. **Same name, many bridges.** A bare `["name"="Brooklyn Bridge"]` query returns elements for *every* "Brooklyn Bridge" on the planet (NYC + Norway + Iowa + Las Vegas). Aggregating tags / averaging coordinates across all of them produced a blended record with a wrong coordinate (NYC bridge landed in Connecticut).
2. **Fix — cluster, then identify.** A name's elements are grouped into distinct physical bridges by **single-linkage proximity clustering** (an element joins a cluster if within ~2 km of any member; contiguous segments of one long bridge chain together, different cities separate). Each cluster is aggregated independently. Search returns one row per cluster.
3. **Machine ID — synthetic stable key (DECIDED).** Identity = `slug(name)@roundedCoord` (e.g. `brooklyn-bridge@40.71,-74.00`), computed per cluster. Chosen over raw OSM element IDs (a bridge is dozens of elements — no single id) and over a Wikidata-QID key (missing for most regional bridges; would also shift if a QID appeared later). The QID is stored as a *field*, not the key. **This is the §9 `bridge_cache` primary key and the Phase 2 `user_logs` foreign key.**
4. **Disambiguation UI.** Results show duplicate names as separate rows with a secondary line (city/region) underneath. Source for that label is derived from data already fetched (Wikidata/Wikipedia description) — see Nominatim note below.
5. **Nominatim considered, DEFERRED.** A dedicated geocoder (Nominatim) would give native distinct results + ready-made location labels, but it's not required for MVP — Overpass name search + clustering covers it. Revisit only if duplicate-name disambiguation gets painful in real use.
6. **Year-built heuristic.** OSM elements can carry future works dates (GWB had a stray `start_date=2027`). "Year built" = earliest parsed year across all date tags + Wikidata `P571 inception`, so the original construction year wins.
7. **CORS: no custom headers on browser API calls (bug fixed 2026-05-29).** A custom `Api-User-Agent` header made Wikimedia calls non-simple → CORS preflight. Wikidata's `Special:EntityData` rejects that preflight (its `Access-Control-Allow-Headers` omits the header), so structure-type lookups failed silently and rendered "unknown" for Brooklyn/GWB/Hawthorne in the *deployed* app while passing every Node smoke test. **Lesson: Node smoke tests have no CORS enforcement and can't catch this class of bug** — browser-facing API code must send no forbidden/custom headers (plain GETs return `Access-Control-Allow-Origin: *`); UA headers go only in Node (`wikimediaHeaders()`/the Overpass+Nominatim Node-only guard). Verify cross-origin headers with `phase-1/cors-check.mjs` when adding a new external API.
8. **Search engine: Overpass → Nominatim → Photon (FINAL: Photon, 2026-05-29).** Overpass can't do free-text search (exact name ~2 s, but substring/fuzzy `~` scans the planet → ~75 s, unusable). Nominatim fixed that but is **not prefix/typeahead**: it never returns "Golden Gate Bridge" for the partial "golden" (the token "gate" is missing) even at limit 40 — a recall failure for the most common user behavior (type a partial, expect the obvious bridge). **Photon** (`photon.komoot.io`) is a prefix/typeahead geocoder and does return Golden Gate Bridge for "golden". So search now uses Photon, restricted to bridges server-side via `osm_tag=bridge` + `osm_tag=man_made:bridge` (so results are bridge-only — no people/places — and ranked by Photon's prominence, floating famous bridges to the top). Architecture unchanged downstream: **Photon resolves the query → bridge results; Overpass (bbox-scoped) + Wikidata + Wikipedia enrich them; collision-validation + canonical Wikidata naming + post-dedup clean them.** Free, no key (fair-use), CORS-enabled (works in-browser), `User-Agent` in Node only. `nominatim.ts` is retired (replaced by `photon.ts`).

### Future (V2): National Bridge Inventory (NBI)
- US government dataset, free download, no live API
- ~620,000 US bridges with condition ratings, span data, materials, load ratings
- Plan: one-time import into Supabase, query from there

### Maps
- **Decision needed:** Mapbox (free tier: 50k loads/month, polished) vs Leaflet + OSM tiles (free, unlimited, less polished)
- Recommendation: Start with Leaflet + OSM tiles for MVP (zero cost, no token management), upgrade to Mapbox for Beta

---

## 8. Tech stack

### MVP
| Layer | Choice | Reason |
|---|---|---|
| Frontend | React (Vite) | Fast setup, component model suits this app |
| Styling | Tailwind CSS | Utility-first, good for mobile-first design |
| Database + Auth | Supabase | Free tier generous, built-in email auth, Postgres under the hood |
| Hosting | Vercel | Free, automatic deploys from GitHub, custom domain support |
| Maps | Leaflet + OSM tiles | Free, no token needed for MVP |
| Bridge data | Overpass API + Wikipedia REST | Free, no keys, called on demand |

### Beta additions — iOS first
| Layer | Choice | Reason |
|---|---|---|
| Native app | React Native (Expo) | Share code with web MVP, good iOS support |
| Platform | **iOS first** — App Store | She has an iPhone; Android deferred to post-Beta |
| Background location | Expo Location + background fetch | Required for passive bridge detection |
| Push notifications | Expo Notifications + Apple APNs | "You just crossed the GWB!" alerts |
| Apple Developer account | Required ($99/yr) | Needed for App Store + APNs |

---

## 9. Database schema (MVP)

```
users
  id          uuid PK (managed by Supabase Auth)
  email       text
  created_at  timestamp

bridge_cache
  id          uuid PK
  osm_id      text UNIQUE        -- OpenStreetMap way/relation ID
  name        text
  lat         float
  lng         float
  structure   text               -- suspension, arch, beam, etc.
  year_built  int nullable
  architect   text nullable
  wikipedia_summary  text nullable
  wikipedia_image    text nullable
  wikipedia_url      text nullable
  cached_at   timestamp          -- so we can refresh stale data

user_logs
  id          uuid PK
  user_id     uuid FK → users.id
  bridge_id   uuid FK → bridge_cache.id
  status      text               -- 'crossed' or 'seen'
  logged_at   timestamp
  visit_date  date nullable      -- the actual date she crossed it (may differ from logged_at)
  notes       text nullable
  created_at  timestamp
```

**Caching rationale:** Rather than hitting Overpass + Wikipedia on every view, cache bridge data in Supabase after the first lookup. Refresh if `cached_at` is older than 30 days.

---

## 10. Design decisions

- **iOS first, always.** She has an iPhone. Every design and build decision prioritises iPhone Safari for MVP, and the iOS App Store for Beta. Android is explicitly deferred — do not design for it, test for it, or build for it until iOS is done.
- **Mobile-first.** Every screen must work at 390px (iPhone 14/15 width) before desktop. Test on a real iPhone, not just browser DevTools — Safari on iOS behaves differently from Chrome.
- **Primary test device:** iPhone. If it looks wrong on iPhone Safari, it's wrong, full stop.
- **Structure type is never buried.** It appears as a colored badge on every bridge card, at the top of every detail page, and as a filter option in her log. This was identified as the feature she'd use most.
- **App name:** Working name is **Bridge Buddy** (placeholder, set 2026-05-28). Real name still TBD — earlier options included BridgeLog, Spanner, Overpass, CrossLog. Revisit before the detail page ships (name appears in page title and future share URLs).
- **Tone:** Clean, precise, engineer-appropriate. Not cutesy. Not overly minimal. Feels like a tool built by someone who respects the profession.
- **Color for structure types:** Each structure type gets a consistent color used across badges, map pins, and chart segments. Define the palette before Sprint 2.
- **Beta location toggle is a homescreen control, not a settings page.** Background GPS drains battery, so she must be able to flip it off in one tap from the main screen when her phone is low. Default state at app open is still TBD — decide before Phase 5 ships.

---

## 11. Open decisions (resolve before coding)

| # | Decision | Options | Deadline |
|---|---|---|---|
| 1 | App name | **Working name: Bridge Buddy** (placeholder). Earlier options: BridgeLog, Spanner, Overpass, CrossLog. Real name still TBD. | Before Sprint 2 |
| 2 | Map library | **Detail-page single pin: OSM embed iframe (dependency-free) — DECIDED 2026-05-29.** Full multi-pin map library (Leaflet + OSM tiles vs Mapbox) still open, lands in **Phase 3**. | Phase 3 |
| 3 | Structure type color palette | **PLACEHOLDER in place (2026-05-29).** 9 Tailwind colors are wired into `structureTypes.ts` so the badge works during the build. **CIRCLE BACK: user will pick a proper ColorBrewer qualitative palette (9-class) before ship** — open colorbrewer2.org, 9 classes + qualitative, send the scheme name (e.g. Set1). Swap is a one-file edit (`STRUCTURE_TYPE_COLORS`). Not a blocker for app build. | **Final pick before Phase 4 ship** |
| 4 | ~~"Unknown structure type" display~~ | **RESOLVED 2026-05-29.** Show a neutral "Structure type unknown" pill (never hidden), per §6. Implemented in `StructureBadge`. | — |
| 5 | Overpass fallback | If Overpass times out, show cached result or error? Currently: caught → error state with a "try again" message. Cache fallback arrives with the Phase 2 Supabase cache (§9). | Phase 2 |
| 6 | ~~Wikipedia disambiguation~~ | **RESOLVED 2026-05-29.** Treat `type=disambiguation` as "no article" (graceful gap); a picker is deferred. Bbox-scoped lookup already targets the right bridge by location. | — |
| 7 | ~~Wikidata as tertiary source~~ | **RESOLVED 2026-05-29.** Wikidata is in for MVP, used as the *secondary* source between OSM and Wikipedia (not deferred to V2). Phase 0 test confirmed it recovers structure type, architect, engineer, and length for bridges OSM doesn't tag. Hybrid bridge types come along for free. | — |
| 8 | ~~Resolution when OSM and Wikidata disagree on structure type~~ | **RESOLVED 2026-05-29 — show both.** Both findings render as separate badges (e.g. Hawthorne = `Truss` + `Movable`); it's technically accurate (a truss bridge with a vertical lift) and data stays lossless. Provenance kept in the model. | — |
| 9 | Mapping Wikidata bridge subclasses to the 9 canonical types | **DRAFT implemented 2026-05-29** (`WIKIDATA_KEYWORD_RULES` in `structureTypes.ts` — keyword rules: vertical-lift/swing/bascule → movable, etc.). Needs a PE review pass for completeness/correctness before ship. | Review before Phase 4 ship |

---

## 12. Out of scope (MVP) — do not add

These are things that will naturally come up during the build. The answer is no, for now.

- Location tracking of any kind
- Push notifications
- User-uploaded photos
- Social features (profiles, comments, following)
- Editing bridge data
- Importing from any other source
- Email notifications
- Offline mode
- Bridge condition or engineering spec data (NBI)
- Temporary or construction bridges
- Unnamed / anonymous bridges
- **Android app** — deferred until post-Beta iOS is stable

---

## 13. Security requirements

Non-negotiable gates tied to the phases that introduce the risk. These block the named phase from shipping.

- **Supabase Row Level Security — before Phase 2 ships.** RLS must be **enabled on all tables** (`users`, `bridge_cache`, `user_logs`) with policies in place before Phase 2 (auth + personal log) ships. Supabase tables are publicly reachable via the anon key, so without RLS any client could read or write every user's logs. `user_logs` must be owner-scoped (a user reads/writes only their own rows); `bridge_cache` is shared read, writes restricted to the service role. Verify RLS is on for every table — a table with RLS disabled is open to the anon key regardless of intent.
- **App Store privacy policy + nutrition labels — before Phase 5.** Phase 5 (native iOS Beta) introduces background location, which Apple treats as sensitive data. A published **privacy policy URL** and accurate **App Privacy "nutrition" labels** (declaring background location collection and its use) are required before the Beta is submitted to App Store Connect — Apple rejects submissions that collect location without them.

---

*Next step: Resolve open decisions 1 and 3 (name + color palette), then validate the Overpass + Wikipedia APIs manually before writing any code.*
