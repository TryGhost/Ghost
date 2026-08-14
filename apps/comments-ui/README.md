# Comments UI

Comments widget that is embedded at the bottom of posts in Ghost.

## Development

### Pre-requisites

- Run `pnpm setup` in the Ghost monorepo root

### Running via Ghost from the monorepo root

Start Ghost with the public-app watchers enabled:

```bash
pnpm dev:public
```

This starts the standard development environment and the Comments UI watcher.
To work on this package by itself, run these commands from this directory:

```bash
pnpm build              # one-off build
pnpm dev                # watch and rebuild the UMD bundle
pnpm test               # run type checks and unit tests
pnpm test:acceptance    # run browser acceptance tests
pnpm lint               # lint code and check types
```

## Release

Patch releases are automatic. When Comments changes on `main`, CI publishes the next patch version to npm and clears the jsDelivr cache. Sites using that major/minor line receive the patch without a Ghost release.

For an intentional minor or major release:

1. From a clean branch, run `pnpm ship` and select a minor or major version
2. Merge the release commit to `main`
3. Wait for a public Ghost release to ship the new default version line

`pnpm ship` updates both the package version and Ghost's default Comments version.

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
