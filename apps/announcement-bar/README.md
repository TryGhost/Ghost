# Announcement Bar

Standalone announcement banner for sites that load the public app. Current Ghost themes receive
the announcement HTML and styles with the page through `{{ghost_head}}`. The public app continues
to serve Ghost versions that mount the banner in the browser.

Theme authors can place `<div id="announcement-bar-root"></div>` to choose where Ghost inserts the
bar. The default location is the start of the body. Ghost offsets overlapping fixed or absolute
site headers and exposes the measured height as `var(--gh-announcement-bar-height, 0px)`. A theme
with unconventional header markup can identify its masthead with `data-ghost-header`.

## Development

### Pre-requisites

- Run `pnpm bootstrap` in the Ghost monorepo root

### Running via Ghost from the monorepo root

Start Ghost with the public-app watchers enabled:

```bash
pnpm dev:public
```

This starts the standard development environment and the Announcement Bar
watcher. To work on this package by itself, run these commands from this
directory:

```bash
pnpm build    # one-off build
pnpm dev      # watch and rebuild the UMD bundle
pnpm test                  # type-check and run unit tests once
pnpm test:acceptance       # browser tests in Chromium
pnpm test:acceptance:full  # browser tests in Chromium and WebKit
pnpm lint                  # lint source and tests
```

## Release

Patch releases are automatic. When Announcement Bar changes on `main`, CI publishes the next patch version to npm and clears the jsDelivr cache. Sites using that major/minor line receive the patch without a Ghost release.

For an intentional minor or major release:

1. From a clean branch, run `pnpm ship` and select a minor or major version
2. Merge the release commit to `main`
3. Wait for a public Ghost release to ship the new default version line

`pnpm ship` updates both the package version and Ghost's default Announcement Bar version.

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
