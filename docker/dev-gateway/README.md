# Dev Gateway (Caddy)

This directory contains the Caddy reverse proxy configuration for the Ghost development environment.

## Purpose

The Caddy reverse proxy container:

1. **Routes Ghost requests** to the Ghost container backend
2. **Proxies asset requests** to the Admin dev server running on the host
3. **Serves public app assets** (Portal, Comments UI, Signup Form, Sodo Search, Announcement Bar, Admin Toolbar) directly from their `umd/` build output via `file_server` — no dev server involved
4. **Enables hot-reload** for frontend development without rebuilding Ghost

## Configuration

### Environment Variables

Caddy uses environment variables (set in `compose.dev.yaml`) to configure proxy targets:

- `GHOST_BACKEND` - Ghost container hostname (e.g., `ghost-dev:2368`)
- `ADMIN_DEV_SERVER` - React admin dev server (e.g., `host.docker.internal:5174`)
- `ACTIVITYPUB_PROXY_TARGET` - _Optional:_ ActivityPub service (e.g., `host.docker.internal:8080`)
  - For developing with the [ActivityPub project](https://github.com/TryGhost/ActivityPub) running locally
  - Requires the ActivityPub docker-compose services to be running

**Note:** Embedded React apps (activitypub) are served through the admin dev server so they don't need separate proxy entries.

### Ghost Configuration

Ghost is configured via environment variables in `compose.dev.yaml` to load public app assets from `/ghost/assets/*` (e.g., `portal__url: /ghost/assets/portal/portal.min.js`). This uses the same path structure as built admin assets.

### Routing Rules

The Caddyfile defines these routing rules:

| Path Pattern                                                                                  | Target                          | Purpose                                                                                     |
| --------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| `/ghost/api/*`                                                                                | Ghost backend                   | Ghost API (bypasses admin dev server)                                                       |
| `/.ghost/activitypub/*`                                                                       | ActivityPub server (port 8080)  | _Optional:_ ActivityPub API (requires AP project running)                                   |
| `/.well-known/webfinger`                                                                      | ActivityPub server (port 8080)  | _Optional:_ WebFinger for federation                                                        |
| `/.well-known/nodeinfo`                                                                       | ActivityPub server (port 8080)  | _Optional:_ NodeInfo for federation                                                         |
| `/ghost/assets/{portal,comments-ui,signup-form,sodo-search,announcement-bar,admin-toolbar}/*` | `apps/<name>/umd` (file_server) | Public app widgets — served from disk, rebuilt on change by each app's `vite build --watch` |
| `/ghost/assets/*`                                                                             | Admin dev server (port 5174)    | Other admin assets — rewritten to `/__admin-dev__/assets/*`                                 |
| `/__admin-dev__/*`                                                                            | Admin dev server (port 5174)    | Vite internals (HMR, modules, refresh runtime, dev-only assets)                             |
| `/ghost`, `/ghost/`                                                                           | Admin dev server (port 5174)    | Admin HTML entry — rewritten to `/__admin-dev__/`                                           |
| `/ghost/*` (deep links)                                                                       | Ghost backend                   | Express middleware redirects deep links to `/ghost/#/<path>`                                |
| Everything else                                                                               | Ghost backend                   | Main Ghost application                                                                      |

**Note:** The Admin port listed is the host port its dev server runs on by default. Public apps have no dev-server port — Caddy reads their build output straight off disk.
