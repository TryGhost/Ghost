# Admin Toolbar

Frontend staff toolbar for Ghost sites. Uses Preact (~3KB) instead of React
(~40KB) since this is a lightweight public-facing widget that only needs basic
rendering and hooks — the same rationale applies to any future small public
scripts where bundle size matters more than ecosystem compatibility.

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

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
