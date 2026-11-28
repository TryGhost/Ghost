# Embed renderer hosting

The editor previews embed card html, and Ghost Admin previews whole site pages,
in [`koenig/koenig-lexical/public/embed-renderer/`](../../koenig/koenig-lexical/public/embed-renderer/),
loaded from a domain that serves nothing else. Embed and page scripts run with
that domain's origin, so it must never share one with Ghost Admin, a Ghost site,
or anything holding cookies. Sites point at it with `security.embedPreviewUrl`.
Version 1 renders embed cards; version 2 also renders whole pages.

Self-hosted Ghost previews embeds from `public.ghostembeds.com`, deployed from
this repository.

## Deploying

CI deploys on pushes to `main` that touch the renderer. By hand:

```bash
.github/embed-renderer/build.sh /tmp/embed-renderer
netlify deploy --prod --dir=/tmp/embed-renderer --no-build
```

The Netlify site has no linked repository and asset post-processing off, so the
renderer's inline script isn't rewritten. DNS: the host as a CNAME, an empty
apex, and no mail (no MX, SPF `-all`, DMARC `p=reject`).

## Adding a version

The renderer is versioned by its message protocol, not by Ghost release. Add
`v<N>.html` alongside the existing files and keep every older version: editors
request the version they were built against, so each deploy ships all of them.

`_headers` lets any https page frame the renderer, and http pages on
`localhost`, `*.localhost` and `127.0.0.1`, so Admin in local development can
use it too. A page that frames it gains nothing of Ghost's: the renderer holds
no data of its own and only shows html that its own ancestors send it. Version 2
only renders for a window that heard its ready message. Code on the renderer's
origin is never trusted, and renderer frames in one tab can reach each other, so
never render anything there that another renderer frame shouldn't see.

## Rules for this domain

- serve nothing but the renderer files; every other path 404s
- never set cookies, serve Ghost content of its own, or add branding: pages
  appear only as html that Ghost Admin sends a renderer to preview
- never list it in `security.txt`, OAuth redirects, CORS allowlists or a CSP
  `script-src`: it runs arbitrary third-party code by design
