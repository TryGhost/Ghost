# Ghost Admin (React)

New React-based Ghost admin interface, gradually replacing the existing Ember admin.

## Architecture

Uses an **Ember Bridge** system for smooth migration:
- Routes ported to React render React components
- Unported routes fall back to the existing Ember admin
- Both share the same UI space seamlessly

The React application uses `admin-x-framework` for API hooks, routing, and the
bridge to Ember. Shade provides its application wrapper and design system.
Embedded React applications are built before Ember Admin; Ember's asset-delivery
addon copies their production output and the Admin assets into
`ghost/core/core/built/admin/` for Ghost Core to serve.

### CSS

`src/index.css` is the single Tailwind CSS entry point for Admin. It imports
Shade's styles and uses `@source` directives to scan Admin, Shade, ActivityPub,
Admin Framework, and the embedded Koenig selector. Only this app loads the
`@tailwindcss/vite` plugin for the embedded Admin CSS lane.

Embedded Admin apps must not import `@tryghost/shade/styles.css` themselves.
Doing so generates duplicate utilities and creates cascade conflicts with
Ember's legacy CSS.

Shade's Tailwind imports are unlayered because Ember's legacy CSS is also
unlayered. This lets source order resolve overlapping utilities. Do not move
Shade's imports into a CSS layer without accounting for the legacy cascade.

### Deploy compatibility

Ghost Admin and Ghost Core can deploy at different times. New Admin UI that
depends on a new setting, endpoint, or configuration value must detect backend
support and hide or safely disable the feature when it is absent. A Labs flag
alone is not a compatibility check because the flag may exist before the
supporting backend version is live.

Add an acceptance test for the older-backend case. The social accounts settings
and membership tiers tests contain current examples of hiding controls until
their supporting settings are present.

## Development

```bash
# Start development server (from monorepo root)
pnpm dev
```

Build new Admin features in this React app. Use `admin-x-framework` for API
access and Shade for UI rather than adding new `admin-x-design-system`
components. Product copy belongs in the `ghost` namespace; follow the
[internationalization guide](../../docs/practices/internationalization.md).

## Testing

- **Unit tests** (`pnpm test:unit`): Vitest + jsdom, colocated `*.test.ts(x)` files.
- **Acceptance tests** (`pnpm test:acceptance`): the real app in real Chromium against a fake admin API served through MSW — see [test-utils/acceptance/README.md](test-utils/acceptance/README.md).
- **Browser e2e** against a real Ghost instance lives in the top-level [`e2e/`](../../e2e) workspace.

## Building for Production

```bash
# Build production bundle
pnpm nx run @tryghost/admin:build
```

This outputs to `apps/admin/dist/` and updates the assets in `ghost/core/core/built/admin/`.
