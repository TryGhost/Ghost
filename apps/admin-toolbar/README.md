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
pnpm dev      # watch the UMD build
pnpm test     # build + run tests against UMD bundle
```

## How it's served

In production, the script is loaded from jsDelivr via the `adminToolbar` config
in `defaults.json`, following the same CDN pattern as portal, comments-ui, and
the other public apps. In development, the Docker Dockerfile overrides the URL
to proxy through Caddy to the local vite preview server on port 4176.

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
