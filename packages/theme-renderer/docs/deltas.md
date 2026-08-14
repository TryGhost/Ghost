# Observed render deltas — slice 1

Rendered output vs the live dev instance (`http://localhost:2368`, Casper,
Ghost 6.58), captured by `test/integration/live-render.test.ts` on 2026-08-14.
The rendered/live HTML pairs live in `test/integration/__output__/`
(gitignored) — re-run the integration test to regenerate them.

Everything below is a *known, explained* difference; the structural page —
`<article>`/`<nav>`/`<header>`/`<footer>` counts, title, canonical, generator,
og/twitter meta, JSON-LD keys, navigation, members CTA styles, Stripe script,
accent color, webmention link — matches the live instance on both routes.

Byte parity (whitespace and beyond) is deliberately not chased here — slice 2.

| # | Route | Delta | Cause | Expected fix (slice) |
| --- | --- | --- | --- | --- |
| 1 | all | Asset URLs carry `?v=themerender` instead of the live per-boot hash (`?v=b4304bf4c0`) — screen.css, casper.js, cards.min.js/css, comment-counts.min.js | `createAssetHash` stub: no fs/boot-time md5 (documented in provenance.md) | 2 — inject the live hash or accept as permanent documented delta |
| 2 | all | `og:image:width`/`og:image:height` meta missing; JSON-LD `image`/`logo` objects lack `width`/`height` | `createImageSizeCache` stub resolves null — image probing needs storage/network streams | 2 — implement probing over fetch (or accept) |
| 3 | all | Portal + Sodo-search `<script>` tags missing (`/ghost/assets/portal/portal.min.js`, `/ghost/assets/sodo-search/sodo-search.min.js`) | frontend-app config (`portal:{url,version}`, `sodoSearch:{...}`) is Ghost *server* config, not in the Content API; no default injected | 2 — pass instance config into `createRenderer({config})` in the harness; the code path already works (proven in unit tests) |
| 4 | all | `member-attribution.min.js` script missing | `members_track_sources` is a non-public setting → undefined via Content API | 2 — injectable settings override, or accept |
| 5 | home (per post-card), post (related-post cards) | `{{comment_count}}` emits nothing — live emits one `<script data-ghost-comment-count="...">` per card (25 on home, 3 on the post page) | `comment_count` helper is not in the Tier-2 registered set | 2 — port the helper (trivial, pure) when broadening helper coverage |
| 6 | post | `{{comments}}` block renders nothing (Casper guards it with `{{#if comments}}`, so the section is absent rather than broken) | `comments` helper not registered (needs members/comments config) | 2/5 |
| 7 | all | `<script>` count: rendered 7 vs live 35 (home) / 13 (post) | Sum of deltas 3, 4, 5 — no unexplained scripts remain | — |
| 8 | all | `<meta>` count: rendered 20 vs 22 (home), 23 vs 25 (post) | Delta 2 (og:image dimensions) | — |
| 9 | all | `@custom` values come from the theme's package.json defaults | Custom theme settings are Admin-API-only; live values unreachable with a Content API key. Dev instance uses defaults, so no visible diff today | 4/5 — Admin API session in the editor slices |
| 10 | all | Analytics/tinybird script absent on both sides today; would diverge if enabled on the instance | `isWebAnalyticsEnabled()` stub → false (non-public settings + config) | 2 — injectable |
| 11 | / (subresource) | `/rss/`, sitemap, robots, static assets are not served — only HTML routes render | Out of package scope (extraction-map §(a) exclusions) | 5 — stays in core |

Cross-check notes:

- The Collections→StaticPages fall-through (post 404 → page lookup) works over
  HTTP because the Content API binding rebuilds typed errors from the error
  payload (`type: 'NotFoundError'`) — see provenance.md content-api.ts row.
- `?v=b4304bf4c0`-style hashes also mark delta 1's boundary: any URL differing
  ONLY in the `?v=` query is delta 1, not a new finding.
