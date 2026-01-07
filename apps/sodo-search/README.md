# Sodo Search

## Development

### Pre-requisites

- Run `yarn` in Ghost monorepo root
- Run `yarn` in this directory

### Running via Ghost `yarn dev` in root folder

You can automatically start the Sodo-Search dev server when developing Ghost by running Ghost (in root folder) via `yarn dev --all` or `yarn dev --search`.

## Release

A patch release can be rolled out instantly in production, whereas a minor/major release requires the Ghost monorepo to be updated and released. 
In either case, you need sufficient permissions to release `@tryghost` packages on NPM.

### Patch release

1. Run `yarn ship` and select a patch version when prompted
2. Merge the release commit to `main`

### Minor / major release

1. Run `yarn ship` and select a minor or major version when prompted
2. Merge the release commit to `main`
3. Wait until a new version of Ghost is released

To use the new version of Sodo-Search in Ghost, update the version in Ghost core's default configuration (currently at `core/shared/config/default.json`)

# Copyright & License 

Copyright (c) 2013-2025 Ghost Foundation - Released under the [MIT license](LICENSE).
