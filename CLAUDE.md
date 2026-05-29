# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

This repository is in **Phase 0** (validate APIs + scaffold; see the brief's Current status). The product brief is `PRODUCT.md` — a living document for **Bridge Buddy** (working name, placeholder set 2026-05-28 — real name still TBD), a personal bridge-tracking app being built as a gift for a professional bridge engineer. The Vite app lives in `app/`, throwaway API-validation scripts in `phase-0/`.

There is no code, no build system, no test suite, and no `package.json` yet. When asked to start building, the brief specifies the stack to scaffold (see below). Do not invent commands that don't exist; if asked "how do I run tests," the honest answer is "the project hasn't been initialized."

The product brief is the source of truth for scope and decisions. Read it before suggesting features or architecture changes. Treat it as a living document — update it when decisions are made rather than letting the code and brief drift apart.

## Non-negotiable scope rules

These are decisions already made in the brief. Do not relitigate them without an explicit instruction from the user.

- **iOS-first, always.** The target user has an iPhone. iPhone Safari (MVP) and the iOS App Store (Beta) come first. **Android is explicitly deferred** until post-Beta. Do not design for, test for, or build for Android.
- **Mobile-first at 390px.** Every screen must work on iPhone 14/15 width before desktop. Real iPhone Safari is the primary test device — iOS Safari differs from Chrome DevTools' emulation.
- **Named bridges only.** The single OSM filter for MVP is `nwr[bridge][name]`. Anonymous overpasses, culverts, and unnamed footbridges are intentionally excluded — this is a feature, not a limitation. If asked to broaden this, push back and reference §6 of the brief.
- **Structure type is never buried.** Visual badge on every card, top of every detail page, filter option in the log. This is the feature the user is expected to interact with most.
- **MVP excludes:** location tracking, push notifications, user photos, social features, editing bridge data, offline mode, NBI engineering data. See §12 — do not add these to MVP work.

## Planned tech stack (from §8 of the brief)

When scaffolding begins, use this stack — these are chosen, not suggestions:

**MVP (mobile web)**
- React (Vite) + Tailwind CSS
- Supabase (Postgres + email/password auth)
- Vercel for hosting
- Leaflet + OSM tiles for maps (MVP) — Mapbox is a possible Beta upgrade
- Overpass API + Wikipedia REST API, called on demand, cached in Supabase

**Beta (native)**
- React Native (Expo), iOS App Store only
- Expo Location (background) + Expo Notifications + APNs

## Data model and caching (from §9)

Three tables: `users`, `bridge_cache`, `user_logs`. Bridge data is **cached in Supabase after first lookup**, refreshed when `cached_at` is older than 30 days — do not call Overpass + Wikipedia on every view. Wikipedia coverage is patchy for regional bridges; handle missing summary/image/url fields gracefully rather than hiding the bridge.

## External APIs

The data pipeline is **three sources**, queried in this order (decided 2026-05-29 after Phase 0 validation):

1. **Overpass** (`https://overpass-api.de/api/interpreter`) — free, no key, fair-use rate limit. Use `out tags;` (no element cap) and **aggregate tags across all matching ways** — a single bridge is many OSM elements (Brooklyn=31, Hawthorne=69) and tags are scattered across siblings.
2. **Wikidata** — fetched via OSM's `wikidata` tag when present, otherwise via name search. Closes the gap when OSM's `bridge:structure` is missing (validated: GWB recovered as suspension). `P31 instance of` returns *all* bridge subtypes — preserves hybrid bridges (Brooklyn = suspension + cable-stayed). Needs a Phase 1 lookup table mapping Wikidata's finer subtypes (vertical-lift, swing, bascule, etc.) to the 9 canonical types in §6.
3. **Wikipedia REST** (`https://en.wikipedia.org/api/rest_v1/page/summary/{name}`) — for summary text + thumbnail. **Set a descriptive `User-Agent` header** per Wikimedia policy. Detect `type=disambiguation` responses and treat as "no article" until a picker is built.

After all three sources, anything still missing displays as "Structure type unknown" per §6 — the gap is intentional and becomes a V3 community-contribution hook.

## Open decisions

§11 lists 5 unresolved decisions (app name, map library, color palette for the 9 structure types, "unknown structure type" display, Overpass timeout fallback). Several gate Sprint 1/2 work. If a task requires one of these and the user hasn't picked, ask before guessing — the brief flags these explicitly so they're answered, not assumed.

## Tone

The user is a licensed PE who specializes in bridges. The brief is emphatic: **don't dumb it down, don't be cutesy.** Engineer-appropriate precision in UI copy, error states, and documentation.
