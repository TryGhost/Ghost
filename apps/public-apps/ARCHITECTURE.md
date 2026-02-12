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

### Previous (4 separate apps, each with React)
| Feature | Gzipped |
|---------|---------|
| Portal | 440KB |
| Comments | 261KB |
| Search | ~25KB |
| Announcement | ~5KB |
| **Total (all 4)** | **~731KB** |

### New (consolidated with shared React)
| Chunk | Gzipped |
|-------|---------|
| loader.js | 1.3KB |
| react-vendor (shared) | 44KB |
| announcement | 1.7KB |
| search | 25KB |
| comments | 125KB |
| portal | 112KB |
| **Total (all 4)** | **~307KB** |

**Savings: 58% smaller when all apps loaded**

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
| Search (sodo-search) | ✅ Done | Inline i18n (English only) |
| Comments UI | ✅ Done | TipTap editor, inline i18n, placeholder system for post-specific data |
| Portal | ✅ Done | React 17→18 upgrade, .js→.jsx rename, inline i18n |

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

### Before Production

#### i18n Solution (Critical for CD)

The current inline translations approach breaks the i18n workflow:

**Current CD flow (broken)**:
1. Developer adds `t('New string')`
2. String must be manually added to inline translations in code
3. Non-English locales don't work at all
4. Every translation update requires a code release

**Why current UMD apps are so large**:
The existing Portal UMD (2.1MB/440KB gzipped) bundles ALL 62 locales via Vite's `dynamicRequireTargets`. This adds ~250KB gzipped of translations that most users never need.

**Recommended solution: Browser entry point + lazy loading**

This can be implemented on main BEFORE the public-apps migration:

1. **Add browser entry to `@tryghost/i18n`**:
```javascript
// ghost/i18n/browser.js (NEW)
import i18next from 'i18next';
import en from './locales/en/portal.json'; // Bundle English only

const cache = { en };

export async function createI18n(locale, namespace, fetchFn) {
    if (!cache[locale]) {
        cache[locale] = await fetchFn(locale, namespace); // Lazy load others
    }
    // ... init i18next
}
```

2. **Add exports to package.json**:
```json
{
  "exports": {
    ".": "./index.js",
    "./browser": "./browser.js"
  }
}
```

3. **Add i18n endpoint to Ghost core**:
```
GET /i18n/:locale/:namespace.json → serves ghost/i18n/locales/{locale}/{namespace}.json
```

4. **Use in public-apps**:
```javascript
import { createI18n } from '@tryghost/i18n/browser';
const i18n = await createI18n(locale, 'portal', (loc, ns) =>
    fetch(`${siteUrl}/i18n/${loc}/${ns}.json`).then(r => r.json())
);
```

**Size impact**:
| Scenario | Current UMD | New Lazy |
|----------|-------------|----------|
| English user | 440KB | 124KB (112KB + 12KB en) |
| German user | 440KB | 136KB (112KB + 24KB de) |
| Savings | - | ~300KB per user |

#### Other Production Requirements

- [ ] Comprehensive E2E test coverage for all 4 features
- [ ] Performance benchmarking vs CDN approach
- [ ] Bundle size optimization audit
- [ ] RTL language support testing
- [ ] Stripe integration testing for Portal

### CD Pipeline Changes

- [ ] Add `@tryghost/public-apps` to `CONFIG_KEYS` in `release-apps.js`
- [ ] Add `publicApps` section to `defaults.json` with CDN URL template
- [ ] Update `ghost_head.js` to read version from config
- [ ] Decide on versioning strategy (single semver recommended - chunk hashes handle cache invalidation)

### Cleanup (After Full Migration)

- [ ] Remove legacy CDN script loading from ghost_head.js
- [ ] Archive individual app packages (portal, comments-ui, sodo-search, announcement-bar)
- [ ] Update documentation
