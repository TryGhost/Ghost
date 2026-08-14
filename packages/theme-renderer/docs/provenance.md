# Provenance manifest — @tryghost/theme-renderer

Every file copied from ghost/core (or elsewhere), its origin, the transforms
applied, and the seam stubs it touches. Origin revision for all ghost/core
copies: **`407e032dc7`** (branch `theme-renderer`, 2026-08-14). This manifest is
the drift ledger required by the spec's hybrid copy policy (principle #2):
resync = diff the origin file at HEAD against `407e032dc7`, apply the same
transforms, update the revision here.

**Standard transforms** (applied to every copied file, abbreviated **STD**):

1. CJS `require`/`module.exports` → ESM `import`/`export`.
2. Imports of `services/proxy`, `services/handlebars`, `services/data`,
   `shared/*` (labs, settings-cache, max-limit-cap, machine-payments, config,
   url-utils, sentry), `@tryghost/logging`, `@tryghost/debug` → the package's
   seam modules (`src/seam/*`).
3. TS-tolerable annotations only where the compiler forces them (`any` params,
   `!` non-null, `as any` casts, `let`→`const` where a reassignment changes
   type, `_`-prefix for unused params, explicit `return undefined` for
   `noImplicitReturns`). Function bodies otherwise byte-identical.
4. File names hyphenated (`body_class.js` → `body-class.ts`) to satisfy the
   repo filename lint rule; registered helper names are unchanged.
5. File-level `eslint-disable` headers (`no-explicit-any`, and where the
   original code shape requires it: `no-this-alias`, `prefer-rest-params`,
   `prefer-const`) — the visible marker of "copied, loosely typed".
6. *(slice 2, worker-readiness — import-line-only, call sites unchanged)*
   `import _ from 'lodash'` → `import _ from '<rel>/utils/lodash.ts'` (the
   package-local aggregator of lodash subpath imports — root lodash drags the
   whole library into the browser bundle), and
   `import helpers from '@tryghost/helpers'` → `import * as helpers` (the
   package's `es/` build, which browser bundlers resolve, has no default
   export — named/namespace access only).

## src/helpers/ (34 helpers + machinery)

| File | Origin (ghost/core/core/frontend/) | Transforms beyond STD | Seam/stubs touched |
| --- | --- | --- | --- |
| helpers/asset.ts | helpers/asset.js | — | urlUtils, meta/asset-url |
| helpers/authors.ts | helpers/authors.js | — | urlService, templates |
| helpers/body-class.ts | helpers/body_class.js | final `classes = classes.join(...)` → new `classesString` const (type change) | settings (`heading_font`/`body_font` **undefined** → custom font classes omitted) |
| helpers/comment-count.ts | helpers/comment_count.js | lazy `require('common-tags')` (boot-speed optimization) → static import | — |
| helpers/concat.ts | helpers/concat.js | — | — |
| helpers/content.ts | helpers/content.js | — | templates (`content-cta` partial) |
| helpers/date.ts | helpers/date.js | local var `date` → `dateValue` (collides with fn name in ESM scope) | — |
| helpers/encode.ts | helpers/encode.js | — | — |
| helpers/excerpt.ts | helpers/excerpt.js | — | meta/generate-excerpt |
| helpers/foreach.ts | helpers/foreach.js | `(hbsUtils as any).appendContextPath` (not in @types/handlebars) | checks |
| helpers/get.ts | helpers/get.js | `utils/process-env-guard.ts` imported above the nql-lang import (browser/worker compat, see src/utils row) | api (HTTP), config (`optimization:*` keys), applyLimitCap, prepareContextResource |
| helpers/ghost-foot.ts | helpers/ghost_foot.js | — | settings, blogIcon, templates (`gift-toast`) |
| helpers/ghost-head.ts | helpers/ghost_head.js | fn renamed `ghost_head`→`ghostHead` (camelcase lint); `head.push.apply` → spread; `urlUtils.getSiteUrl(true)` → `getSiteUrl()` (comment-counts URL; port takes no args) | settings (many non-public keys, see Deltas), config, blogIcon, cardAssets stub, getFrontendKey, settingsHelpers, machine-payments, getMarkdownUrl |
| helpers/has.ts | helpers/has.js | inner `checks` object → `hasChecks` (avoids confusion with seam `checks`) | — |
| helpers/img-url.ts | helpers/img_url.js | — | urlUtils, utils/images |
| helpers/is.ts | helpers/is.js | — | — |
| helpers/link.ts | helpers/link.js | — | config (`url`), localUtils |
| helpers/link-class.ts | helpers/link_class.js | — | config (`url`), localUtils |
| helpers/match.ts | helpers/match.js | — | — |
| helpers/meta-description.ts | helpers/meta_description.js | — | meta/description |
| helpers/meta-title.ts | helpers/meta_title.js | — | meta/title |
| helpers/navigation.ts | helpers/navigation.js | — | templates (`navigation` partial) |
| helpers/page-url.ts | helpers/page_url.js | — | meta/paginated-url |
| helpers/pagination.ts | helpers/pagination.js | — | templates (`pagination` partial) |
| helpers/plural.ts | helpers/plural.js | — | — |
| helpers/post-class.ts | helpers/post_class.js | final reduce result → new `classesString` const | — |
| helpers/prev-post.ts | helpers/prev_post.js | `import moment from 'moment'` → `'moment-timezone'` (same instance; avoids double-shipping moment in the browser bundle) | api (HTTP; `skipPagination` stripped by the binding) |
| helpers/raw.ts | helpers/raw.js | — | — |
| helpers/reading-time.ts | helpers/reading_time.js | — | checks |
| helpers/t.ts | helpers/t.js | — | themeI18n/themeI18next ports (init handled by seam), labs, settings |
| helpers/tags.ts | helpers/tags.js | — | urlService, templates |
| helpers/tiers.ts | helpers/tiers.js | `lodash/isString` require → subpath import; `let accessProductsList` → `const` | hbs (SafeString/escapeExpression) |
| helpers/title.ts | helpers/title.js | — | — |
| helpers/url.ts | helpers/url.js | — | meta/url |
| helpers/tpl/styles.ts | helpers/tpl/styles.js | — | — |
| helpers/tpl/partials.ts | helpers/tpl/*.hbs (navigation, pagination, content-cta, gift-toast, cancel_link, recommendations) | .hbs sources embedded verbatim as string constants + `registerCoreHelperPartials()` (replaces express-hbs `partialsDir` fs loading) | hbs shim (compiles on register, `preventIndent: true`) |
| helpers/services/registry.ts | services/helpers/registry.js | module singleton → `createHelperRegistry(registrar)` factory | HelperRegistrar |
| helpers/services/handlebars.ts | services/helpers/handlebars.js | engine singleton → injected HelperRegistrar; `process.env.NODE_ENV` → seam `config.get('env')`; `errors.utils` resolved from either the CJS default export or the ES build's named export (@tryghost/errors ships both shapes); the async wrapper's catch is hardened — a throwing error path (unconfigured seam deps, throwing logging) still calls `cb('')` so the placeholder promise settles and the render cannot hang | logging |
| helpers/services/register-ghost-helpers.ts | services/helpers/register-ghost-helpers.js | requires → static imports; **trimmed to Tier-2 set**. Omitted registrations: cancel_link, collection, color_to_rgba, comments, content_api_key, content_api_url, contrast_text_color, facebook_url, json, price, readable_url, recommendations, search, social_accounts, social_url, split, total_members, total_paid_members, twitter_url (`tiers` IS registered — the content-cta partial calls it for tier-gated posts) | — |
| helpers/services/index.ts | services/helpers/index.js | re-export shape only | — |

## src/meta/ (24 modules)

All: origin `ghost/core/core/frontend/meta/<same-name>.js`, transforms STD
unless noted.

| File | Notes |
| --- | --- |
| asset-url.ts | `getGlobalAssetHash`'s `crypto` md5-of-boot-time → `config.get('assetHash') \|\| assetHash.globalHash` (constant); `getThemeAssetHash`/`getPublicAssetHash` (fs + `path` resolution + active theme peek) collapsed into `assetHash.getHashForFile` (returns null → global-hash fallback, upstream's behavior for missing files) |
| author-fb-url.ts, author-image.ts, author-url.ts, blog-logo.ts, canonical-url.ts, context-object.ts, cover-image.ts, creator-url.ts, description.ts, excerpt.ts, keywords.ts, modified-date.ts, og-image.ts, paginated-url.ts, published-date.ts, schema.ts, structured-data.ts, title.ts, twitter-image.ts, url.ts | STD only |
| generate-excerpt.ts | inline `require('downsize-cjs')` hoisted to top-level import |
| get-meta.ts | STD only |
| image-dimensions.ts | STD only — `cachedImageSizeFromUrl` resolves null via stub → dimensions never attached (see Deltas) |
| og-type.ts | `type-fest` `ReadonlyDeep` annotation inlined |
| rss-url.ts | `services/routing` registry.getRssUrl → seam `getRssUrl` stub |
| index.ts | export map preserved |

## src/utils/

| File | Origin | Notes |
| --- | --- | --- |
| utils/frontend-apps.ts | frontend/utils/frontend-apps.js | STD only |
| utils/images.ts | frontend/utils/images.js | `@tryghost/image-transform`.canTransformToFormat → seam stub (package drags sharp) |
| utils/member-count.ts | frontend/utils/member-count.js | STD; `api.stats.memberCountHistory` is a zero-totals stub in the default binding |
| utils/lodash.ts | fresh (slice 2) | the package-local `_` surface: subpath imports of exactly the methods the copied files use, so root lodash stays out of the browser bundle (STD transform 6) |
| utils/process-env-guard.ts | fresh (slice 2) | browser/worker guard: defines `globalThis.process = {env: {}}` when absent — `@tryghost/nql-lang` reads `process.env` unguarded at import time (via the browserify `util` polyfill) and at parse time (`yy.debug()`); imported above the nql-lang import in helpers/get.ts. Upstream-fix candidate; no-op in Node |

## src/rendering/ (the ported render pipeline)

Origin `ghost/core/core/frontend/services/rendering/<name>.js` @ 407e032dc7,
transforms STD + Express req/res → the ports in `src/ports.ts` (fresh —
inbound request context + outbound result union per extraction-map §(b)).

| File | Transforms beyond STD/ports |
| --- | --- |
| context.ts | — |
| templates.ts | `themeEngine.getActive()` → `getRendererDeps().activeTheme`; `url.parse(req.url).pathname` → `req.path`; getTemplateForError's fs fallback (config.paths.defaultViews error.hbs) → the string `'error'` |
| format-response.ts | `hbs.get/updateLocalTemplateOptions` → the pure copies in template-options.ts |
| renderer.ts | `res.render`+`res.send` → `{render}` result value; degraded-render Cache-Control capping + X-Ghost-Degraded-Render header dropped; ENOENT handling moved to the assembly; `res.type(contentType)` → `toContentTypeHeader` (mime extension shorthands + `; charset=utf-8` for text/* + application/json, matching Express/mime v1); `routerOptions.templates` defaults to `[]` (upstream routers always set an array) |
| render-entry.ts, render-entries.ts | — |
| error.ts | `next()` closure → direct error→result mapping (`{next: true}` / `{error}`) |
| template-options.ts | mixed: get/updateLocalTemplateOptions re-exported from src/engine/local-template-options.ts (the single owner of the `locals._templateOptions` contract; bodies copied from express-hbs lib/hbs.js@2.5.0); `buildGlobalTemplateOptions`/`applyLocalTemplateOptions` are the theme-engine/middleware/update-{global,local}-template-options.js ports (middleware → pure functions; preview.handle dropped — no preview requests) |

## src/data/ (ported data services)

Origin `ghost/core/core/frontend/services/data/<name>.js` @ 407e032dc7, transforms STD.

| File | Transforms beyond STD |
| --- | --- |
| fetch-data.ts | lazy `require('../proxy').api` → seam call-time api proxy; *(slice 2, perf)* the three `cloneDeep`s dropped — postQuery is built as a fresh two-level copy per call, taxonomy specs are already `_.merge({}, ...)`d, and the posts payload is owned per the ContentApiPort contract (seam/types.ts) |
| entry-lookup.ts | api proxy as above; `url.parse(postUrl).path` → manual `?`/`#` strip; `giftToken` lookup option dropped (anonymous-only) |
| match-permalink-params.ts | `path-match@1.2.4` inlined (~30 lines) over a direct `path-to-regexp@1.9.0` dependency; its http-errors 400 on bad URI encoding → ValidationError (falls through to 404 like upstream's 400 for theme traffic); *(slice 2, perf)* compiled match function memoized per permalink string (upstream recompiles per call) |

## src/routing/ (ported adapters + fresh resolver)

| File | Origin | Notes |
| --- | --- | --- |
| config.ts | routing/config.ts @ 407e032dc7 | byte-identical |
| permalink-adapter.ts | routing/permalink-adapter.ts @ 407e032dc7 | byte-identical |
| api-adapter.ts | routing/api-adapter.ts @ 407e032dc7 | `@tryghost/adapter-base-route-settings` type imports → local mirror route-settings-types.ts (types only) |
| route-settings-types.ts | fresh (mirrors adapter-base-route-settings types) | RouteData/DataEntry/DataShortForm/DataLongFormEntry shapes only |
| controllers/collection.ts | routing/controllers/collection.js @ 407e032dc7 | `security.string.safe` → `@tryghost/string` slugify (safe()'s body); `routerManager.ownsResource` → seam urlService (router-manager delegates there); `themeEngine.getActive()` → deps.activeTheme; next(err) → handleError result |
| controllers/channel.ts | routing/controllers/channel.js @ 407e032dc7 | same transform set as collection.ts (slugify substitution, deps.activeTheme, next(err) → handleError result); no ownership filter upstream either |
| controllers/entry.ts | routing/controllers/entry.ts @ 407e032dc7 | gift-links + markdown negotiation dropped; redirectToAdmin/redirect301 → `{redirect}` results (URL construction reproduced) |
| controllers/entry/canonical-url.ts | .../entry/canonical-url.ts @ 407e032dc7 | node:url format/parse → whatwg URL + search slice |
| resolve.ts | fresh | default-routes resolver; routerOptions shapes copied from collection-router/static-pages-router/taxonomy-router `_prepare*Context`; page-param semantics ported from routing/middleware/page-param.js (`/page/1/` → 301 redirect candidate, page < 1 → no candidates → 404, otherwise `parseInt`ed before pathOptions); taxonomy `/edit` → 302 admin redirect candidate (taxonomy-router `_redirectEditOption` — redirectToAdmin URL construction reproduced); taxonomy RSS routes out of scope; to be replaced by the full lazy-matcher port (routes.yaml parsing, custom collections/taxonomies) |

## src/theme/, src/ports.ts, src/index.ts (fresh assembly)

| File | Notes |
| --- | --- |
| ports.ts | request/response port types (extraction-map §(b)) |
| theme/theme-source.ts | virtual-fs ThemeSource: resolver + theme config (defaults copied from theme-engine/config/defaults.json: posts_per_page 5, card_assets true; allowedKeys from config/index.js) + root template inventory + `@custom` defaults from package.json `config.custom` + locales/{locale}.json i18n ({var} interpolation) |
| index.ts | `createRenderer()` assembly + `render(Request) → Response`; `createEngineHelperRegistrar` (engine → HelperRegistrar adapter); pretty-urls trailing-slash 301 (only `.md`/`.txt` skip, Cache-Control from `caching:301:maxAge`); subdir handling with Express mount semantics (segment-boundary strip, out-of-mount → 404, redirect Locations keep the subdir); ghost-locals equivalent (version/safeVersion from the settings payload `version`, relativeUrl); themed error path porting web/middleware/error-handler.js `themeErrorRenderer` + mw-error-handler `prepareError` (error template hierarchy via `setTemplate` req.err branch; render-time engine NotFoundError → IncorrectUsageError per rendering/renderer.js:40-48; plain-text status-line fallback, never raw upstream messages); per-render re-assert of the deps + hbs singletons |

## src/seam/ (the data seam)

| File | Kind | Notes |
| --- | --- | --- |
| types.ts | fresh | Port interfaces (extraction-map §(b)) + `HelperRegistrar` (engine adapter contract — helpers never import src/engine) |
| deps.ts | fresh | Module-level deps singleton (mirrors Ghost's proxy singleton shape; per-render context is a later cleanup per spec scope guard) |
| proxy.ts | fresh (mirrors services/proxy.js surface) | `prepareContextResource` body copied verbatim from proxy.js (sanitize-html allowlist). `api` is a JS Proxy delegating controller lookups at call time. Not carried over: `members` (unsubscribe route — out of scope), `serverEvents` (no server bus in the package) |
| handlebars-env.ts | fresh | The package's `services/handlebars.js`: mutable handlebars environment (`setHandlebarsInstance` lets the assembly share the engine's instance; SafeString/Utils/createFrame are cross-environment statics). `registerPartial` compiles string sources (`preventIndent: true`) like express-hbs. themeI18n/themeI18next delegate to injected ports with truthy `_strings`/`_i18n` so t.js skips lazy init |
| template.ts | copied | theme-engine/handlebars/template.js @ 407e032dc7 (`templates.execute` + lodash micro-templates) |
| local-utils.ts | copied | theme-engine/handlebars/utils.js @ 407e032dc7 (`findKey`, `buildLinkClasses`) |
| data.ts | copied | services/data/checks.js @ 407e032dc7, exported as `checks` |
| shared.ts | mixed | Delegating `labs`/`logging` + no-op `debug`; **copied**: shared/max-limit-cap.js (`applyLimitCap`, config via seam), shared/machine-payments.ts (verbatim), services/llms/markdown.js `getMarkdownPath`/`getMarkdownUrl` only |
| url-utils.ts | copied | @tryghost/url-utils@5.2.6 `lib/utils/{deduplicate-double-slashes,deduplicate-subdirectory,strip-subdirectory-from-path,url-join,absolute-to-relative,relative-to-absolute,replace-permalink}.js` + `lib/UrlUtils.js` methods (`urlJoin`, `createUrl`, `urlFor`, `isSiteUrl`, `absoluteToRelative`, `relativeToAbsolute`). The npm package is Node-bound (`require('url')`, cheerio/remark/moment for html/markdown transforms) so the render-path subset is copied: `require('url').URL` → global whatwg `URL`; class → `createUrlUtils` factory over injected `getSiteUrl`/`getAdminUrl`/`getSubdir`; html/markdown/mobiledoc/lexical/transform-ready methods dropped (unused by the render path); `redirect301`/`redirectToAdmin` dropped per extraction map (redirects become result values) |
| content-api.ts | fresh | HTTP Content API binding (see Stubs & deltas). Maps HTTP failures back to typed Ghost errors (404/`type: NotFoundError` → NotFoundError, 422/ValidationError → ValidationError, else InternalServerError) so rendering/error.ts's errorType dispatch — and the Collections→StaticPages fall-through — works across the HTTP boundary |
| settings.ts | fresh | Async `loadSettings` → sync snapshot (`get`/`getPublic`); un-resizes the serializer-rewritten `icon` path so the copied blogIcon logic applies its own resize |
| url-service.ts | fresh | Slice-1 `getUrlForResource` preferring serializer-attached `resource.url`; `ownsResource` → true. **The lazy permalink-matcher/router-filter port is deferred to the parity slice** |
| config.ts | fresh | nconf-style `:`-separated lookup over a plain object; `isPrivacyDisabled` mirrors shared/config/helpers.ts exactly (`useTinfoil` blanket with the per-feature `privacy[flag] === true` opt-in, then `privacy[key] === false`) |
| stubs.ts | mixed | See Stubs & rationale. `createBlogIcon` is a **copy** of server/lib/image/blog-icon.js URL methods (getIconUrl/getIconType/getIconExt/getSourceIconExt; class → factory, `path.extname` → local helper, fs-bound methods dropped) |
| defaults.ts | fresh | Assembles the default RendererDeps binding. Enforces the @tryghost/config-url-helpers contract on the injected URLs once at entry: `getSiteUrl()` always ends with `/`; `getAdminUrl()` gets a trailing slash, the site subdirectory appended and duplicate subdirectories removed (getAdminUrl's slash-cleanup line replicated inline — the copied url-utils `deduplicateSubdirectory` predates it). Seeds `caching:301:maxAge` (31536000, shared/config defaults.json) for permanent-redirect Cache-Control |

## Stubs & rationale

| Stub | Replaces | Behavior + rationale |
| --- | --- | --- |
| `createAssetHash` | frontend/services/asset-hash | `getHashForFile` → null (needs fs); global hash is the constant `themerender` instead of md5(boot time). Asset URLs get a stable `?v=themerender`. |
| `createCardAssets` | frontend/services/assets-minification | `hasFile('js'\|'css')` computed from the theme's package.json `config.card_assets`: `false` → no files; `{include: []}` → no files; anything else → files exist. False-positive edge: an `exclude` list covering every card. No filesystem peeks. |
| `createBlogIcon` | server/lib/image blogIcon | URL/type/ext methods copied; `getIconDimensions` (image-size + fs) dropped. |
| `createImageSizeCache` | server/lib/image cachedImageSizeFromUrl | Resolves null → meta/image-dimensions attaches **no width/height** (see Deltas). Probing needs storage/network streams. |
| `createIsInternalImage` | server/adapters/storage/utils | Pattern-match on `/content/(images\|media\|files)/` under the site URL — what the local storage adapter amounts to; custom storage adapters may differ. |
| `createGetRssUrl` | frontend/services/routing registry | Always `/rss/` (index collection default). Custom routes.yaml RSS placements differ — parity-slice concern along with routing. |
| `canTransformToFormat` | @tryghost/image-transform | Static format list (avif/gif/jpeg/jpg/png/webp); the real package drags sharp. |
| `createSimpleThemeI18n` | theme-engine i18n/i18next | `{var}` interpolation over the key itself — @tryghost/i18n's behavior when no theme locale file exists. Real locale loading is injectable via `RendererDeps.themeI18n`. |
| `getFrontendKey` (defaults.ts) | server/services/internal-keys | Returns the injected Content API key. Ghost uses a separate internal frontend key; scripts emitted into `ghost_head` (portal/search) carry the injected key instead. |
| `settingsHelpers` (defaults.ts) | server/services/settings-helpers | `isWebAnalyticsEnabled` → false (needs non-public settings + config); `isStripeConnected` → `paid_members_enabled` (best public signal). Injectable. |
| `api.stats.memberCountHistory` (content-api.ts) | server/api stats | Zero totals — no Content API equivalent. `{{total_members}}`/`{{total_paid_members}}` aren't registered this slice anyway. |
| `logging`/`debug`/`sentry` | @tryghost/logging, @tryghost/debug, shared/sentry | No-op console-free defaults; injectable `LoggingPort`. (sentry only mattered for readable_url — not ported.) |

## HTTP Content API binding — option mapping

`api[controller][type](options)` (fetch-data/entry-lookup dispatch shape) maps to:

- `browse(options)` → `GET {siteUrl}/ghost/api/content/{resource}/?key=…` with
  query params from: `include, filter, fields, formats, limit, order, page,
  visibility`.
- `read({slug, …})` → `GET …/{resource}/slug/{slug}/`; `read({id, …})` →
  `GET …/{resource}/{id}/` (entry-lookup picks slug|id from permalink params).
- Stripped (in-process only): `context` ({member, giftToken} — anonymous-only
  per spec), `skipPagination` (prev_post), `status` (Content API is
  published-only).
- Response body returned as-is; every resource carries the serializer-attached
  `url` the url helper / urlService seam rely on.

## Known deltas (accepted for slice 1)

1. **Non-public settings return `undefined`** — not in the Content API
   `/settings/` payload: `announcement_content`, `announcement_visibility`
   (announcement bar never renders), `heading_font`, `body_font` (custom-font
   CSS/body classes omitted), `members_track_sources` (member-attribution
   script omitted), `is_private` (treated as public), `llms_enabled`,
   `machine_payments_enabled` (markdown alternate link only renders for public
   posts when `llms_enabled` is undefined — matches upstream default-on), 
   `web_analytics_enabled`, `social_web_enabled` (admin-toolbar attrs),
   `active_theme` (theme name injected via ActiveThemePort instead),
   `meta_title`/`meta_description` for the *site* are public and present.
2. **Image dimensions omitted** — `og:image:width/height` and schema logo
   dimensions never emitted (image probing stubbed).
3. **Asset hash defaults to a constant** (`?v=themerender`) instead of the
   per-boot md5; inject the instance's real hash via `createRenderer({config:
   {assetHash}})` — upstream-faithful, since ghost/core's `getGlobalAssetHash`
   also lets a configured `assetHash` win. Content-based SHA256 per-file
   hashing (`caching:assets:contentBasedHash`) remains stubbed (needs fs).
4. **Frontend key = Content API key** in portal/sodo-search script attributes.
5. **`{{total_members}}`-family and other non-Tier-2 helpers not registered**
   (list under register-ghost-helpers.ts above). Themes calling them get
   handlebars "missing helper" behavior; Casper does not.
6. **rssUrl fixed to `/rss/`**; custom routes.yaml is out of scope this slice.
7. **urlService is url-attribute-backed**; resources without a serializer
   `url` resolve to `/404/`. Full lazy matcher port = parity slice.
8. **labs = the public `labs` setting** (getPublic exposes it); server-side
   flag overrides/GA graduation logic not replicated.
9. **Settings icon**: snapshot un-resizes the serializer's `w256h256` rewrite;
   if Ghost ever changes the resize path this needs the same change.
10. **sanitize-html** is used for `prepareContextResource` as upstream; its
    browser-bundle viability (postcss dependency) is to be proven in the
    parity slice's Web Worker run — if it fails there, swap for a minimal
    allowlist sanitizer.
11. **members/serverEvents proxies not carried over** (unsubscribe route and
    site.changed subscription are server concerns).

## Test provenance

`test/helpers/*` and `test/seam/*` are characterization tests: cases and
expected values adapted from `ghost/core/test/unit/frontend/helpers/*` and the
origin sources at `407e032dc7` (attribution comments at the top of each file).
`test/utils/renderer-test-utils.ts` mirrors ghost/core `test/utils`
`createHbsResponse`.
