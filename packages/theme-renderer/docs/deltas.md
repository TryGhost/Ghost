# Observed render deltas — slice 2 (parity)

Slice 1 captured twelve deltas against the live dev instance
(`http://localhost:2368`, Casper, Ghost 6.58). Slice 2 drove them down: the
rendered home, post and tag routes are now **byte-identical** to the live HTML
modulo the documented stubs below, enforced by
`test/integration/parity.test.ts` — its `NORMALIZATIONS` list carries exactly
one entry per surviving delta row, each rewriting the live HTML into the
renderer's expected output, so any *undocumented* divergence fails the byte
comparison. The rendered/live pairs land in `test/integration/__output__/`
(gitignored).

## Fixed in slice 2

| # (slice 1) | Delta | Fix |
| --- | --- | --- |
| 1 | Asset URLs carried `?v=themerender` instead of the live per-boot hash | Inject via `createRenderer({config: {assetHash}})` — upstream-faithful (ghost/core's `getGlobalAssetHash` also lets a configured `assetHash` win). The parity harness scrapes the live page's `?v=` value. Without injection the constant default remains. |
| 3 | Portal + sodo-search `<script>` tags missing | Instance config injected via `createRenderer({config: {portal: {url}, sodoSearch: {url, styles}}})` (extraction-map §6 config keys); harness scrapes the live script tags. Byte-identical output including data attributes. |
| 5 | `{{comment_count}}` emitted nothing (25 per-card scripts on home, 3 on the post page) | Helper ported (`src/helpers/comment-count.ts`, verbatim incl. the common-tags `html` template — byte-identical script blocks). |

## Documented stubs (normalization entries in parity.test.ts)

| # | Route | Delta | Cause | Future |
| --- | --- | --- | --- | --- |
| 2 | all | `og:image:width`/`og:image:height` meta missing; JSON-LD `image`/`logo` objects lack `width`/`height` (two normalization entries: meta tags + JSON-LD keys) | `createImageSizeCache` stub resolves null — image probing needs storage/network streams | implement probing over fetch, or accept permanently |
| 4 | all | `member-attribution.min.js` script missing | `members_track_sources` is a non-public setting → undefined via Content API | injectable settings override, or accept (same class as announcement_*/fonts) |

## Latent deltas (no visible diff on the dev instance today — no normalization entry, so they fail the parity test the moment they become visible)

| # | Route | Delta | Cause | Expected fix (slice) |
| --- | --- | --- | --- | --- |
| 6 | post | ~~`{{comments}}` renders nothing~~ — RESOLVED: the helper is ported (helpers/comments.ts) and byte-parity holds with comments enabled. It became visible (and broke parity as designed) the day the dev instance turned comments on; what remains is row 13 below | — | done |
| 13 | post | `{{comments}}` renders nothing when the instance config has no comments script URL (seam guard in helpers/comments.ts) | The comments-ui URL is per-instance (`config comments:url`) and only scrapeable from a page that carries the tag — a post page with comments enabled. Entering edit mode from such a page supplies it; from other pages the preview omits the comments box | accept, or scrape a post page during editor boot |
| 9 | all | `@custom` values come from the theme's package.json defaults | Custom theme settings are Admin-API-only; dev instance uses defaults, so no visible diff | 4/5 — Admin API session in the editor slices |
| 10 | all | Analytics/tinybird script absent on both sides today; would diverge if enabled | `isWebAnalyticsEnabled()` stub → false (non-public settings + config) | 2 — injectable |

## Out of package scope (unchanged from slice 1)

| # | Route | Delta | Cause | Expected fix (slice) |
| --- | --- | --- | --- | --- |
| 11 | subresources | `/rss/` (incl. taxonomy `/tag/:slug/rss/`), sitemap, robots, static assets are not served — only HTML routes render. `ghost_head` still advertises the `<link rel="alternate" type="text/markdown">` while the `.md` route 404s (accepted with the llms_enabled default-on). `llms_enabled` itself is a non-public setting, so a site that turned AI access OFF drops the link while the renderer keeps it — the parity suite excludes the link on BOTH sides (`bothSides` normalization) | Out of package scope (extraction-map §(a) exclusions) | 5 — stays in core |
| 12 | any `.md`/`.txt` path | 404s instead of serving the markdown (llms) representation. Matching origin pretty-urls, these extensions are the ONLY ones skipping the trailing-slash 301 | The llms markdown route is out of scope; the skip-extension behavior matches server/web/shared/middleware/pretty-urls.js | 5 — stays in core |

Slice-1 rows 7/8 (`<script>`/`<meta>` count summaries) are retired — the byte
comparison subsumes them.

## Worker parity (slice 2 capstone)

The home + post routes also render **byte-identical inside a real Web Worker**
(Chromium via Vitest browser mode, `pnpm test:browser` →
`test/browser/worker-render.test.ts`): the worker's output is compared against
committed Node-rendered HTML for the same recorded Content API fixtures, and
`test/integration/fixture-parity.test.ts` keeps the Node side of that claim
honest hermetically. Fixtures re-record via
`node test/integration/record-browser-fixtures.ts` (Ghost dev instance
required). Browser-compat findings live in
docs/review-backlog.md §Worker-readiness (nql-lang `process.env`,
@tryghost/helpers default export) and docs/provenance.md (STD transform 6,
src/utils rows).

## Route coverage

- `/` (collection index) — byte parity ✔
- `/:slug/` (post entry; static-page fall-through) — byte parity ✔
- `/tag/:slug/` (taxonomy channel; added in slice 2 with the channel
  controller port) — byte parity ✔ (incl. `/page/:n/` pagination + page-1
  301 alias + `/edit/` 302 admin redirect, verified against live headers)
- `/author/:slug/` shares the taxonomy machinery (unit-tested; not in the
  live byte-diff yet)
- `/page/:n/` collection pagination: unit-tested; the dev instance has a
  single page of posts so no live byte-diff

Cross-check notes:

- The Collections→StaticPages fall-through (post 404 → page lookup) works over
  HTTP because the Content API binding rebuilds typed errors from the error
  payload (`type: 'NotFoundError'`) — see provenance.md content-api.ts row.
- Any URL differing ONLY in the `?v=` query means the harness's scraped
  `assetHash` is stale (Ghost restarted mid-run) — rerun; it is not a finding.
