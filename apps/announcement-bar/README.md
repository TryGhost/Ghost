# Announcement Bar

## Development

### Pre-requisites

- Run `pnpm` in Ghost monorepo root
- Run `pnpm` in this directory

### Running from the monorepo root

Run Ghost with the public app dev servers from the monorepo root when working on Announcement Bar:
```bash
pnpm dev:apps
```

## Release

A patch release can be rolled out instantly in production, whereas a minor/major release requires the Ghost monorepo to be updated and released.
In either case, you need sufficient permissions to release `@tryghost` packages on NPM.

### Patch release

1. Run `pnpm ship` and select a patch version when prompted
2. Merge the release commit to `main`

### Minor / major release

1. Run `pnpm ship` and select a minor or major version when prompted
2. Merge the release commit to `main`
3. Wait until a new version of Ghost is released

To use the new version of signup form in Ghost, update the version in Ghost core's default configuration (currently at `core/shared/config/default.json`)

# Copyright & License 

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
