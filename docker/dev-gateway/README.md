# Dev Gateway (Caddy)
This directory contains the Caddy reverse proxy configuration for the Ghost development environment.

## Purpose
The Caddy reverse proxy container:
1. **Routes Ghost requests** to the Ghost container backend
2. **Proxies asset requests** to local dev servers running on the host (Admin, Lexical)
3. **Serves public app assets** (Portal, Comments UI, Signup Form, Sodo Search, Announcement Bar, Admin Toolbar) directly from their `umd/` build output via `file_server` — no dev server involved
4. **Enables hot-reload** for frontend development without rebuilding Ghost

## Configuration
### Environment Variables
Caddy uses environment variables (set in `compose.dev.yaml`) to configure proxy targets:

- `GHOST_BACKEND` - Ghost container hostname (e.g., `ghost-dev:2368`)
- `ADMIN_DEV_SERVER` - React admin dev server (e.g., `host.docker.internal:5174`)
- `ADMIN_LIVE_RELOAD_SERVER` - Ember live reload WebSocket (e.g., `host.docker.internal:4200`)
- `LEXICAL_DEV_SERVER` - *Optional:* Local Koenig Lexical editor dev server (e.g., `host.docker.internal:4173`)
  - For developing Lexical in the separate [Koenig repository](https://github.com/TryGhost/Koenig)
  - Requires `EDITOR_URL=/ghost/assets/koenig-lexical/` when starting admin dev server
  - Automatically falls back to Ghost backend (built package) if dev server is not running
- `ACTIVITYPUB_PROXY_TARGET` - *Optional:* ActivityPub service (e.g., `host.docker.internal:8080`)
  - For developing with the [ActivityPub project](https://github.com/TryGhost/ActivityPub) running locally
  - Requires the ActivityPub docker-compose services to be running

**Note:** AdminX React apps (admin-x-settings, activitypub, posts, stats) are served through the admin dev server so they don't need separate proxy entries.

### Ghost Configuration
Ghost is configured via environment variables in `compose.dev.yaml` to load public app assets from `/ghost/assets/*` (e.g., `portal__url: /ghost/assets/portal/portal.min.js`). This uses the same path structure as built admin assets.

### Routing Rules
The Caddyfile defines these routing rules:

| Path Pattern                         | Target                              | Purpose                                                                |
|--------------------------------------|-------------------------------------|------------------------------------------------------------------------|
| `/ember-cli-live-reload.js`          | Admin live reload (port 4200)       | Ember hot-reload script and WebSocket                                  |
| `/ghost/api/*`                       | Ghost backend                       | Ghost API (bypasses admin dev server)                                  |
| `/.ghost/activitypub/*`              | ActivityPub server (port 8080)      | *Optional:* ActivityPub API (requires AP project running)              |
| `/.well-known/webfinger`             | ActivityPub server (port 8080)      | *Optional:* WebFinger for federation                                   |
| `/.well-known/nodeinfo`              | ActivityPub server (port 8080)      | *Optional:* NodeInfo for federation                                    |
| `/ghost/assets/koenig-lexical/*`     | Lexical dev server (port 4173)      | *Optional:* Koenig Lexical editor (falls back to Ghost if not running) |
| `/ghost/assets/{portal,comments-ui,signup-form,sodo-search,announcement-bar,admin-toolbar}/*` | `apps/<name>/umd` (file_server) | Public app widgets — served from disk, rebuilt on change by each app's `vite build --watch` |
| `/ghost/assets/*`                    | Admin dev server (port 5174)        | Other admin assets — rewritten to `/__admin-dev__/assets/*`            |
| `/__admin-dev__/*`                   | Admin dev server (port 5174)        | Vite internals (HMR, modules, refresh runtime, dev-only assets)        |
| `/ghost`, `/ghost/`                  | Admin dev server (port 5174)        | Admin HTML entry — rewritten to `/__admin-dev__/`                      |
| `/ghost/*` (deep links)              | Ghost backend                       | Express middleware redirects deep links to `/ghost/#/<path>`           |
| Everything else                      | Ghost backend                       | Main Ghost application                                                 |

**Note:** Port numbers listed for Admin and Lexical are the host ports where those dev servers run by default. Public apps have no dev-server port — Caddy reads their build output straight off disk.
