# Dev Gateway (Caddy)
This directory contains the Caddy reverse proxy configuration for the Ghost development environment.

## Purpose
The Caddy reverse proxy container:
1. **Routes Ghost requests** to the Ghost container backend
2. **Proxies asset requests** to local dev servers running on the host
3. **Enables hot-reload** for frontend development without rebuilding Ghost

## Configuration
### Environment Variables
Caddy uses environment variables (set in `compose.dev.yaml`) to configure proxy targets:

- `GHOST_BACKEND` - Ghost container hostname (e.g., `ghost-dev:2368`)
- `ADMIN_DEV_SERVER` - React admin dev server (e.g., `host.docker.internal:5173`)
- `ADMIN_LIVE_RELOAD_SERVER` - Ember live reload WebSocket (e.g., `host.docker.internal:4200`)
- `PORTAL_DEV_SERVER` - Portal dev server (e.g., `host.docker.internal:4175`)
- `COMMENTS_DEV_SERVER` - Comments UI (e.g., `host.docker.internal:7173`)
- `SIGNUP_DEV_SERVER` - Signup form (e.g., `host.docker.internal:6174`)
- `SEARCH_DEV_SERVER` - Sodo search (e.g., `host.docker.internal:4178`)
- `ANNOUNCEMENT_DEV_SERVER` - Announcement bar (e.g., `host.docker.internal:4177`)
- `LEXICAL_DEV_SERVER` - *Optional:* Local Koenig Lexical editor dev server (e.g., `host.docker.internal:4173`)
  - For developing Lexical in the separate [Koenig repository](https://github.com/TryGhost/Koenig)
  - Requires `EDITOR_URL=/ghost/assets/koenig-lexical/` when starting admin dev server
  - Automatically falls back to Ghost backend (built package) if dev server is not running

**Note:** AdminX React apps (admin-x-settings, activitypub, posts, stats) are served through the admin dev server so they don't need separate proxy entries.

### Ghost Configuration
Ghost is configured via environment variables in `compose.dev.yaml` to load public app assets from `/ghost/assets/*` (e.g., `portal__url: /ghost/assets/portal/portal.min.js`). This uses the same path structure as built admin assets.

### Routing Rules
The Caddyfile defines these routing rules:

| Path Pattern                         | Target                              | Purpose                                                                |
|--------------------------------------|-------------------------------------|------------------------------------------------------------------------|
| `/ember-cli-live-reload.js`          | Admin live reload (port 4200)       | Ember hot-reload script and WebSocket                                  |
| `/ghost/api/*`                       | Ghost backend                       | Ghost API (bypasses admin dev server)                                  |
| `/ghost/assets/koenig-lexical/*`     | Lexical dev server (port 4173)      | *Optional:* Koenig Lexical editor (falls back to Ghost if not running) |
| `/ghost/assets/portal/*`             | Portal dev server (port 4175)       | Membership UI                                                          |
| `/ghost/assets/comments-ui/*`        | Comments dev server (port 7173)     | Comments widget                                                        |
| `/ghost/assets/signup-form/*`        | Signup dev server (port 6174)       | Signup form widget                                                     |
| `/ghost/assets/sodo-search/*`        | Search dev server (port 4178)       | Search widget (JS + CSS)                                               |
| `/ghost/assets/announcement-bar/*`   | Announcement dev server (port 4177) | Announcement widget                                                    |
| `/ghost/assets/*`                    | Admin dev server (port 5173)        | Other admin assets (fallback)                                          |
| `/ghost/*`                           | Admin dev server (port 5173)        | Admin interface                                                        |
| Everything else                      | Ghost backend                       | Main Ghost application                                                 |

**Note:** All port numbers listed are the host ports where dev servers run by default.
