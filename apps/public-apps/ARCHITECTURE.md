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

## Migration Status

| App | Status | Notes |
|-----|--------|-------|
| Announcement Bar | ✅ Done | Fully ported |
| Search (sodo-search) | ✅ Done | Simplified i18n (English only) |
| Comments UI | 🔲 Next | ~49 files, TipTap editor |
| Portal | 🔲 Planned | ~78 files, Stripe integration |

## Known Issues

### i18n CommonJS Incompatibility

**Problem**: The `@tryghost/i18n` package is CommonJS and uses dynamic `require()` calls to load locale JSON files at runtime. This doesn't work in browser ES modules.

**Error seen**:
```
ReferenceError: Can't find variable: require
ReferenceError: Cannot access 'default' before initialization
```

**Root cause**: `ghost/i18n/lib/i18n.js` does:
```javascript
const resources = require(`../locales/${locale}/${namespace}.json`);
```

This dynamic require pattern can't be statically analyzed by bundlers for ES module output.

**Workarounds tried**:
1. ❌ `commonjsOptions.dynamicRequireTargets` - Vite 6 requires glob function, complex setup
2. ✅ Inline translations - Works but doesn't scale, no locale support

**Potential solutions**:
1. **Bundle translations at build time** - Generate a JS module that exports all locale data
2. **Create browser-compatible i18n wrapper** - New entry point that doesn't use dynamic require
3. **Fetch translations at runtime** - Load JSON via fetch() instead of require()
4. **Pre-bundle with Vite optimizeDeps** - Force Vite to pre-process the package

**Recommended approach**: Create a new entry point in `@tryghost/i18n` specifically for browser bundles that imports translations statically or fetches them.

## TODOs

### Immediate (Comments UI Migration)

- [ ] Port Comments UI components (~49 files)
- [ ] Bundle TipTap editor dependencies (~9 packages, ~100KB)
- [ ] Handle @headlessui/react integration
- [ ] Test comment posting, editing, replies, likes, reporting
- [ ] Verify iframe isolation works for comment styling

### Before Production

- [ ] **Solve i18n properly** - See issue above
- [ ] Add RTL language support
- [ ] Port Portal (~78 files, ~15,700 lines)
- [ ] Comprehensive E2E test coverage
- [ ] Performance benchmarking vs CDN approach
- [ ] Bundle size optimization audit

### Cleanup (After Full Migration)

- [ ] Remove legacy CDN script loading from ghost_head.js
- [ ] Archive individual app packages (portal, comments-ui, sodo-search, announcement-bar)
- [ ] Update documentation
