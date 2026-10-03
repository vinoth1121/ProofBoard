# ProofBoard

> **Live demo → https://proofboard.vercel.app**
> Try a deep link straight away: https://proofboard.vercel.app/campaigns/c-007

![ProofBoard campaign detail with the film-strip proof-of-play timeline](docs/hero.png)

An outdoor advertising campaign delivers a promise: *your ad ran, here are the
proofs*. ProofBoard is the tool an advertiser opens when that promise needs
checking — and it opens it as a **film strip**, one frame per verified play,
with the screen ID and timestamp burned into each frame.

![The film-strip timeline panning across every play in a campaign](docs/timeline.gif)

---

## The pitch

Most proof-of-play tools hand you a CSV of play logs and expect you to trust it.
ProofBoard shows you the timeline. Forty-two plays across ten screens read as
forty-two frames; a gap in the schedule is a visible gap in the strip; a screen
that ran twice an hour looks strange because the frames sit next to each other.

Everything else follows from that: the numbers on the header are the ones you
argue about, every frame is clickable, and if something looks wrong you flag it
in one keystroke.

**Stack:** React 18 · Vite · TypeScript (strict) · React Router · plain CSS
Modules · Mock Service Worker · Vitest + React Testing Library

---

## Why this is different

### 1. A visual proof-of-play timeline, not a table of numbers

The film strip is the product. Each frame is a generated SVG "capture" — a
colour-field composition derived deterministically from the play record, with
the screen ID, date and time stamped into the image itself, a camera-ish
vignette, scanlines, and a status lamp. Uncorroborated plays are hatched amber,
flagged plays carry a red badge. Nothing is stock photography: the artwork is
drawn from the data, so it is stable, weighs ~2 KB, and cannot drift from the
row it represents.

*Why it matters:* an auditor can scan 40 frames in two seconds and spot the
anomaly before reading a single number.

### 2. All filter state lives in the URL

Search, status, city, sort direction, page **and** the detail page's date window
are query-string state. `/campaigns?status=live&city=Chicago&sort=completion&dir=desc&page=2`
is a complete, shareable view; back/forward walk the filter history; a shared
link reproduces the screen exactly. The debounced search commits with
`replace` so typing does not fill the back button.

*Why it matters:* "can you send me the screen where…" stops being a support
ticket and becomes a copy-paste.

### 3. Optimistic updates that actually roll back

Flagging a play as suspicious paints the change immediately and reconciles
silently. The mock registry rejects flag writes ~10% of the time, and when it
does the row snaps back and a stamped banner explains why. The rollback
restores an exact snapshot rather than decrementing a counter, so header stats
can never drift from the rows on screen.

### 4. A realistic API, in the browser, in production

There is no backend. MSW intercepts `/api/*` in **dev, preview and the deployed
production build**, with 400–900 ms artificial latency and a ~10% failure rate
on the plays endpoint. That means the skeletons, error states, retry buttons
and rollback paths are not decoration — they are the default experience, and the
live demo needs no server.

### 5. Blueprint, not dashboard

Deep navy `#0B1F3A`, cyan `#5CE1E6` line work, a two-tier drafting grid, white
mono microlettering, corner crop marks and dimension rules with sloped end
ticks. Space Grotesk for headings, JetBrains Mono for data, both with full
fallback stacks. A light "paper blueprint" theme ships alongside it. No UI kit.

---

## Features

| | |
|---|---|
| **Campaign index** | Debounced search, status/city filters, five sort keys with direction, pagination, all URL-synced |
| **Campaign detail** | Delivered vs booked, shortfall and completion stats, film-strip timeline, play log table, date-range filter with 7/30/90-day presets |
| **Proof modal** | Focus-trapped, `Esc` closes, `←`/`→` step through frames, restores focus to the trigger |
| **Flag as suspicious** | Optimistic paint, per-play pending spinner, exact rollback, dismissible error banner |
| **States** | Blueprint skeletons, error panels with retry, drawn empty states, 404 sheet |
| **Code splitting** | Detail route is a `React.lazy` chunk (24 kB) fetched on demand |
| **A11y** | Semantic landmarks, `aria-live` result counts, `aria-pressed` filters, `aria-current` pagination, full keyboard operability, `prefers-reduced-motion` honoured |

### Keyboard map

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Move through frames and controls (trapped inside the modal) |
| `Enter` / `Space` | Open the focused proof frame |
| `←` `→` | Previous / next frame (in the modal) |
| `Esc` | Close the modal |

---

## Architecture

```
                            ┌──────────────────────────────────────────┐
   URL query string  ──────▶│  useUrlState<T>  (hooks/useUrlState)     │
   "?status=live&page=2"     │  parse ⇄ serialize, replace-aware        │
                            └───────────────────┬──────────────────────┘
                                                │ CampaignListFilters
                            ┌───────────────────▼──────────────────────┐
                            │  useDebounce / useDebouncedCallback      │
                            │  collapse keystrokes, settle to the URL  │
                            └───────────────────┬──────────────────────┘
                                                │
      ┌─────────────────────────────────────────▼──────────────────────────────────┐
      │  useRequest<T>  — abort stale work, sequence-guard races,                │
      │                    isPending (skeleton) vs isRefreshing (stale-while-revalidate) │
      └───────┬───────────────────────────────────────────────┬───────────────────┘
              │                                               │
   useCampaigns(filters)                          usePlays({id, from, to})
              │                                               │
              │                                     mutate() ◀── optimistic flag
              │                                               │ rollback on failure
              │                                               ▼
   ┌──────────▼───────────────────────────────────────────────▼──────────────────┐
   │  features/campaigns            │  features/plays                             │
   │   CampaignListPage             │   CampaignDetailPage  (React.lazy chunk)    │
   │   CampaignFilters              │   StatsHeader · DateRangeFilter            │
   │   CampaignCard                 │   FilmStripTimeline  ◀── the signature     │
   │   Pagination                   │   PlayTable · ProofModal (focus trap)      │
   └──────────┬────────────────────┴───────────────┬──────────────────────────────┘
              │                                    │
              └──────────────┬─────────────────────┘
                             ▼
   ┌────────────────────────────────────────────────────────────────────────────┐
   │  lib/                                                                     │
   │   types.ts · filters.ts ◀── PURE filter/sort/paginate, shared by the UI    │
   │   api.ts   · format.ts · rng.ts · router.ts          and the mock server   │
   └──────────────────────────────┬─────────────────────────────────────────────┘
                                  │  fetch('/api/...')
                                  ▼
   ┌────────────────────────────────────────────────────────────────────────────┐
   │  mocks/  (MSW — runs in the browser in dev AND production)                 │
   │   browser.ts · server.ts · handlers.ts · db.ts (seeded) · config.ts        │
   │   db.ts: 24 campaigns · 500+ plays · mulberry32(0xb00a24) · fixed anchor   │
   │   handlers: 400–900 ms delay · ~10% failure on GET /plays · 409 on flag   │
   └────────────────────────────────────────────────────────────────────────────┘
```

**Layering rule:** `lib/filters.ts` is pure and framework-free, and *both* the
React list and the mock handlers call it. The view and the "server" therefore
cannot disagree about what a filter means — and the filter logic is unit-tested
without rendering anything.

**Data flow for a flag:**
`click → snapshot data → mutate(local) → POST → success: drop snapshot` /
`→ failure: restore snapshot + surface reason`. Pending and error state live in
`usePlays`, so the UI never has to reason about request bookkeeping.

---

## Running it locally

```bash
npm install
npm run dev          # http://localhost:5173  (MSW starts automatically)
```

Everything below is one command:

```bash
npm run dev        # dev server
npm run build      # typecheck + production build
npm run preview    # serve the built bundle, MSW still active
npm test           # 72 tests (Vitest + RTL)
npm run test:watch # watch mode
npm run lint       # ESLint, zero warnings tolerated
npm run format     # Prettier write
npm run typecheck  # tsc -b
npm run smoke -- http://localhost:4173   # real-Chrome smoke test (see below)
```

`npm run smoke` drives the **built** bundle in your installed Chrome or Edge
(Playwright core, no browser download) and asserts 17 behaviours: cards render
from the mock API, filter state round-trips through the URL, `/campaigns/c-007`
survives a hard refresh, the modal traps focus and steps frames with arrow keys,
flagging paints optimistically and settles, empty and 404 states draw, and the
theme toggles. It also captures the README frames:

```bash
npm run build
npm run preview &
npm run smoke -- http://localhost:4173 --shots docs/shots
```

**Quality gates:** TypeScript `strict` + `noImplicitOverride` +
`noImplicitReturns` + `exactOptionalPropertyTypes`, ESLint with
`@typescript-eslint/no-explicit-any: error` and zero-warning budget, Prettier,
and 72 tests over 7 files — filter/sort/paginate logic, URL serialisation,
debounce semantics, seeded-data invariants, the four REST endpoints, the
optimistic-update and rollback path, and the detail route end to end.

---

## Design notes

- **The theme is applied before first paint.** A tiny inline script in
  `index.html` reads `localStorage` and sets `data-theme` on `<html>`, so
  there is no flash of the wrong palette; `useTheme` then keeps it in sync.
- **CSS Modules only.** Class names are camelCase so `styles.foo` matches the
  source exactly. All colour, type, spacing, motion and line weights come from
  custom properties in `styles/tokens.css`, which is why the light theme is a
  ~30-line override rather than a second stylesheet.
- **Race safety.** `useRequest` tags each request with a monotonic sequence and
  ignores any response that is not the newest, so fast filter changes cannot
  render stale data.
- **One realm-check, honestly documented.** Passing an `AbortSignal` to `fetch`
  fails where the signal and the fetch implementation come from different
  realms (jsdom under Vitest). `lib/api.ts` probes this once with the platform's
  own `Request` and degrades to "no signal" — the caller's abort guard still
  prevents stale commits.
- **No `any`, anywhere** — enforced by a lint rule rather than by convention.

---

## What I'd build next

1. **Real proof media.** The generated SVG frames are the honest stand-in for
   camera captures. Next: an upload pipeline for screen-sourced frame grabs,
   with perceptual hashing to spot duplicate or reused captures across
   campaigns — the actual fraud vector in OOH verification.
2. **Timeline analytics.** A density strip (plays per day/hour) with anomaly
   highlighting, so "nothing ran on 12 August" is visible without counting
   frames. Completion trends per campaign over its flight.
3. **Dispute workflow.** Flags currently mutate local state. Next: a review
   queue, an audit trail, credit notes tied to shortfall, and export to PDF for
   the media-agency conversation.
4. **Virtualised timeline.** Campaigns with tens of thousands of plays need
   windowed rendering; the film strip should handle 100k frames without
   dropping below 60 fps.
5. **URL state that survives the API.** Today filters live in the query string
   but the API contract is re-derived per request. A normalised, shareable
   filter grammar (`?q=&status=live,ended&range=30d&sort=-completion`) with
   parsed-and-versioned URLs.
6. **Offline-first.** A service worker is already in place for MSW; the same
   layer could cache recent play logs so an auditor can review in a tunnel.
7. **Split the mock out of the bundle.** Production currently ships the mock
   worker (~90 kB gzip). A build flag would let a real deployment talk to a real
   API without touching a line of application code — which is the whole point
   of keeping `lib/api.ts` as the only network boundary.

---

## Licence

MIT