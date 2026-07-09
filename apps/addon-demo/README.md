# @tryghost/addon-demo

A demo third-party add-on ("SEO Assistant") for the remote add-on spike — a dashboard card with a paired should-render module, and a full-page view with host-owned sub-routing. Written exactly as an external provider would write it: Preact against `@tryghost/addon-kit/addon`, built to per-target IIFE bundles, served with CORS from its own origin.

## Run it

```bash
# 1. Build bundles + manifest (integrity hashes are computed at build time)
pnpm --filter @tryghost/addon-demo build

# 2. Serve the provider origin (manifest, bundles, and a demo backend echo endpoint)
pnpm --filter @tryghost/addon-demo serve       # http://localhost:4650

# 3. In Ghost Admin (pnpm dev), enable labs → developer experiments → "Add-ons",
#    then install the dev manifest from the browser console:
localStorage.setItem('ghost-addons-dev', JSON.stringify(['http://localhost:4650/manifest.json']))

# 4. Reload → Analytics Overview shows the "SEO Assistant (demo)" card;
#    the sidebar gains an "SEO Assistant" entry routing to #/apps/seo-assistant-demo/
```

**Crawling is real:** a crawl reads the site's posts through the Admin API passthrough (`/ghost/api/admin/posts/`), derives findings from them (posts missing excerpts or feature images, overlong titles/slugs — the issues list shows your actual post titles), and stores the report on the add-on backend, which owns the score history and crawl log. The report persists across reloads (in-memory on the provider server), and **Clear report** genuinely clears it. The backend's `/api/*` routes require the `x-ghost-dev-identity` header the host attaches to `ghost.fetch` — curl without it gets a 401, so the endpoints are only reachable through the bridge. Setting the analytics range to "Today" (range = 1 day) hides the card via the should-render pair.

## Files

- `src/dashboard-card.tsx` — `admin.dashboard.card.render`
- `src/dashboard-card-visibility.ts` — `admin.dashboard.card.should-render`
- `src/report-page.tsx` — `admin.page.render` (sub-routing via `ghost.navigate` + `ghost.data.context.path`)
- `src/lib/seo-client.ts` — crawl logic: Admin API read → findings → backend report
- `build.mjs` — builds each entry as an IIFE assigning `__ghostAddonModule`, then writes `manifest.json` with sha256 integrity per bundle
- `server.mjs` — static provider origin with `Access-Control-Allow-Origin: *` (required: the opaque-origin sandbox fetches bundles with `Origin: null`) plus the in-memory report backend (`/api/report`, `/api/crawl`, `/api/clear`)
