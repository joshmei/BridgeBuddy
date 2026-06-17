# Bridge Buddy — Product Brief
> Living document. Update this as decisions are made. Last updated: 2026-06-17 (session 6).
> **Working name:** Bridge Buddy (placeholder — real name still TBD, see §10/§11).
> **Latest change (2026-06-17, session 6):** **Phase 3 — warm color palette + Mapbox map.** (1) Replaced the cold slate/blue scheme with the welcome video's sunset palette (warm rose/blush/mauve/navy), defined once as Tailwind v4 `@theme` tokens (`index.css`) and swept across all components — light mode only. "I've Crossed This"/Undo, the dark Welcome hero, structure-type badge colors, and error reds left untouched. (2) Added a **Mapbox map as the fixed header on My Bridges** (NOT a tab — tab bar stays Search · My Bridges · Stats): dark `dark-v11`, pins colored by structure type (same source of truth as badges), clustering, tap-pin→callout→detail, fit-to-pins with US fallback; `mapbox-gl` lazy-loaded. See §5.5 Phase 3.

---

## Current status — 2026-06-13 (session 5)

**Active phase:** between phases — Phase 2.6 wrapped (welcome screen with real video + flash-free poster/navy load + PWA icons, all live; plus the "Crossed! ✓"/Undo interaction this session). **Phases 0, 1, 1.5, 2, 2.5, 2.6 are closed.** **Next up: Phase 3 — Map + stats**, decided on **Mapbox** (open decision #2 resolved 2026-06-13; user is creating the account/API token). The Stats screen already exists from Phase 2, so Phase 3 is primarily the multi-pin map. Color palette (open decision #3) still to finalize — good to lock before the map's pins ship.

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
- **Filter search results** by geography, structure type, architect, and structural engineer (see §5.6)
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
Social layer for bridge engineers and enthusiasts. Shareable public profiles, comments on individual bridges, follow friends, leaderboards (most bridges crossed, rarest types seen), community data contributions back to OSM. Connection between users happens through a **Buddies tab** (full spec in §5.5 Phase 7).

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

### Phase 1.5 — Search-results filtering
- **Deliverable:** A filter system on the **search results** screen (not the log — that's Phase 2). Narrow results by geography (country → state/province for US/Canada), structure type (multi-select), architect, and structural engineer. Architect/engineer fields on the detail page become tappable links that jump back to filtered results. Full spec in **§5.6**.
- **Why this phase:** Search can return many same-named or thematically-related bridges; filtering lets her cut to what she wants before tapping in, and the architect/engineer links turn the data we already fetch into a browsing tool (e.g. "show me every Roebling bridge"). Sits naturally on the Phase 1 results list; no auth or DB needed yet.
- **Done when:** From a multi-result search she can stack a country + structure-type filter and see results narrow (AND logic); architect/engineer filters appear only when that data exists in the result set; tapping an architect on a detail page returns to results filtered to that architect (with a clear empty state if there are no others).
- **Carries forward:** The same filter UI + logic is reused on the Phase 2 **My Bridges** log screen.

### Phase 2 — Auth + personal log (Supabase) — ✅ COMPLETE & verified live 2026-05-31 (session 4)
**Verified end-to-end on the deployed app:** Google Sign-In works; "I've Crossed This" appears on detail pages and saves to Supabase; crossing count increments on repeat taps; My Bridges shows logged bridges with the Google avatar/name. (Shipping gotcha logged for future phases: the `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars must be set **for Production with the `VITE_` prefix** and a **fresh build** run — Vite inlines them at build time, and a missing key would otherwise have white-screened the app; `supabase.ts` now degrades gracefully instead.)

The earlier localStorage-only POC was reversed mid-session: a per-device log loses her whole collection if she gets a new phone, clears Safari, or switches devices — unacceptable for a gift meant to last. The log goes to a real backend now. **Auth + Supabase + `bridge_cache` + `user_logs` + RLS are all in this phase.**
- **Auth — Google Sign-In only (Supabase OAuth).** Chosen over Apple Sign-In (requires a paid Apple Developer account + app registration we don't have yet) and over email/password (Google is a frictionless one-tap first experience). One "Continue with Google" button; session persists until explicit sign-out. Search + bridge detail stay fully browsable **without** an account; only logging a crossing requires sign-in.
- **Deliverable:**
  - **"I've Crossed This"** button on the detail page. Tap → log with `first_recorded_crossing = last_crossing = today`, `crossing_count = 1`. ("First recorded" is honest — it's the first time she logged it *in this app*, not a claim about her true first-ever crossing.) **Crossed-state UI (revised 2026-06-13):** once crossed, the button is replaced by plain **"Crossed! ✓"** text + a small muted-rose (`#C9847A`) **Undo** button (no confirmation) that restores the original button. **Removal is a SOFT DELETE:** Undo sets `is_deleted = true` (count 1) or decrements `crossing_count` (count > 1) — it never hard-deletes, so removed bridges are preserved for a future "Recently Removed"/recovery feature. All reads (button state, My Bridges, map, stats) filter `WHERE is_deleted = false`; re-crossing a removed bridge revives it as a fresh log (`is_deleted → false`, `crossing_count = 1`). **Consequence:** there's no re-tap-to-increment affordance, so `crossing_count` stays 1 from the UI (increment logic + column retained for a future "log another crossing"; "Crossed X times" / most-crossed-by-count dormant until then).
  - **My Bridges** screen: her logged bridges (`user_logs ⋈ bridge_cache`) — name, structure badge, first/last dates, crossing count, notes. Sign-out lives here. **Edit mode (added 2026-06-13):** an "Edit"/"Done" toggle (top-right) reveals a 44×44 red minus-circle on each card; cards are non-tappable while editing (no accidental navigation); tapping minus → confirm dialog ("Remove [name] from your collection?", **Remove** in red / **Cancel**) → **soft delete** (`is_deleted=true`, same as the detail-page Undo — *not* a hard delete) → card slides out and the list closes the gap; removing the last bridge shows the empty state. No swipe-to-delete (conflicts with iOS PWA back-swipe); no reordering.
  - **Stats** screen: total crossed, breakdown by structure type (hybrids count in each of their types — accuracy over a clean partition), first recorded crossing (milestone), most-crossed bridge.
- **Storage:** Supabase. Logging a crossing upserts the bridge into `bridge_cache` (incl. the full enriched `Bridge` as `data jsonb`, so My Bridges/detail rehydrate with no API calls), then writes `user_logs`. See §9.
- **Navigation:** bottom tab bar (Search · My Bridges · Stats) — no router; state-driven, matching the existing detail-overlay pattern.
- **Done when:** She signs in with Google, taps "I've Crossed This" on a bridge, sees it in My Bridges with the right dates/count, and Stats reflects it — and it all survives a fresh device/login.
- **Deliberately NOT in this phase (deferred):** "Seen" status; a **notes-entry UI** (the `notes` column exists and is displayed, but input lands in Phase 4 polish); editing/deleting logs; a social layer (comments, likes, a feed among her + coworkers).

### Phase 2.5 — UI & navigation polish (2026-05-31, session 4) — ✅ COMPLETE & verified live — NO new features
A small, contained polish pass on top of Phase 2. No new features, no new data. **Both changes confirmed working on device.**
- **CHANGE 1 — Persistent sign-in / avatar on the search home.** A control in the **top-right of the Search (home) screen**, visible immediately on app open:
  - **Logged out:** a subtle **"Sign in"** button → opens the existing auth overlay (`openAuthPrompt`). This is *in addition to* the sign-in prompt that already fires on "I've Crossed This" — both entry points work.
  - **Logged in:** her **Google avatar** as a small circle (initial-letter fallback if no photo) → navigates to the **My Bridges** tab.
  - No login popup on app open; no forced login; Search + detail stay fully browsable without an account.
- **CHANGE 2 — Search bottom-tab always returns to a clean home.** Tapping the **Search tab** in the bottom bar from anywhere (including from inside a bridge detail page) always lands on the **default search home** (empty search box, filters cleared, no open detail, the curated NY list). Implemented by remounting the search screen on tab-tap. The **top-left "‹ Search" back button is unchanged** — it still closes the detail and preserves prior results; the reset behavior is on the **bottom tab bar only**.
- **Tab naming:** the personal tab stays labeled **"My Bridges"** for now (a dedicated profile page is Phase 4, §9.5); the avatar just points there.
- **Done when:** sign-in/avatar shows top-right on the home screen and behaves per state; tapping the Search tab from a detail page returns to the clean home.

### Phase 2.6 — Welcome screen (2026-05-31, session 4) — front door
A bright, warm landing screen shown before the app — the "welcome to the app" moment.
- **Deliverable:** A full-screen welcome with a hero visual (bridge + shimmering water), the app name, a short tagline, and two actions: **Log in with Google** and **Skip for now**.
- **Behavior:** Shown on **every open while logged out**; "Skip for now" dismisses it **per session** (in-memory — returns on reload). **Logged-in users never see it.** Skip honors the standing rule that browsing never requires an account (§5.5 Phase 2) — it's a front door, not a wall.
- **Hero visual (decided 2026-05-31):** a muted, looping, inline `<video>` at `/welcome.mp4` (drop the file in `app/public/`; an optional `/welcome.webm` is also wired). The file is **referenced by URL, not imported**, so a missing/loading/failed video can't break the build — an animated CSS "shimmering water" gradient (`.welcome-water` in `index.css`) shows behind/instead and reads as intentional. **User is supplying the video** (recommend a short muted MP4/WebM loop, not a multi-MB GIF — lighter + autoplays inline on iOS Safari).
- **Tone:** bright and warm but tasteful, not cutesy (§10).
- **Files:** `app/src/components/WelcomeScreen.tsx`, gate in `app/src/App.tsx`, keyframes in `app/src/index.css`.
- **Done when:** Logged out, the welcome shows on open with both buttons working (Log in → Google; Skip → into the app); logged in, it's bypassed. ✅ built; visual finalizes when the video lands.

### Phase 3 — Map + palette (2026-06-17, session 6)
Two parts, built colors-first then map.
- **Color palette (Part 1) — warm cinematic, light mode only.** Replaced the cold slate/blue scheme with the welcome video's sunset tones, defined ONCE as Tailwind v4 `@theme` tokens in `app/src/index.css` (`page` #FAF7F8, `surface` #F5EEF0, `accent` #D4879A rose, `accent-soft` #C4A0B8 lavender, `ink` #1A1A2E, `muted` #8E7A88, `divider` #E8D8DC) — one edit restyles the whole app. All components swept to the tokens. **Untouched:** "I've Crossed This" (still dark `slate-900` — not green; the green is the "Crossed!" text), the dusty-pink Undo (both Phase 4), the dark Welcome hero, **structure-type badge colors** (`structureTypes.ts`), error reds, the Google button.
- **Map (Part 3) — Mapbox, as a header on My Bridges (NOT a tab).** The tab bar stays 3 tabs (Search · My Bridges · Stats). My Bridges is now: **header (unchanged) → map (full-width, ~38dvh, fixed) → bridge list (scrolls independently below)**. Dark `dark-v11` style (contrasts the warm light app); pins colored by structure type from `structureTypes.ts` (one source of truth — hybrids use the primary/first type; popup shows the full badge); built-in GL **clustering** (tap → zoom); tap pin → **callout (name + badge) → tap → bridge detail**; **fitBounds** to her pins, **continental-US** fallback when none. Map always shows (logged-out = US + "Log in" prompt below; logged-in no-bridges = US + empty state + "Find a bridge" → Search; logged-in = her pins + cards). `VITE_MAPBOX_TOKEN` from env (graceful "Map unavailable" placeholder if absent). `mapbox-gl` is **lazy-loaded** (code-split chunk, ~482 KB gzip) so it only loads when My Bridges opens.
- **Files:** `lib/mapbox.ts`, `components/BridgesMap.tsx` (new); `MyBridgesScreen.tsx`, `App.tsx`, `index.css`, `.env.local`/`.env.example`, the component sweep. The Stats screen already existed from Phase 2.
- **Done when:** map renders her logged bridges on iPhone Safari, pins match badge colors, clustering + callout→detail work, and the palette reads cohesively.

### Phase 4 — iPhone polish + ship the gift
- **Deliverable:** Full visual pass on a real iPhone (not just DevTools). Custom domain on Vercel. Every empty/error state handled — no Wikipedia article, missing photo, Overpass timeout, unknown structure type, offline. Final hand-off.
- **Profile page (ONE screen — see §9.5).** A single profile screen, not a separate settings page:
  - Avatar (from Google, not editable in MVP) + display name with an **Edit** button → type a custom display name, saved back to `auth.users` user metadata (`display_name`), which then overrides the Google name everywhere in the app.
  - Total bridges crossed · first-ever recorded crossing (milestone) · most recent crossing · breakdown by structure type · the full bridge collection (same data as My Bridges, in a profile frame for when V3 social lands).
  - This is where display-name editing lives — there is **no** separate username/onboarding screen, ever (§9.5).
- **Notes-entry UI** on the crossing log (the `notes` column already exists from Phase 2; this adds the input).
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
- **Deliverable:** Shareable public profiles, comments on individual bridges, follow friends, leaderboards. Optional contributions back to OSM. Introduces the **Buddies tab** (below).
- **Why this phase:** Specifically requested in §5 — shared profiles and commenting with other bridge engineers.
- **Done when:** Two engineers she knows can see each other's profiles and comment on a bridge.

**BUDDIES TAB (V3) — spec'd 2026-05-31, DO NOT BUILD until V3.** A **fourth tab** in the bottom bar (joining Search · My Bridges · Stats) for social connections. Two views toggled *within the same tab*:
- **View 1 — Following feed:** a list of everyone you follow, showing their recent bridge activity. Tap a person → their full bridge collection + profile.
- **View 2 — My QR code:** a screen showing your unique QR code + username for others to scan and follow you instantly. **Modeled on the Venmo QR flow** — show your phone, your friend scans, they're following you. No typing usernames. Especially useful at job sites, conferences, and in the field where typing is inconvenient.
- **Rationale:** bridge engineers will share this app with colleagues immediately; the QR flow removes all friction from connecting. (Builds on the display-name + avatar already captured in Phase 2 / §9.5.)

---

## 5.6 Search-results filtering (Phase 1.5)

A filter system layered on the **search results** screen, so the user can narrow what a search returns *before* tapping into a detail page. Added 2026-05-29 (scope addition, "Phase 1.5"). **Applies to search results only**; the same UI + logic is reused on the Phase 2 **My Bridges** log.

**Cross-cutting rules**
- **AND logic.** Every active filter narrows the set; filters never expand it. Multiple filters stack (e.g. country = United States **AND** structure type = Suspension).
- **Data-driven, no new APIs.** Every filter derives from data already on each enriched result — region label (geography), structure findings (type), `architect`, `engineer`. No extra network calls.
- **Hide empty filters.** Architect and engineer filters are shown **only** when at least one result in the current set has that field; otherwise hidden. Geography/type always available.
- **Mobile-first (390px, iPhone Safari).** Filter controls are a bottom sheet and/or a horizontal chip row — never a sidebar. (Exact pattern: pending user approval before build.)

**1. Geographic filter**
- First level: **Country** (e.g. United States, France, Australia). The list shows countries present in the current results.
- Second level: if **United States or Canada** is selected, show a **State/Province** picker beneath it. Other countries stop at country level.
- Source: structured `country` + `state` fields carried on each result (from Photon's address breakdown). No new API for the filter itself.
- **Country pinning (which country sits at the top of the list):**
  - If the browser has granted geolocation, reverse-geocode the user's GPS position to a country (Nominatim reverse: `…/reverse?format=json&lat=&lon=`, read `address.country`) and pin that country at the top.
  - On GPS unavailable / denied / timeout → **silently** pin **United States** (no error shown).
  - When US is the *default* pin (GPS fallback), **Canada** is pinned second; the rest follow alphabetically. When GPS determines the top country, Canada gets **no** special treatment (alphabetical) — unless the user is in Canada, in which case Canada is the GPS pin.
  - **Never request GPS on page load.** Request only when the user opens the filter sheet and taps the **Country** filter, so the permission prompt appears in context. Result is cached for the session.

**2. Structure-type filter**
- Multi-select over the 9 canonical types (§6). Formalizes the existing badge into an explicit filter.

**3. Architect filter**
- Lists only architects **present in the current result set** (not a global list). Selecting one narrows to bridges by that architect. Source: `architect` (Wikidata/OSM).

**4. Structural-engineer filter**
- Same as architect, for `engineer`. Lists only engineers present in the current results.

**5. Clickable architect / engineer on the detail page**
- The Architect and Structural Engineer rows in the detail facts table become **tappable links** (subtle underline / colored text — link, not button).
- Tapping navigates back to search results with that person pre-applied as the active architect/engineer filter.
- If there are no other bridges by that person, show a clear empty state: **"No other bridges by [name] found."**

**6. Home-screen filters via bundled static config (REVISED 2026-05-30 — built)**
- Goal: a user who doesn't know a bridge's name can open the filter panel **on the home screen** (before any search) and browse to a bridge.
- **Filter OPTION lists come from a static bundled JSON** (`app/src/data/filterMetadata.json`, §9) — countries, states-by-country, architects, engineers. Generated by `phase-1/gen-seed.mjs` and shipped with the app: instant, zero network, no database, nothing for the user to set up. (Replaces the dropped `filter_metadata` Supabase table — no write-through / no self-growth; re-run the generator to refresh.) Structure types are the 9 canonical values.
- **RESULTS on apply (decision #11):**
  - **Architect / engineer → discovery query** (`wikidataDiscovery.ts`): on the home screen, picking a person runs a Wikidata SPARQL query for that person's bridges (matched by exact English label, which is what enrichment + the config store), then enriches each by QID. These are the home-screen *producers*.
  - **Structure type / country → client-side refine** (as already built): they narrow the current result set, they don't run a query. So on a blank home screen they don't produce results on their own; architect/engineer (or a name search) is the entry point.
- **Country pinning:** unchanged from #1 — GPS (Nominatim reverse) pins the user's country when permitted (requested only on opening the Country filter), else US first / Canada second / rest alphabetical.
- **Filter source per screen:** home (pre-search) → bundled static config; search/discovery results → derived from the in-memory result set; Phase 2 My Bridges → `SELECT DISTINCT` per field from `user_logs`.

**Open follow-ups (logged 2026-05-30, revisit when phase work settles):**
- **(a) Country / structure-type as home producers.** User wants these to *produce* results on the home screen (not just refine), like architect/engineer. Deferred at user's request ("don't care right now, come back when we're done"). Would need a query per facet (Wikidata by P17 country / by P31 type).
- **(b) Default home list = prominent New York bridges — DONE 2026-05-30.** Before any search, the home page shows 15 curated prominent NY bridges (Brooklyn, GWB, Verrazzano, Manhattan, Williamsburg, Queensboro, …). A live Wikidata "bridges in NY State" query **504s** (transitive located-in join too heavy), so the list is generated at build time (`phase-1/gen-default-bridges.ts` runs each curated name through the real pipeline) and bundled as `app/src/data/defaultBridges.json` — instant home load, no runtime query. Refresh = re-run the generator. "Clear all" returns to this default. (Curated prominent set, not literally every NY bridge — enriching hundreds on load isn't feasible.)

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

**AS BUILT — 2026-05-30 (session 3).** Migration SQL: `supabase/migrations/0001_schema.sql` (tables) + `0002_rls.sql` (RLS, §13). No `public.users` table — signup is Google-only with no profile fields to store, so `user_logs.user_id` references `auth.users(id)` directly.

```
bridge_cache                          -- shared public bridge data (cached on first log)
  id                   uuid PK (gen_random_uuid)
  bridge_key           text UNIQUE    -- synthetic stable key slug@lat,lng (identity.ts).
                                      --   NOT an OSM id: one bridge is dozens of OSM
                                      --   elements. (Renamed from §9's earlier `osm_id`.)
  name                 text
  lat                  float
  lng                  float
  structure            text           -- denormalized PRIMARY canonical type (Stats grouping)
  structures           jsonb          -- full StructureFinding[] — preserves hybrids for the badge
  year_built           int nullable
  architect            text nullable
  structural_engineer  text nullable
  wikipedia_summary    text nullable
  wikipedia_image      text nullable
  wikipedia_url        text nullable
  wikidata_qid         text nullable
  data                 jsonb          -- full enriched Bridge — rehydrate My Bridges/detail, no API calls
  cached_at            timestamptz

user_logs                             -- private, owner-scoped crossing record
  id                       uuid PK (gen_random_uuid)
  user_id                  uuid FK → auth.users.id (on delete cascade)
  bridge_id                uuid FK → bridge_cache.id (on delete cascade)
  first_recorded_crossing  date       -- first time logged IN THIS APP (honest; not her true first-ever)
  last_crossing            date
  crossing_count           integer    -- default 1 (re-tap-to-increment path currently dormant — see §5.5 Phase 2)
  notes                    text nullable  -- display-only this phase; entry UI in Phase 4
  is_deleted               boolean    -- default false; SOFT DELETE (added 2026-06-13, 0004). Removing a bridge sets this true; all reads filter WHERE is_deleted = false. Rows preserved for a future "Recently Removed"/recovery feature — do not purge.
  created_at               timestamptz
  UNIQUE (user_id, bridge_id)         -- one row per user+bridge; revived (is_deleted→false) on re-cross
```

(Home-screen filter options are NOT a DB table — see the bundled static config note below.)

**Caching rationale:** Rather than hitting Overpass + Wikipedia on every view, cache bridge data in Supabase. **As built, the cache is populated only when she logs a crossing** (not on every view), and rows are never updated client-side (RLS grants insert only — no update/delete), so the 30-day staleness refresh from §9's original plan is deferred to a future service-role job. Adequate for now; logged bridges render instantly from `data jsonb`.

**Home-screen filter options — bundled static config (REVISED 2026-05-30):** The earlier `filter_metadata` Supabase table is **dropped** (no table, no RLS, no write-through, no user setup). Filter option values ship as a static JSON, `app/src/data/filterMetadata.json`, generated by `phase-1/gen-seed.mjs` (50 US states + 13 Canadian provinces hardcoded; ~40 architects + ~40 engineers pulled from Wikidata; US + Canada countries). Instant, zero network, regenerate anytime by re-running the script. Trade-off vs the table: no automatic self-growth from user views — refresh by re-running the generator.

---

## 9.5 User profiles, display names & avatars (added 2026-05-30, session 3)

**Multi-user from the start.** The gift launches to one person (a PE bridge engineer), but she's close with colleagues and will share it immediately — other engineers will sign in. So identity is designed for many users now, even though MVP launches to one. (Aligns with the V3 social layer in §5/§5.5 Phase 7.)

**No `public.users` table, no username/onboarding screen — ever.** Identity lives in Supabase-managed `auth.users` metadata. Building a separate username-creation or onboarding flow is unnecessary friction (and wasted build effort); the **Phase 4 profile page** (§5.5) is where any name editing naturally lives.

**What Google Sign-In provides automatically.** On Google OAuth, Supabase populates `auth.users.user_metadata` from the Google token with **full name, email, and avatar URL** (`full_name`/`name`, `email`, `avatar_url`/`picture`). **This requires no code to "store"** — it's already on the `user` object after sign-in. We only *read* it.

**Display name behavior.**
- **Default = the Google full name.** It becomes the display name throughout the app.
- **Editable — but in Phase 4, not now.** On the Phase 4 profile page, an Edit button writes a custom `display_name` to user metadata, which then overrides the Google name app-wide. (Lets an engineer use a handle instead of their real name; most won't bother.)
- **Zero friction at sign-in.** No prompt to set a username during/after auth — Google completes and she lands directly in the app.

**This phase (Phase 2) — what's built now:**
1. Read name + avatar from `user.user_metadata` (auto-populated; no write needed).
2. Show the Google **name + avatar in the My Bridges header** so the app feels personal immediately.
3. **No** profile page, **no** edit button yet — Phase 4.

**Why this approach:** no extra screens/effort now; editing lives on the already-planned profile page; when V3 social (shareable profiles, following, commenting) lands, display name + avatar are already in place; the Google name is a sensible default.

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
| 2 | Map library | **Detail-page single pin: OSM embed iframe (dependency-free) — DECIDED 2026-05-29.** Full multi-pin map: **Mapbox — DECIDED 2026-06-13, IMPLEMENTED 2026-06-17** (over Leaflet+OSM and Leaflet+CARTO), for polished rendering. Built with `dark-v11` (the app went warm light-mode, so a dark map contrasts) + structure-colored pins as the My Bridges header. `VITE_MAPBOX_TOKEN` set in Vercel + `.env.local`. | ✅ Phase 3 |
| 3 | Structure type color palette | **PLACEHOLDER in place (2026-05-29).** 9 Tailwind colors are wired into `structureTypes.ts` so the badge works during the build. **CIRCLE BACK: user will pick a proper ColorBrewer qualitative palette (9-class) before ship** — open colorbrewer2.org, 9 classes + qualitative, send the scheme name (e.g. Set1). Swap is a one-file edit (`STRUCTURE_TYPE_COLORS`). Not a blocker for app build. | **Final pick before Phase 4 ship** |
| 4 | ~~"Unknown structure type" display~~ | **RESOLVED 2026-05-29.** Show a neutral "Structure type unknown" pill (never hidden), per §6. Implemented in `StructureBadge`. | — |
| 5 | Overpass fallback | If Overpass times out, show cached result or error? Currently: caught → error state with a "try again" message. Cache fallback arrives with the Phase 2 Supabase cache (§9). | Phase 2 |
| 6 | ~~Wikipedia disambiguation~~ | **RESOLVED 2026-05-29.** Treat `type=disambiguation` as "no article" (graceful gap); a picker is deferred. Bbox-scoped lookup already targets the right bridge by location. | — |
| 7 | ~~Wikidata as tertiary source~~ | **RESOLVED 2026-05-29.** Wikidata is in for MVP, used as the *secondary* source between OSM and Wikipedia (not deferred to V2). Phase 0 test confirmed it recovers structure type, architect, engineer, and length for bridges OSM doesn't tag. Hybrid bridge types come along for free. | — |
| 8 | ~~Resolution when OSM and Wikidata disagree on structure type~~ | **RESOLVED 2026-05-29 — show both.** Both findings render as separate badges (e.g. Hawthorne = `Truss` + `Movable`); it's technically accurate (a truss bridge with a vertical lift) and data stays lossless. Provenance kept in the model. | — |
| 9 | Mapping Wikidata bridge subclasses to the 9 canonical types | **DRAFT implemented 2026-05-29** (`WIKIDATA_KEYWORD_RULES` in `structureTypes.ts` — keyword rules: vertical-lift/swing/bascule → movable, etc.). Needs a PE review pass for completeness/correctness before ship. | Review before Phase 4 ship |
| 10 | ~~Phase 1.5 filter UI pattern~~ | **RESOLVED 2026-05-30 — chips + bottom sheet.** Active-filter chip row above results + accordion bottom sheet. Implemented & deployed. | — |
| 11 | ~~Home-screen filter source + results~~ | **RESOLVED 2026-05-30.** Options come from a **bundled static JSON** (`app/src/data/filterMetadata.json`, generated by `phase-1/gen-seed.mjs`) — no Supabase table, no user setup (revised from the earlier table approach). On apply: **architect / engineer → Wikidata discovery query** → enrich → cards (home-screen producers); **structure type / country → client-side refine** (no query). Name search remains a producer. | — |

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

- **Supabase Row Level Security — before Phase 2 ships. AS BUILT 2026-05-30 (`supabase/migrations/0002_rls.sql`).** RLS is **enabled on both tables** (`bridge_cache`, `user_logs`); there is no `public.users` table (auth.users is managed by Supabase and not anon-exposed). Supabase tables are publicly reachable via the anon key, so without RLS any client could read or write every user's logs.
  - `user_logs` — owner-scoped: `select` / `insert` / `update` policies all require `user_id = auth.uid()`. Removal is a **soft delete** (an `update` setting `is_deleted = true`), so the hard-`delete` policy from `0003_user_logs_delete.sql` is no longer used (harmless to leave; nothing calls DELETE). No user can see or touch another user's logs.
  - `bridge_cache` — shared `select` for everyone (anon + authenticated); `insert` for **authenticated** users (the client populates the cache when she logs — **the service role key is never used client-side**); no `update`/`delete` policy. *(This overrides the earlier "writes restricted to the service role" note: the client must self-populate the cache and we deliberately keep the service role server-only. Trade-off: any signed-in user could insert cache rows, but none can modify or delete existing ones. Acceptable for a 1–2 person app.)*
  - Verify RLS is on for every table — a table with RLS disabled is open to the anon key regardless of intent. (Home-screen filter options are a bundled static config, not a DB table — §5.6 #6 — so no RLS surface.)
- **App Store privacy policy + nutrition labels — before Phase 5.** Phase 5 (native iOS Beta) introduces background location, which Apple treats as sensitive data. A published **privacy policy URL** and accurate **App Privacy "nutrition" labels** (declaring background location collection and its use) are required before the Beta is submitted to App Store Connect — Apple rejects submissions that collect location without them.

---

*Next step: Resolve open decisions 1 and 3 (name + color palette), then validate the Overpass + Wikipedia APIs manually before writing any code.*
