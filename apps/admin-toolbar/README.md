# Admin Toolbar

Frontend staff toolbar for Ghost sites.

## Development

### Pre-requisites

- Run `pnpm` in the Ghost monorepo root.
- Build the package with `pnpm build` from this directory.

## Build

```bash
pnpm build
```

The package builds `umd/admin-toolbar.min.js`. Ghost core copies that artifact into `core/frontend/public/admin-toolbar.min.js` during `ghost/core`'s `pnpm build:assets:js`.

## Test

```bash
pnpm test
```

Tests run against the built UMD bundle so package behavior is verified through the same public artifact consumed by Ghost core.

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
