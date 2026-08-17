# Ghost Admin (React)

New React-based Ghost admin interface, gradually replacing the existing Ember admin.

## Architecture

Uses an **Ember Bridge** system for smooth migration:
- Routes ported to React render React components
- Unported routes fall back to the existing Ember admin
- Both share the same UI space seamlessly

## Development

```bash
# Start development server (from monorepo root)
pnpm dev
```

### Labs flag switcher

Toggle Labs feature flags without leaving the screen you're on. Off by default.
To enable it, add this to your `ghost/core/config.local.json` (gitignored) —
nodemon picks the change up, so you only need to reload the admin:

```json
{ "labs": { "devLabsPanel": true } }
```

A pill appears bottom-right on every admin screen. `Ctrl+Shift+L` opens it,
`Esc` closes it. Changes apply without a reload and stay in sync with
Settings → Labs. The flag list comes from `ghost/core/core/shared/labs.js`, so
new flags appear automatically.

Development only — the code is not included in production builds.

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

