# Extraction map — ghost/core frontend rendering → @tryghost/theme-renderer

Survey of `ghost/core/core/frontend` at `407e032dc7` (2026-08-14, branch `theme-renderer`).
This is the ground truth for what gets copied and what gets injected. It supersedes the
Aug-2026 "coupling map" artifact (see §Contradictions at the end). Paths are relative to
`ghost/core/core/`.

## 1. Render path for a normal page request

Express hand-off: `frontend/web/site.js:40` `setupSiteApp()` — view engine set at `:47`,
member session middleware `:142`, theme middleware `:146`, analytics header wrapper
`:176-186` (reads `res.locals.ghostAnalytics`, set by `ghost_head`), routes mounted
`:188-192`. `res.locals.version/safeVersion/relativeUrl` come from
`server/web/parent/middleware/ghost-locals.js:10-21`.

### Collection/home route
1. Mount: `routing/collection-router.js:67-102` (`/` → `controllers.collection`, `/page/:page(\d+)`, `_prepareEntryContext` mutates `res.routerOptions` for later mounts).
2. Controller: `routing/controllers/collection.js:22` — `pathOptions {page, slug, limit}`; `routerOptions.limit` wins else active theme `posts_per_page`, pushed into **global** template options (`:34-40`); `dataService.fetchData(pathOptions, res.routerOptions, res.locals)` (`:53`); 404 when page > pagination.pages; ownership filter re-adds `type` + `status:'published'` (serializer strips them) before `routerManager.ownsResource` (`:75-88`); `renderer.renderEntries(req,res)(result)`.
3. Format: `rendering/render-entries.js:12` → `format-response.js:11` `formatPageResponse` — posts → `response.posts`, pagination, `result.data[name]` unwrapping, `prepareContextResource`, `@page.show_title_and_feature_image` for page data (`:32-43`).
4. Render: `rendering/renderer.js:17` — `setContext` → `templates.setTemplate` → `res.render(res._template, data)`. Template hierarchy for home: `['home','index']` via `templates.js:48,112,156,174`.

### Post/entry route
1. Mount: `collection-router.js:88-99` — `/:slug/:options(edit)?/` (+`.md` variant); pages via `static-pages-router.js:42-59` hardcoded `/:slug/`.
2. Controller: `routing/controllers/entry.ts:54` — gift-link pre-checks (`entry/gift-links.ts`); `dataService.entryLookup(req.path, res.routerOptions, res.locals, {giftToken})`; edit-URL redirect to admin; markdown negotiation (`entry/markdown.ts`, uses `req.app.get('llmsService')` — hard Express coupling); permalink staleness → 301 to `buildCanonicalUrl` (`entry/canonical-url.ts:9`); `renderer.renderEntry(req,res)(entry)`.
3. Format: `render-entry.js:11` → `formatResponse(post, context, locals)` → `{post}` (+`.page` alias when page context).
4. Render: hierarchy `[post-<slug>|page-<slug>, custom_template?, 'page'?, 'post']` (`templates.js:85,192-197`).

### `res.routerOptions` shapes
Collection index (`collection-router.js:108-122`):
`{type:'collection', filter, limit, order, permalinks:'/:slug/:options(edit)?/', resourceType:'posts', query: QUERY.post, context:['index'|name], frontPageTemplate:'home', templates:[...], identifier, name, data}`.
Entry in collection: same object mutated to `{context:['post'], type:'entry'}` (`:130-134`).
Static page entry (`static-pages-router.js:69-75`): `{type:'entry', permalinks, resourceType:'pages', query: QUERY.page, context:['page']}` — no identifier/data/filter.

### `res.locals` / `_locals` at render
`res.locals` keys: `version, safeVersion, relativeUrl, member, staffFrontendToolsEnabled, staffFrontendToolsCookieUpdated, _templateOptions, _giftLink, context, degradedRender, ghostAnalytics`.
Express 4 `res.render` sets `opts._locals = res.locals` and merges `app.locals → opts._locals → opts` — so the handlebars **root** is `{...res.locals, ...data, _locals: res.locals}`. `ghost_head` reads `dataRoot._locals.context` and `._locals.safeVersion` specifically (`ghost_head.js:288-321`).
`rendering/context.js:19` computes `res.locals.context`: `['paged'?, 'home'? (regex ^\/$ on relativeUrl), ...routerOptions.context, 'private'?, then 'page'|'post'|'tag' from data shape]`.

### Template options (the `@`-data frame)
- **Global** (`theme-engine/middleware/update-global-template-options.js:37-49`): `data.site` = `settingsCache.getPublic()` + `signup_url` + `comments_enabled/comments_access`; `data.labs` = `labs.getAll()`; `data.config` = `{posts_per_page, image_sizes}` from active theme; `data.custom` = custom theme settings.
- **Per-request** (`update-local-template-options.js:44-51`, stored on `res.locals._templateOptions`): `data.member` (masked shape at `:27-40`), `data.site` = `{url, admin_url}` + preview overrides, `data.custom` preview, `data._queryCache` when labs `getHelperDeduplication`.
- Per-request **writes into global state**: `collection.js:34` / `channel.js:35` mutate `data.config.posts_per_page` from routerOptions.limit.
- Merge at render (`express-hbs/lib/hbs.js:~499`): `_.merge({}, globalTemplateOptions, localTemplateOptions)` — local wins.
So `@site @labs @config @custom @member @page @_queryCache` = data frame; `post/posts/pagination/context/_locals` = root.

## 2. The data seam

`frontend/services/proxy.js` exports (115 lines): `getFrontendKey (:25)`, `socialUrls (:42)`, `blogIcon (:43)`, `cachedImageSizeFromUrl (:44)`, `isInternalImage (:46)`, `prepareContextResource (:48 — sanitize-html on feature_image_caption, deletes show_title_and_feature_image)`, `config {get, isPrivacyDisabled} (:71)`, `settingsCache (:77)`, `settingsHelpers {isWebAnalyticsEnabled, isStripeConnected, getMembersValidationKey} (:80)`, lazy `members (:90)`, `api = server/api endpoints (:95)`, `serverEvents.on` allow-listed to `site.changed` (:98)`, `labs (:111)`, `urlService = LazyUrlService singleton (:113)`, `urlUtils (:114)`.

Bypasses (render-critical files requiring shared/* or server/* directly):
- `helpers/get.js:6` shared/max-limit-cap; `helpers/ghost_head.js:18,20` shared/labs + shared/machine-payments; `helpers/readable_url.js:7` shared/sentry; `helpers/t.js:15,16` shared/labs + shared/settings-cache.
- `meta/*`: urlUtils (asset-url, author-image, canonical-url, cover-image, og-image, paginated-url, twitter-image, url), settingsCache (blog-logo, context-object, description, get-meta, og-image, title, twitter-image), config (image-dimensions, schema, asset-url).
- `rendering/templates.js:9` config (paths.defaultViews); routing controllers + routers: config/urlUtils/settingsCache various; theme-engine: config, labs, settingsCache, custom-theme-settings-cache (NOT exported by proxy).
Biggest un-proxied dep: `shared/url-utils` (36 sites), then config, settings-cache.

## 3. Data access from controllers

Everything goes through the **in-process Content API** (`server/api/endpoints`, pipeline 'content'), never models, never the URL service for fetching.

- `data/fetch-data.js:63` `fetchData(pathOptions, routerOptions, locals)`: `%s`→slug substitution; `options.context = {member: locals.member}` (`:51`); dispatch `(api[query.controller] || api[query.resource])[query.type](options)`; default post query = `resolveApiCall({type:'browse', resource:'posts'})` + `include:'authors,tags,tiers'`; extra `routerOptions.data` via `resolveRouteData`; returns `{posts, meta, data:{[name]: rows}}`.
- `data/entry-lookup.js:16` `entryLookup(postUrl, routerOptions, locals, {giftToken})`: `matchPermalinkParams(routerOptions.permalinks, path)` (`match-permalink-params.js:30`, path-match + hyphen constraining `:6-28`); `.read({slug|id, include:'authors,tags,tiers', context:{member, giftToken?}})`; returns `{entry, isEditURL, isUnknownOption}`.
- `routing/api-adapter.ts`: `resolveApiCall(:118)`, `resolveRouteData(:128)`, `resolveResourceRead(:151)`; `ALLOWED_QUERY_OPTIONS (:48)` = limit, order, filter, include, slug, visibility, status, page.
- `routing/permalink-adapter.ts:8` `toExpressNotation('{slug}' → ':slug')` — the single domain→Express boundary.
- `routing/config.ts`: `QUERY (:1-46)` tag|author|post|page|previews|email → `{controller, type, resource, options}`; `TAXONOMIES (:48-59)`.

## 4. Lazy URL service

Singleton `server/services/url/index.js:1-7` = `new LazyUrlService({findResource: createFindResource(models)})`, injected into `RouterManager.init` (`router-manager.js:67`) via `bridge.js:109`.

- **Inbound URL→resource: the frontend does NOT use `urlService.resolveUrl`** — it's Express route match + entry-lookup + Content API read + staleness check against serializer-attached `entry.url`. `resolveUrl` consumers are server-only (mentions, member-attribution, stats).
- **Resource→URL:** `getUrlForResource(resource, {absolute?, withSubdirectory?})` (`lazy-url-service.ts:345`) — **sync and pure** given registered router configs. Frontend callers: `meta/url.js:60,64` (fallback only — prefers serializer-attached `data.url`, warns `URL_HELPER_MISSING_URL`), `meta/author-url.js:10,14`, `helpers/tags.js:30`, `helpers/authors.js:37`, plus rss/sitemap/email-post/previews (out of scope).
- Purity ledger: `permalink-matcher.ts` (matchPermalink `:75`, toLookupParams `:110`) **pure**; `router-filter.ts` (routerTypeOf, buildFilter, filterMatches) **pure**; `url/config.js` pure data; `FetchRoutableResources`/`FindResource` **injected** (models by default); `urlUtils` injectable-with-default; `getUrlForResource`/`ownsResource`/`onRouterAddedType`/`getRequiredFields`/`getRequiredRelations` sync/pure.
- Registration: `onRouterAddedType(identifier, filter, resourceType, permalink)` (`:221`) called from `router-manager.js:32-53`; `routerConfigs` order = priority (`:188-189, 370-382`).

## 5. Theme engine + express-hbs

`express-hbs@2.5.0`, `express@4.22.2`. One shared instance (`theme-engine/engine.js:3` `hbs.create()`); `configure()` sets `partialsDir: [config.paths.helperTemplates, themePartials?]`, `onCompile` → `handlebars.compile(source, {preventIndent: true})`, `restrictLayoutsTo: themePath`.
**Note:** `onCompile` drops `filename` from its signature but express-hbs sets `compiled.__filename` itself afterwards (`lib/hbs.js:349-359`) — error messages keep template names. (The old coupling map overstated this.)
`active.js`: `ActiveTheme` — `hasTemplate (:87)`, `config(key) (:99)`, `updateTemplateOptions (:95)`, `initI18n (:109, labs themeTranslation → i18next vs legacy)`, `mount(siteApp) (:122)` resets assetHash + sets views/engine; module singleton `get()/set()` (`:137-156`); mounted lazily by `middleware/ensure-active-theme.js:27-29`.
`services/handlebars.js:10-25` re-exports `{hbs, SafeString, escapeExpression, templates, themeI18n, themeI18next, localUtils}` — all helpers bind to that one instance. Registration: `services/helpers/registry.js:6-22` → `services/helpers/handlebars.js:37/42` (async wrapper `:7-34`: errors → `''` in prod, message in dev).

## 6. ghost_head / ghost_foot

`helpers/ghost_head.js` (526 lines, async):
- settingsCache keys: `is_private, llms_enabled, members_enabled, donations_enabled, recommendations_enabled, locale, paid_members_enabled, announcement_content, announcement_visibility, title, web_analytics_enabled, social_web_enabled, comments_enabled, site_uuid, codeinjection_head, icon, members_track_sources, heading_font, body_font`.
- config keys: `isPrivacyDisabled('useStructuredData'), referrerPolicy, env, tinybird:tracker(,:local), {portal,sodoSearch,announcementBar,adminToolbar}:{version,url,styles}` (via `utils/frontend-apps.js:3-18`).
- Emission order: meta description/favicon (`blogIcon`)/canonical; markdown alternate link (llms_enabled gating + machine-payments `:36-65`); robots/referrer/prev-next/OG/Twitter/JSON-LD (`escapeJsonLd :87`); generator/RSS; Portal script + members styles + Stripe; sodo-search; announcement bar; admin-toolbar script (gated on `_locals.staffFrontendToolsEnabled`); webmention link; cardAssets (`hasFile('js'|'css')` → `public/cards.min.{js,css}`, flagged `// BAD REQUIRE` `:9-11`); comment-counts script; member-attribution script; analytics (`isWebAnalyticsEnabled` → self-hosted `public/ghost-stats.min.js` + tb_* params; sets `dataRoot._locals.ghostAnalytics = true` `:462` → `X-Ghost-Analytics` header in site.js); accent-color style; codeinjection_head (global/post/tag); custom fonts CSS (`@tryghost/custom-fonts`).
`helpers/ghost_foot.js` (55 lines, sync): codeinjection_foot + gift toast (`_giftLink` → `templates.execute('gift-toast', ...)`, theme-overridable partial).
`meta/get-meta.js:29` `getMetaData(data, root)` — async, composes 24 sub-modules (awaits image dimensions → structuredData → schema). `meta/asset-url.js:115` `getAssetUrl(assetPath, hasMinFile)` — depends on asset-hash service, active theme path, `config urls:assets`, `caching:assets:contentBasedHash:enabled`, `getContentPath('public')`.

## 7. Helpers inventory (57 files)

Registered in `services/helpers/register-ghost-helpers.js:4-56`.
- **Async (9):** collection, comments, content_api_key, get, ghost_head, prev_post (+next_post alias), recommendations, total_members, total_paid_members.
- **Pure:** color_to_rgba, comment_count, concat, contrast_text_color, date, encode, has, is, json, match, plural, post_class, price, raw, search, split, tiers, title, tpl/styles.
- **proxy-only:** authors, body_class, cancel_link, content_api_url, facebook_url, twitter_url, social_url, social_accounts, img_url, link, link_class, tags, content_api_key.
- **proxy + intra-frontend:** asset, excerpt, meta_description, meta_title, page_url, url (→ meta/); foreach, prev_post, reading_time (→ data/checks); navigation, pagination (→ templates); collection, get, recommendations (→ proxy.api); comments (→ utils/frontend-apps); total_members/total_paid_members (→ utils/member-count.js:14 → `api.stats.memberCountHistory.query()`); content (→ templates, hbs); ghost_head, ghost_foot.
- **Bypassing proxy (4):** get.js (max-limit-cap), ghost_head.js (labs, machine-payments), readable_url.js (sentry), t.js (labs, settings-cache).

## 8. routes.yaml handling

Server-side only: `server/services/route-settings/` — adapter-backed store (`@tryghost/adapter-base-route-settings`: `RouteSettings {routes: Route[], collections: CollectionConfig[], taxonomies: {tag?, author?}, yamlSource}`), `parseRouteSettings (:306)`, defaults in `default-routes.yaml`. Permalinks in **domain `{slug}` notation**; `toExpressNotation` converts at the router boundary.
Mount order (`router-manager.js:101-150`): Unsubscribe → Email → Preview → StaticRoutes (routes) → Collections → StaticPages (always `/:slug/`) → Taxonomies → AppsRouter. Precedence = Express mount order + `_respectDominantRouter` (`parent-router.js:85-115`, uses `resolveResourceRead`) + NotFound fall-through (`rendering/error.js:9-19`). URL-service registration order mirrors mount order.

## (a) Minimal copy list for Casper home + post

**Tier 1 — pipeline (near-verbatim, strip Express types):**
`rendering/{index,renderer,templates,context,format-response,render-entry,render-entries,error}.js`, `routing/controllers/{collection.js,entry.ts}`, `routing/controllers/entry/canonical-url.ts`, `data/{index,fetch-data,entry-lookup,match-permalink-params,checks}.js`, `routing/{api-adapter.ts,permalink-adapter.ts,config.ts}`, `services/handlebars.js`, `theme-engine/{engine,active}.js`, `theme-engine/config/index.js`, `theme-engine/handlebars/{template,utils}.js`, `theme-engine/middleware/{update-global-template-options,update-local-template-options}.js` (→ pure functions returning options), `services/helpers/{index,registry,handlebars,register-ghost-helpers}.js`.

**Tier 2 — helpers Casper uses:** asset, authors, body_class, concat, content, date, encode, excerpt, foreach, get, ghost_foot, ghost_head, has, img_url, is, link, link_class, match, meta_description, meta_title, navigation, page_url, pagination, plural, post_class, prev_post, raw, reading_time, t, tags, title, url (+ pure aliases). Plus **all of `frontend/meta/`** (24 modules), `frontend/utils/{frontend-apps,images,member-count}.js`, `helpers/tpl/styles.js`.

**Tier 3 — do NOT copy the Express routers** (`parent-router.js` walks `req.app._router.stack`). Keep routing thin: the package receives/derives `{routerOptions, pathOptions}` from a minimal resolver.

**Excluded:** web/site.js + web middleware, apps, assets-minification, asset-hash (inject `getHashForFile`), llms, rss, sitemap, private-blogging, controllers/{previews,email-post,unsubscribe,static,channel,rss}. Inject `cardAssets.hasFile()` + `assetHash` instead of copying services.

## (b) Seam functions the package must have injected

```ts
settings.get(key): unknown; settings.getPublic(): Record<string, unknown>
customThemeSettings.getAll(): Record<string, unknown>
labs.isSet(flag): boolean; labs.getAll(): Record<string, boolean>
config.get(key): unknown; config.isPrivacyDisabled(key): boolean; config.getContentPath('public'): string
settingsHelpers.isWebAnalyticsEnabled(): boolean; settingsHelpers.isStripeConnected(): boolean
urlUtils.{urlFor, urlJoin, getSiteUrl, getAdminUrl, getSubdir, relativeToAbsolute, absoluteToRelative, createUrl, replacePermalink}  // redirect301/redirectToAdmin → replace with Redirect result values
urlService.getUrlForResource(resource, opts?): string   // sync
urlService.ownsResource(identifier, resource): boolean  // sync
api.postsPublic.{browse, read}; api.pagesPublic.read; api.tagsPublic.read; api.authorsPublic.read
  // options always carry {include:'authors,tags,tiers', context:{member, giftToken?}}
  // {{#get}} also wants tiersPublic, newslettersPublic; {{total_members}} → api.stats.memberCountHistory.query()
assetHash.getHashForFile(path): string|null; assetHash.clearCache(): void
cardAssets.hasFile('js'|'css'): boolean
blogIcon.getIconUrl(opts?): string; blogIcon.getIconType(url): string
cachedImageSizeFromUrl(url): Promise<{width,height}>; isInternalImage(url): boolean
getFrontendKey(): Promise<string|null>
getMarkdownUrl(canonicalUrl): string; isPurchasableEntry(post): boolean; isMachinePaymentsEnabled(deps): boolean
applyLimitCap(options)  // helpers/get
themeI18n.t / themeI18next.t; logging.{warn,error}; sentry.captureException
activeTheme port: {name, path, partialsPath, hasTemplate(name), config(key), updateTemplateOptions(opts)}
```

**Request/response ports (replace Express):** inbound `{path, originalUrl, query, params, member}`; outbound result union `{render:{template,data,contentType?,headers}} | {redirect:{status,url}} | {next} | {error}`. The five Express-welded spots: `renderer.js:35-59` (res.render/send/Cache-Control), `entry.ts:43,97` (redirects), `entry/markdown.ts:12,18` (`req.app.get`), `gift-links.ts:43,53-55` (res.redirect/set/locals).

## (c) Contradictions with the stale Aug-2026 coupling map

1. `UrlServiceFacade` is gone (125050e0bd, #29792) — `proxy.urlService` is a bare `LazyUrlService`.
2. `getUrlByResourceId` no longer exists — everything is `getUrlForResource(resource, options)` with explicit `type`.
3. The frontend never calls `resolveUrl` — inbound resolution is route match + entry-lookup + API read.
4. `meta/url.js` prefers serializer-attached `data.url`; the URL service is a warned fallback. The `{{url}}` helper's real dependency is the output serializer.
5. `collection.js:82` re-hydrates `type`/`status` before `ownsResource` (serializer strips them; lazy base filter would disown every post otherwise).
6. `fetch-data.js` no longer owns the resource map — `QUERY`/`TAXONOMIES` in `routing/config.ts`, resolution in `api-adapter.ts` (#29451). Four routers still put raw QUERY entries on `res.routerOptions.query` (flagged at `api-adapter.ts:113-114`).
7. `controllers/entry.js` → `entry.ts` + `entry/` (canonical-url, gift-links, markdown/llms negotiation — three behaviors that didn't exist a year ago).
8. `onCompile` dropping `filename` is a non-issue (express-hbs attaches `__filename` after the hook).
9. `proxy.js` grew (getFrontendKey, settingsHelpers, lazy members, serverEvents, prepareContextResource with sanitize-html — deliberately not DOMPurify, ~116MB RSS saving).
10. Route settings are a typed domain model (`RouteSettings`) with `{slug}`-notation permalinks, adapter-backed store.
11. `urlService` is injected into `RouterManager`, not required by it — `router-manager.js` has zero requires outside frontend/.
12. `ghost_head` gained: markdown alternate + machine-payments gating, admin-toolbar script, `escapeJsonLd`, locale attrs on Portal/sodo-search, self-hosted ghost-stats tracker + `X-Ghost-Analytics` header contract. `ghost_foot` gained the gift toast.
