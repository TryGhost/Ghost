# Testing development URLs and devices

Ghost supports configurations that differ from the normal
`http://localhost:2368` setup. Test the configuration that matters to your
change rather than rebuilding the whole development environment for every URL
edge case.

## Test on another device

Use an HTTPS tunnel when you need to open the site or Admin on a phone, tablet,
or another computer. This avoids maintaining local DNS, assigning a static IP,
and installing a local certificate authority on every test device.

With `pnpm dev` running, install and authenticate the
[ngrok agent](https://ngrok.com/docs/getting-started/), then tunnel the
checkout's development port: `2368` in the main checkout, or `GHOST_DEV_PORT`
from `.ghost-dev.env` in a worktree:

```bash
ngrok http 2368
```

Open the HTTPS forwarding URL on the other device.

That port belongs to Admin's Vite development server, which serves Admin and
proxies every other request to Ghost. It accepts any hostname and keeps the
tunnel's `Host` and `X-Forwarded-Proto` headers, so Ghost sees an HTTPS request
for the forwarding domain. Tunnel this port rather than Ghost's own port or a
public-app development server, so requests use the normal development routing.
The tunnel agent must send `X-Forwarded-Proto`, as ngrok does.

Ghost's configured URL is still `http://localhost:2368`, so the site renders
but generated links point at `localhost`, and Admin rejects sign-in from the
forwarding domain. To use Admin, or when the behaviour under test depends on
absolute URLs, restart `pnpm dev` with the forwarding URL:

```bash
url=https://your-forwarding-domain.example/ pnpm dev
```

`pnpm dev` sets `url` itself, so a `url` in `ghost/config.local.json` has no
effect. Open the site and Admin through the forwarding URL while the override is
set, and restart without it when the test is finished.

Treat a public tunnel URL as temporary public access to the local site. Do not
use production data or credentials, and stop the tunnel after testing.

## Test HTTPS, subdirectories, and a separate Admin URL

Use the manual environment below when you need to inspect all three behaviours
in a browser. It runs a local TLS proxy in front of Ghost Core and uses
`.localhost` hostnames, which resolve to the loopback address without editing
`/etc/hosts` or running a DNS server.

Install [Caddy](https://caddyserver.com/docs/install) if it is not already
available. Create `ghost/config.local.json`:

```json
{
    "url": "https://site.localhost:8443/blog/",
    "admin": {
        "url": "https://admin.localhost:8443/blog/"
    }
}
```

The site URL supplies the `/blog/` subdirectory. The separate Admin URL uses
the same subdirectory because Ghost's Admin and API routes remain underneath
the configured site path.

Start the Docker services with the URL-testing Compose override:

```bash
DEV_COMPOSE_FILES="-f docker/dev-url-testing/compose.yaml" \
    pnpm nx run ghost-monorepo:docker:up
```

The override exposes Ghost Core directly on port `2369`. This is intentional:
the extra Caddy process must connect directly to Ghost so Express can trust its
forwarded HTTPS header.

In another terminal, start the local TLS proxy:

```bash
caddy run --adapter caddyfile \
    --config docker/dev-url-testing/Caddyfile
```

Caddy may ask for the system password the first time so it can install its
local certificate authority. Open:

- Site: `https://site.localhost:8443/blog/`
- Admin: `https://admin.localhost:8443/blog/ghost/`

Check the behaviour affected by the change, including redirects, generated
links, API requests, cookies, and assets. A request to the site hostname's
`/blog/ghost/` path should redirect to the Admin hostname.

This configuration serves the Admin assets available from Ghost Core. It does
not use the normal Admin Vite/HMR route because that development server's
startup probe assumes the default root URL. Use the automated tests below for
focused development, then use this manual environment for final browser
verification.

Press `Ctrl+C` to stop Caddy. Stop the Docker services with the same override:

```bash
DEV_COMPOSE_FILES="-f docker/dev-url-testing/compose.yaml" pnpm docker:down
```

Delete `ghost/config.local.json` before returning to `pnpm dev`; otherwise
Ghost will continue using the alternate URLs. The file is ignored by Git.

## Add automated URL-configuration coverage

Ghost Core keeps its advanced URL configuration coverage in
`ghost/test/e2e-frontend/advanced-url-config.test.js`. It currently covers
subdirectory routing and redirects to a separate Admin origin, and is the
default place to add HTTP-level coverage for behaviour that depends on:

- an HTTPS site URL;
- a site installed in a subdirectory; or
- Admin and the site using different origins.

Run the file from `ghost`:

```bash
pnpm test:single test/e2e-frontend/advanced-url-config.test.js
```

Add a focused case there when the behaviour can be verified through Ghost's
HTTP responses, redirects, generated URLs, or routing. Tests elsewhere in
`ghost/test/` also set `url` and `admin:url` through the shared test config
helpers when a lower-level test is sufficient.
