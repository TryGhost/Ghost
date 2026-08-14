# Review backlog — slice-1 code review, below-the-cut items

The slice-1 review reported 10 confirmed correctness findings (fixed separately).
These verified-but-lower-severity items from the same review feed the next slices.
Remove entries as they land.

## Correctness-adjacent (attack in slice 2 — parity)

- **Two deep-merge semantics on one templateOptions tree** — `src/engine/merge.ts` (arrays overwrite, non-plain objects by reference) vs `_.merge` used in `src/index.ts:120`, `src/rendering/template-options.ts:106`, `src/rendering/format-response.ts:45,115`. Array-valued options (`@site.navigation`) merge differently depending on which path last touched them. Pick one semantic (probably: engine adopts the rendering module's).
- **`_templateOptions` key duplicated across producer/consumer** — `engine.ts:394-402` and `rendering/template-options.ts:24,29` both own the `locals._templateOptions` contract; rename on one side silently drops `@site.url`/`@member`/`@page`. Move to one shared module.
- **contentType handling** — `rendering/renderer.ts:30` non-null-asserts `routerOptions.templates` (static-pages candidates have none; custom routes with content_type will TypeError) and drops the `; charset=utf-8` Express's `res.type()` added.
- **posts_per_page global leak (latent)** — `controllers/collection.ts:41-48` mutates engine-global template options per request; becomes live (request-order-dependent `@config.posts_per_page`) the moment routes.yaml collections with `limit` land.
- **degradedRender signal has no exit** — `helpers/get.ts:344` writes `_locals.degradedRender` but `RenderResult` carries no headers, so the Cache-Control cap / `X-Ghost-Degraded-Render` contract (needed by slice-5 core retrofit) is unreachable. Widen the result union when headers land (the redirect-header fix starts this).
- **Markdown alternate link advertised but unserved** — `ghost-head.ts` emits `<link rel="alternate" type="text/markdown">` while the `.md` route was dropped; either suppress the link (settings-gated) or document as accepted delta with the llms_enabled default.

## Worker-readiness (slice 2, before the browser bundle)

- **O(n²) async-placeholder substitution** — `engine.ts:406-438`: per-value×per-value + full-document scans per generation, multi-pass. Replace with one anchored RegExp pass over the fixed token grammar. Also `async-resolver.ts:60` `text.search(string)` recompiles a regex per loop — use `indexOf`.
- **Bundle landmines** — root `lodash` imports in 39 files (switch to subpath or drop trivial predicates), `moment` + `moment-timezone` both shipped (`helpers/prev-post.ts` imports plain moment), `sanitize-html` (~50KB gz) for a 4-tag allowlist. ~320KB gz total addressable.
- **`_.cloneDeep` of the full posts payload per collection render** — `data/fetch-data.ts:104` (1–3MB JSON); the HTTP binding returns freshly-owned JSON, clone is pure waste. Same for the smaller clones at :47/:70.
- **path-to-regexp recompiled 3–4× per request** — `data/match-permalink-params.ts:78`; memoize per permalink string, and let `entryLookup` accept the already-matched params from the route candidate.
- **`{{#has}}` builds a RegExp per tag×term** — `helpers/has.ts:44` (verbatim port; equality check suffices). Candidate to fix upstream first, else document divergence.
- **`ghost_head` serial awaits** — `helpers/ghost-head.ts:354-355`: `getMetaData` and `getFrontendKey` are independent; Promise.all them.

## Structure / conventions

- **Catalog entries duplicate inline pins** — `handlebars`, `@tryghost/social-urls`, `downsize-cjs`, `human-number`, `sanitize-html` are now in the catalog AND pinned inline in `ghost/core/package.json` (+ koenig's handlebars). Flip the inline pins to `catalog:` so the renderer and core can't silently diverge on the libraries that produce rendered bytes.
- **Integration suite runs under test:unit and silently skips in CI** — `test/integration/live-render.test.ts` skipIf-skips without Ghost, so CI green asserts nothing about parity and coverage numbers differ by environment. Split into a `test:integration` target (excluded from unit coverage) once CI story exists; longer-term give CI a Ghost instance.
- **Seam bypasses** — `helpers/services/handlebars.ts:16,41`, `rendering/templates.ts:126`, `rendering/template-options.ts:52`, `controllers/collection.ts:41,51` import `getRendererDeps`/`activeTheme` from `seam/deps.ts` directly instead of through `seam/proxy.ts`; add `config`/`themeEngine` delegates to proxy.ts to keep ports byte-diffable and slice-5's per-render-context swap single-file.
- **Second compile path bypasses onCompile** — `seam/handlebars-env.ts:30-38` compiles core-helper partials with its own `{preventIndent: true}` instead of the engine's compile (where marker injection will land in slice 3); route core partials through the engine's registrar.
- **i18n interpolation triplicated** — `seam/stubs.ts:203` `createSimpleThemeI18n` ≡ `theme/theme-source.ts:69` `interpolate` (+ a third in `utils/frontend-apps.ts:8`); the stub copy is what unit tests exercise while renders use the theme-source copy. Collapse to one.
- **Content API client triplicated** — `seam/settings.ts:72` re-implements the fetch/base-URL/error handling `seam/content-api.ts` owns (with already-diverged error mapping: settings 401 → opaque error). Extract one request helper.
- **Twin `themeI18n`/`themeI18next` ports always bound to the same object** — collapse to one dep exposing both wrapper names for the verbatim `t.js` body.
- **Dead code** — `src/seam/index.ts` barrel (no importers), `settingsPayload` resolved in both `createDefaultDeps` and `loadDefaultDeps`, `resolve.ts` `permalink` option no production caller can reach (wire it or hardcode), `SettingsSnapshot.raw` and `ThemeSource.files` never read, `seam/stubs.ts:66` private `extname` duplicating `engine/paths.ts`.
- **README lacks exception justification** — packages/README.md requires recording exceptions (lowered coverage thresholds, blanket eslint-disables on ported files, hybrid copy policy) in the README, not only in config/docs; add a short section linking docs/provenance.md.
