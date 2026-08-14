# Review backlog — slice-1 code review, below-the-cut items

The slice-1 review reported 10 confirmed correctness findings (fixed separately).
These verified-but-lower-severity items from the same review feed the next slices.
Remove entries as they land.

## Correctness-adjacent

Resolved in slice 2 (2026-08-14): deep-merge unified (engine's `mergeDeep`
delegates to lodash `_.merge` — the express-hbs semantic, arrays merge
index-wise; oracle test in test/engine/merge.test.ts), `_templateOptions`
producer/consumer deduped into `src/engine/local-template-options.ts`,
contentType handling fixed (templates defaults to `[]`, Express res.type
charset/mime semantics restored), markdown alternate link documented as
accepted delta (deltas.md row 11).

Still open:

- **posts_per_page global leak (latent)** — `controllers/collection.ts:41-48` (and now `controllers/channel.ts` with the same ported body) mutates engine-global template options per request; becomes live (request-order-dependent `@config.posts_per_page`) the moment routes.yaml collections/taxonomies with `limit` land. The minimal resolver never sets `routerOptions.limit`, so still latent.
- **degradedRender signal has no exit** — `helpers/get.ts:344` writes `_locals.degradedRender` but `RenderResult` carries no headers, so the Cache-Control cap / `X-Ghost-Degraded-Render` contract (needed by slice-5 core retrofit) is unreachable. Widen the result union when headers land (the redirect-header fix starts this).

## Worker-readiness (slice 2, before the browser bundle)

Resolved in slice 2 (2026-08-14): the O(n²) async-placeholder substitution is
now a single anchored-RegExp pass over the token grammar per generation
(engine.ts substituteTokens + async-resolver.ts TOKEN_PATTERN; generation
loop, `hasResolvers` position-0 quirk and multi-generation cache growth
preserved — all async-helper/mini-theme tests and live byte-parity unchanged),
`hasResolvers` uses `indexOf`, the three fetch-data cloneDeeps are gone (the
posts-payload one paid for the ContentApiPort freshly-owned-JSON contract now
documented in seam/types.ts), matchPermalinkParams memoizes per permalink
string, the 41 root-lodash imports go through the `src/utils/lodash.ts`
subpath aggregator, and prev-post imports moment-timezone (plain `moment`
dropped from package.json). Bundle (vite, ES worker build, min+gzip):
395 → 377 KB gz. `sanitize-html` **bundles cleanly for the browser** (no Node
built-ins) and is kept per the fidelity-wins call — but it is the single
biggest dependency at ~100KB gz (its postcss/htmlparser2 graph; the old ~50KB
estimate was half the real cost). Revisit the minimal-allowlist replacement if
worker bundle size starts to matter.

Still open (deliberate, verbatim-port fidelity — upstream-fix candidates):

- **`{{#has}}` builds a RegExp per tag×term** — `helpers/has.ts:44` (verbatim port; equality check suffices). Candidate to fix upstream first, else document divergence.
- **`ghost_head` serial awaits** — `helpers/ghost-head.ts:354-355`: `getMetaData` and `getFrontendKey` are independent; Promise.all them.
- **`entryLookup` re-match** — match-permalink-params memoization removed the recompiles, but entryLookup could still accept the already-matched params from the route candidate instead of re-matching.
- **`@tryghost/nql-lang` is not browser-safe** (found by the worker harness): unguarded `process.env` reads at import time (its `require('util')` resolves to the browserify util polyfill whose module scope reads `process.env.NODE_DEBUG`) and at parse time (jison's `yy.debug()` reads `process.env.DEBUG`). Worked around by `src/utils/process-env-guard.ts`; fix upstream, then delete the guard.
- **`@tryghost/helpers` ships an `es/` build without a default export** — bundlers resolve it via `module`, so default imports break browser builds while working in Node. Worked around with namespace imports (provenance STD transform 6); an upstream `exports` map would make the two builds agree.

## Structure / conventions

- ~~**Catalog entries duplicate inline pins**~~ — done in slice 2: `handlebars`, `@tryghost/social-urls`, `downsize-cjs`, `human-number`, `sanitize-html` (+ `common-tags`/`@types/common-tags`, added to the catalog for the comment_count port) flipped to `catalog:` in `ghost/core/package.json` and koenig's handlebars likewise; resolved versions unchanged.
- **Integration suite runs under test:unit and silently skips in CI** — `test/integration/live-render.test.ts` skipIf-skips without Ghost, so CI green asserts nothing about live parity and coverage numbers differ by environment. Split into a `test:integration` target (excluded from unit coverage) once CI story exists; longer-term give CI a Ghost instance. (Softened in slice 2: `test/integration/fixture-parity.test.ts` renders the recorded fixtures hermetically, so CI does now pin the render output — just against recorded data, not a live instance. `test:browser` likewise needs a Playwright Chromium in CI or it fails rather than skips.)
- **Seam bypasses** — `helpers/services/handlebars.ts:16,41`, `rendering/templates.ts:126`, `rendering/template-options.ts:52`, `controllers/collection.ts:41,51` import `getRendererDeps`/`activeTheme` from `seam/deps.ts` directly instead of through `seam/proxy.ts`; add `config`/`themeEngine` delegates to proxy.ts to keep ports byte-diffable and slice-5's per-render-context swap single-file.
- **Second compile path bypasses onCompile** — `seam/handlebars-env.ts:30-38` compiles core-helper partials with its own `{preventIndent: true}` instead of the engine's compile (where marker injection will land in slice 3); route core partials through the engine's registrar.
- **i18n interpolation triplicated** — `seam/stubs.ts:203` `createSimpleThemeI18n` ≡ `theme/theme-source.ts:69` `interpolate` (+ a third in `utils/frontend-apps.ts:8`); the stub copy is what unit tests exercise while renders use the theme-source copy. Collapse to one.
- **Content API client triplicated** — `seam/settings.ts:72` re-implements the fetch/base-URL/error handling `seam/content-api.ts` owns (with already-diverged error mapping: settings 401 → opaque error). Extract one request helper.
- **Twin `themeI18n`/`themeI18next` ports always bound to the same object** — collapse to one dep exposing both wrapper names for the verbatim `t.js` body.
- **Dead code** — `src/seam/index.ts` barrel (no importers), `settingsPayload` resolved in both `createDefaultDeps` and `loadDefaultDeps`, `resolve.ts` `permalink` option no production caller can reach (wire it or hardcode), `SettingsSnapshot.raw` and `ThemeSource.files` never read, `seam/stubs.ts:66` private `extname` duplicating `engine/paths.ts`.
- **README lacks exception justification** — packages/README.md requires recording exceptions (lowered coverage thresholds, blanket eslint-disables on ported files, hybrid copy policy) in the README, not only in config/docs; add a short section linking docs/provenance.md.
