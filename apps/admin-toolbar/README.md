# Admin Toolbar

Frontend staff toolbar for Ghost sites. It uses Preact to keep the public-facing
bundle small while providing the rendering and hooks the toolbar needs.

## Development

Run `pnpm dev:public` from the monorepo root to start the standard development
environment and the Admin Toolbar watcher. To work on this package by itself,
run these commands from this directory:

```bash
pnpm build    # one-off build
pnpm dev      # watch and rebuild umd/admin-toolbar.min.js
pnpm test     # build + run tests against the built bundle
```

## How it's served

In production, the script is loaded from jsDelivr via the `adminToolbar` config
in `defaults.json`, following the same CDN pattern as portal, comments-ui, and
the other public apps. In development, `docker/ghost-dev/Dockerfile` overrides
that URL to `/ghost/assets/admin-toolbar/admin-toolbar.min.js`, which the dev
gateway serves straight off disk from this package's `umd/` directory — so the
watcher's output is picked up on the next request.

## Release

Patch releases are automatic. When Admin Toolbar changes on `main`, CI publishes
the next patch version to npm and clears the jsDelivr cache. Sites using that
major/minor line receive the patch without a Ghost release.

For an intentional minor or major release:

1. From a clean branch, run `pnpm ship` and select a minor or major version
2. Merge the release commit to `main`
3. Wait for a public Ghost release to ship the new default version line

`pnpm ship` updates both the package version and Ghost's default Admin Toolbar
version.

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
