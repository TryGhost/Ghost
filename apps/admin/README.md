# Ghost Admin (React)

New React-based Ghost admin interface, gradually replacing the existing Ember admin.

## Architecture

Uses an **Ember Bridge** system for smooth migration:
- Routes ported to React render React components
- Unported routes fall back to the existing Ember admin
- Both share the same UI space seamlessly

## Development

```bash
# Start development server
yarn dev
```

**Prerequisites:** Ghost and the existing Ember admin must be running on `localhost:2368` for API proxying.

## Building for Production

```bash
# Build production bundle
yarn nx run admin:build
```

This outputs to `apps/admin/dist/`.

## Serving the React Admin

To serve the built React admin instead of the Ember admin, set the `USE_REACT_SHELL` environment variable when starting Ghost from the **monorepo root**:

```bash
# From the monorepo root
USE_REACT_SHELL=true yarn dev
```

This configures the Ghost backend to serve `apps/admin/dist/index.html` at `/ghost/` instead of the Ember admin. The environment variable affects `ghost/core`, not `apps/admin` directly.
