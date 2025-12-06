# Architecture

## Admin Apps Integration (Micro-Frontend)

**Build Process:**
1. Admin-x React apps build to `apps/*/dist` using Vite
2. `ghost/admin/lib/asset-delivery` copies them to `ghost/core/core/built/admin/assets/*`
3. Ghost admin serves from `/ghost/assets/{app-name}/{app-name}.js`

**Runtime Loading:**
- Ember admin uses `AdminXComponent` to dynamically import React apps
- React components wrapped in Suspense with error boundaries
- Apps receive config via `additionalProps()` method

## Public Apps Integration

- Built as UMD bundles to `apps/*/umd/*.min.js`
- Loaded via `<script>` tags in theme templates (injected by `{{ghost_head}}`)
- Configuration passed via data attributes

## i18n Architecture

**Centralized Translations:**
- Single source: `ghost/i18n/locales/{locale}/{namespace}.json`
- Namespaces: `ghost`, `portal`, `signup-form`, `comments`, `search`
- 60+ supported locales

## Build Dependencies (Nx)

Critical build order (Nx handles automatically):
1. `shade` + `admin-x-design-system` build
2. `admin-x-framework` builds (depends on #1)
3. Admin apps build (depend on #2)
4. `ghost/admin` builds (depends on #3, copies via asset-delivery)
5. `ghost/core` serves admin build
