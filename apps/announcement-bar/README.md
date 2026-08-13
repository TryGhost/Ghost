# Announcement Bar

## Development

### Pre-requisites

- Run `pnpm setup` in the Ghost monorepo root

### Running via Ghost from the monorepo root

Start Ghost with the public-app watchers enabled:

```bash
pnpm dev:public
```

This starts the standard development environment and the Announcement Bar watcher. To run only the package's build watcher, use `pnpm dev` from this directory.

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

To use the new version of Announcement Bar in Ghost, update the version in Ghost core's default configuration (currently at `core/shared/config/default.json`)

# Copyright & License 

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
