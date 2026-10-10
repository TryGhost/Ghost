# Embed renderer hosting

The editor previews embed card html in
[`koenig/koenig-lexical/public/embed-renderer/`](../../koenig/koenig-lexical/public/embed-renderer/),
loaded from a domain that serves nothing else. Embed scripts run with that
domain's origin, so it must never share one with Ghost Admin, a Ghost site, or
anything holding cookies. Sites point at it with `security.embedPreviewUrl`.

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

## Rules for this domain

- serve nothing but the renderer files; every other path 404s
- never set cookies, serve Ghost content, or add branding
- never list it in `security.txt`, OAuth redirects, CORS allowlists or a CSP
  `script-src`: it runs arbitrary third-party code by design
