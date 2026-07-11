# Admin Toolbar

Frontend staff toolbar for Ghost sites. Uses Preact (~3KB) instead of React
(~40KB) since this is a lightweight public-facing widget that only needs basic
rendering and hooks — the same rationale applies to any future small public
scripts where bundle size matters more than ecosystem compatibility.

## Development

```bash
pnpm build    # one-off build
pnpm dev      # build + preview with watch (started automatically by pnpm dev from root)
pnpm test     # build + run tests against UMD bundle
```

## How it's served

In production, the script is loaded from jsDelivr via the `adminToolbar` config
in `defaults.json`, following the same CDN pattern as portal, comments-ui, and
the other public apps. In development, the Docker Dockerfile overrides the URL
to proxy through Caddy to the local vite preview server on port 4176.

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
