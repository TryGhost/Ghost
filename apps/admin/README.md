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
yarn dev
```

## Building for Production

```bash
# Build production bundle
yarn nx run @tryghost/admin:build
```

This outputs to `apps/admin/dist/` and updates the assets in `ghost/core/core/built/admin/`.

