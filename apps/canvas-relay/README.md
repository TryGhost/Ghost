# Ghost canvas relay spike

The local spike connects GHST to an already open Ghost theme editor. Ghost staff
connect by opening the CLI link in that editor. A Cloudflare Worker routes requests to one
SQLite-backed Durable Object per tenant/session; the browser connects outward
through WebSocket. The mounted editor owns the draft, previews, history and
publication review. Native WebMCP is optional.

This private application is not published or deployed. The GHST extension lives
in a local source checkout; the published CLI does not yet include it. Production
deployment and upstream integration are separate work.

## Run locally

Use the normal monorepo dev environment and authenticated Admin entry point.
`ghost/core/config.local.json` must contain the site's current URL. For another
computer, use the existing HTTPS Admin tunnel and configure Ghost's URL first.

From the workspace root:

```sh
pnpm --filter @tryghost/canvas-relay setup:local
pnpm --filter @tryghost/canvas-relay dev
```

Setup preserves existing Ghost configuration and writes ignored relay settings,
private issuer keys and the Admin proxy target. Restart Ghost to load its config;
Vite reloads its environment file. Restart the Docker dev gateway after Caddyfile
changes. The relay uses `wrangler dev --local` on port 8787 and persists SQLite
state in `.wrangler/state`.

The browser uses Admin's HTTPS origin at `/__admin-dev__/canvas-relay`. Vite proxies
HTTP and WebSockets to Wrangler. Ghost uses `host.docker.internal:8787` for staff
approval. Wrangler's upstream protocol matches the public URL, preserving exact
origin checks. No browser security bypass or sign-in permission prompt is needed.
The local listener supports Docker development, not public production exposure.

When the tunnel hostname changes, update Ghost's URL, rerun `setup:local`, restart
Ghost and the relay, and pair against the new origin. Capabilities pin their URL.

## Install the local GHST extension

Choose a checkout outside this monorepo so its dependencies stay independent:

```sh
git clone https://github.com/TryGhost/ghst.git /tmp/ghst-canvas-spike
pnpm --filter @tryghost/canvas-relay setup:ghst --checkout /tmp/ghst-canvas-spike
cd /tmp/ghst-canvas-spike
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm add --global /tmp/ghst-canvas-spike
```

Choose a persistent path instead of `/tmp` for a lasting installation. The
installer copies the command, transport, schemas and tests, and wires the command
into GHST. It does not publish or change upstream. Reinstall and rebuild after
extension changes. Alternatively run `node /path/to/checkout/dist/index.js`.

## Pair and edit

Open the real theme editor as staff with theme-editing permission. Run:

```sh
ghst --url https://YOUR-GHOST-SITE canvas connect
```

Open the printed verification URL. After sign-in, the authenticated theme editor
connects automatically without an extra confirmation. Opening the link in an
already open editor connects without reloading its draft. Close the tab to
disconnect the editor. The link parameters remain in the URL, allowing a page
reload to reconnect the same approved session. The command waits for pairing and readiness.
For asynchronous setup, use
`connect --no-wait`, then `ghst canvas wait`.

Pairing saves the site connection. All subsequent `ghst canvas` commands use it;
omit `--url` and staff credentials. Check `canvas status` when resuming work.

```sh
ghst canvas status
ghst canvas tools
ghst canvas state
ghst canvas read default.hbs partials/components/navigation.hbs
ghst canvas read default.hbs > /tmp/default.hbs
ghst canvas write default.hbs --file /tmp/default.hbs
ghst canvas edit --write default.hbs=/tmp/default.hbs assets/css/editorial.css=/tmp/editorial.css --set theme.background_image=false
ghst canvas frames
ghst canvas disconnect
```

Use native file, settings and frame commands; the CLI handles complete reads,
batching, capability checks and revision guards. It remembers the context of the
last successful read privately beside the connection file. A conflicting edit
requires reading current files again; it never refreshes a stale write and retries.
See the [CLI command guide](ghst/README.md) for examples. `tools` and `tools --json`
return compact capabilities and build/CSS guidance; full remote schemas require
`tools --schemas`. Raw `--input` access remains available for
the eight editor actions. `edit` validates and waits for delivery by default;
`--dry-run` is optional. There is
no publish or screenshot action. Check desktop/mobile appearance with a browser
or the person's canvas; render readiness alone does not verify appearance.

Credentials default to `~/.config/ghst/canvas.json` with mode 0600. Use
`--connection FILE` or `GHST_CANVAS_CONNECTION` for another session. Connect refuses
to overwrite another connection file; choose a new file when pairing again.
Initial pairing expires after five minutes; approved sessions last one hour.
The retained link can resume only the same approved staff-bound session, without
rotating its agent credential or extending that expiry. Do not share
connection files or issuer keys. Disconnect by closing the editor tab, or revoke the session with the CLI. Offline
editors cannot receive edits.

The bundled [agent skill](skill/ghost-theme-edit/SKILL.md) explains the workflow.
Copy its directory into your agent's skill location if wanted. It requires this
local extension and does not claim the commands are already published.

## Trust, tenancy and delivery

`TENANT_KEYS` is a service-side registry of trusted tenant issuers and exact
browser origins. Signed capabilities bind tenant, session, staff subject, role,
audience and expiry. Site URLs and origin headers do not establish tenant identity.
The Worker verifies claims before selecting the object named by tenant/session.
Ghost approval requires a real staff cookie session and theme-editing permission;
staff API tokens cannot substitute for editor approval.

The CLI starts a short-lived pairing with a private polling secret. Only the authenticated
staff editor can redeem the code in the link and release an agent capability. Editor and agent
roles differ. The editor obtains a single-use socket ticket; long-lived tokens do
not appear in socket URLs. One editor owns a session. Reconnecting creates a new
epoch, which calls must explicitly address.

The browser retries ticket acquisition and socket handshakes with jittered backoff,
using a fresh ticket and epoch after a transport drop. A 30-second heartbeat detects
silent failures; Workerd answers ping/pong without waking the Durable Object.
Transient drops preserve the mounted draft. Closing the tab cancels retries;
expired, revoked or unauthorized sessions stop and require a new pairing link.
Authorization stays in the mounted editor's memory across effect refreshes and is
not persisted to browser storage. Authenticated startup uses the retained pairing
URL to recover authorization after reload. Pending edits remain uncertain after a drop.

An operation is stored durably before dispatch. The CLI emits its ID to stderr.
Reusing the ID with the same payload observes the operation; changed payloads
reject. Timeouts and lost replies never trigger automatic replay. Observe with
`ghst canvas result ID` and inspect state before recovering from an unknown
outcome. A network timeout does not prove an edit was rejected.

Session metadata, results and socket attachments survive object hibernation.
Payload size, tickets, operations and lifetime are bounded. Expiry removes results
and retains a tombstone. The service stores no independent draft. Publishing
remains the person's action inside Ghost. Production still needs issuer
provisioning/key rotation, service-wide abuse controls and deployment work.

## Validation and legacy harness

The workspace's `build`, `test` and `lint` commands validate the Worker and client.
Runtime tests execute real Durable Object code in Miniflare/workerd, covering
isolation, roles, pairing, reconnects, expiry, quotas and non-replay. Ghost API and
Admin tests cover staff approval and older backend behavior. The local browser
proof uses GHST, Wrangler and ordinary HTTPS/WSS browser policy to read, edit,
await previews, restore and disconnect.

The older `dev:miniflare` and `spike` commands remain a transport test harness with
a development issuer. They are not the staff-pairing workflow. Run
`pnpm --filter @tryghost/canvas-relay spike --help` for those arguments.
