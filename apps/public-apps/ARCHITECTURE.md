# Public Apps Consolidation - Architecture Summary

This document summarizes the key decisions, benefits, and trade-offs of the consolidated public-apps approach compared to the previous architecture.

## Previous Architecture

Ghost's public-facing features (Portal, Comments, Search, Announcement Bar) were built and deployed as **separate npm packages**, each:

- Built independently with their own bundler configs
- Published to npm and served via CDN (unpkg/jsdelivr)
- Loaded via separate `<script>` tags in `{{ghost_head}}`
- Each bundled their own copy of React (~140KB each)

### Previous Script Loading
```html
<script src="https://cdn.jsdelivr.net/npm/@tryghost/sodo-search@x.x.x/umd/sodo-search.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@tryghost/announcement-bar@x.x.x/umd/announcement-bar.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@tryghost/portal@x.x.x/umd/portal.min.js"></script>
<!-- etc. -->
```

## New Architecture

A single `public-apps` package that:

- Contains all public-facing features as code-split chunks
- Shares React across all features (single 141KB vendor chunk)
- Served locally from Ghost (like admin apps)
- Single loader entry point with dynamic imports

### New Script Loading
```html
<script type="module" src="/public-apps/loader.js?v={hash}"
        data-ghost="https://site.com"
        data-features="announcement,search"
        data-key="{API_KEY}"
        data-locale="en">
</script>
```

## Key Technical Decisions

### 1. ES Modules with Dynamic Imports
- Loader is an ES module (`type="module"`)
- Features loaded via `import()` for code splitting
- Required using `import.meta.url` instead of `document.currentScript` to find script tag

### 2. CSS Inlining
- All CSS is bundled directly into JavaScript using Vite's `?inline` suffix
- Search styles injected into iframe's `<style>` tag (for isolation)
- Announcement styles injected into document head on module load
- **Benefit**: No separate CSS files to manage, cache, or version
- **Trade-off**: Slightly larger JS bundles

### 3. Shared React Vendor Chunk
- React + ReactDOM extracted to `react-vendor.[hash].js`
- Shared by all features that use React
- **Benefit**: ~140KB savings per additional React feature

### 4. Feature Flag Toggle
- `publicApps.enabled` config controls which system is used
- Allows gradual rollout and easy rollback
- Legacy CDN scripts still available when disabled

### 5. Simplified i18n (Spike Only)
- Removed `@tryghost/i18n` dependency for this spike
- Used inline translations object
- **TODO**: Proper i18n integration needed for production

## Bundle Size Comparison

### Previous (per feature)
| Feature | Size |
|---------|------|
| sodo-search | ~200KB (includes React) |
| announcement-bar | ~150KB (includes React) |
| portal | ~250KB (includes React) |
| **Total (3 features)** | **~600KB** |

### New (consolidated)
| Chunk | Size |
|-------|------|
| loader.js | 2.4KB |
| react-vendor.[hash].js | 141KB |
| announcement.[hash].js | 3.9KB |
| search.[hash].js | 12KB + 65KB |
| **Total (same 2 features)** | **~224KB** |

## Benefits

1. **Smaller Total Bundle Size**: Shared React saves ~140KB per feature
2. **Local Serving**: No CDN dependency, works offline, faster TTFB
3. **Unified Versioning**: All features versioned together with Ghost
4. **Simpler Deployment**: No npm publishing or CDN cache invalidation
5. **Better Caching**: Content-hashed filenames for optimal caching
6. **Single Entry Point**: One script tag instead of many
7. **Feature Flags**: Easy to enable/disable features per-site

## Trade-offs & Costs

1. **Migration Effort**: Need to port all 4 apps (Portal, Comments, Search, Announcement)
2. **i18n Complexity**: Need to solve CommonJS compatibility or bundle translations
3. **Code Duplication**: Some code duplicated from original apps during migration
4. **Testing**: Need comprehensive tests to ensure feature parity
5. **ES Module Requirement**: Requires `type="module"` which has minor browser support implications (though negligible in 2024+)

## Files Changed in Ghost Core

- `ghost/core/core/frontend/helpers/ghost_head.js` - Added `getPublicAppsHelper()` function
- `ghost/core/core/frontend/web/routers/serve-public-file.js` - Added `/public-apps/*` static serving
- `ghost/core/core/shared/config/defaults.json` - Added `publicApps` config section
- `ghost/admin/lib/asset-delivery/index.js` - Added public-apps hash generation and copying

## Future Work

1. Port Portal and Comments UI
2. Proper i18n integration (bundle locale data or solve CommonJS issue)
3. RTL language support
4. Comprehensive test coverage
5. Performance benchmarking
6. Remove legacy CDN scripts once migration complete
