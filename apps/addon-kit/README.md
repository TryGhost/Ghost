# @tryghost/addon-kit

Runtime and authoring surface for the **Ghost remote add-on spike** (labs flag: `addons`). See `addons-plan.local.md` at the repo root for the full design; this package implements it.

## What this is

Third-party add-on code runs inside a hidden `<iframe sandbox="allow-scripts">` — an **opaque origin**, browser-enforced isolation from the admin origin with no cookies, storage, or ambient credentials. The add-on renders a small vocabulary of `gh-*` primitives with Preact; mutations are mirrored to the host over `postMessage` via [remote-dom](https://github.com/Shopify/remote-dom), and the host maps each primitive to a real Shade component. Add-ons never touch the admin DOM and ship no CSS.

```
┌─ Ghost Admin (host) ─────────────────────────────┐
│ RemoteReceiver + RemoteRootRenderer → Shade      │
│ ghost bridge host side (toast, navigate, fetch)  │
│        ▲ @quilted/threads (manual retain/release)│
└────────┼─────────────────────────────────────────┘
         │ postMessage (structured mutations + async RPC)
┌────────┼── sandboxed iframe (opaque origin) ─────┐
│ Ghost bootstrap: fetch bundle → verify integrity │
│ → eval → RemoteMutationObserver(document.body)   │
│ Add-on bundle: Preact + gh-* elements            │
└──────────────────────────────────────────────────┘
```

## Exports

- `@tryghost/addon-kit/host` — host runtime: `AddonDashboardCards`, `AddonPage`, `useAddonInstalls`, the `gh-*`→Shade component map, sandbox controller, `ghost` bridge host side.
- `@tryghost/addon-kit/addon` — authoring surface for add-ons: `GhText`, `GhStack`, `GhButton` Preact components and the `GhostBridge` types.
- `@tryghost/addon-kit/bootstrap` — the built sandbox bootstrap as a string (internal; injected into the iframe by the host).

## Surfaces (extension targets)

| Target | Surface |
| --- | --- |
| `admin.dashboard.card.render` | Card content inside a host-owned shell on the analytics Overview page |
| `admin.dashboard.card.should-render` | Paired visibility check for the card |
| `admin.page.render` | Full page at `#/apps/:handle/*` (wildcard path arrives as `ghost.data.context.path`) |
| `admin.page.should-render` | Paired visibility check (contract-reserved) |

Sidebar items are **not** a render target: they're static manifest metadata (`sidebar.label/icon/route`) rendered by the host with zero sandbox involvement.

## The `ghost` bridge

Everything crossing the boundary is async — there are no synchronous host reads.

- `ghost.data` / `ghost.onDataChange(cb)` — contextual data envelope (site, api version, target context).
- `ghost.toast.show(message, {type})` — host-rendered notification.
- `ghost.navigate(path)` — navigation within Ghost Admin.
- `ghost.fetch(url, init)` — **host-executed** fetch; the sandbox never sees credentials. Two destinations:
  - The add-on's manifest-declared `backend` origin. The spike attaches an explicitly **unsigned** `x-ghost-dev-identity` header; production replaces the value with a short-lived, audience-bound, Ghost-signed token.
  - The instance's own Admin API (paths under `/ghost/api/admin/`). **Spike-only full passthrough with no compatibility promise** — the permissions revamp narrows this before add-ons ship publicly. The `addons` labs flag must not GA before then.

## Distribution

The instance stores install records (manifest URL, pinned version, per-bundle sha256 integrity, enabled targets) as a JSON array in the `addons` setting — a list, not a service. Providers host the manifest + bundles on their origin and **must serve them with `Access-Control-Allow-Origin: *`** (the opaque-origin sandbox fetches with `Origin: null`). Updates are automatic: on load the admin re-pins to the latest `api_version`-compatible release; integrity binds cached bytes to the manifest across the TOFU (provider-origin-anchored) trust model.

### Install flow

Every install goes through the consent screen at `#/apps/install?manifest=<url>` — a shareable link (Shopify-style: it can arrive from anywhere on the web). The screen shows the manifest **origin as the trust anchor**, plus permissions **derived** from the manifest (surfaces, sidebar, backend origin, and the blanket spike-only Admin API line — display-only; real scoping is the permissions revamp's job). Accepting pins the manifest into the `addons` setting and lands the user inside the app. Links for already-installed handles redirect to the detail page.

Around it: `#/apps` (installed list; dev-manifest loads appear with a **Dev** badge), `#/apps/marketplace` (hardcoded catalog of manifest URLs, rendered from the manifests), and `#/apps/marketplace/:handle` (unified state-aware detail: Install when not installed, Open/Uninstall when installed, Remove-dev-manifest for dev loads). `marketplace` and `install` are reserved handles — static route segments outrank the `:handle` wildcard. The sidebar "Apps" group header links to the list; the marketplace is one click behind it via the list's header action.

Server-side, the `addons` key must be listed in the settings API's `EDITABLE_SETTINGS` allowlist (input serializer) and in `useBrowseSettings`' group list — both silently drop unknown keys otherwise.

For local development, set `localStorage['ghost-addons-dev'] = JSON.stringify(['http://localhost:4650/manifest.json'])` in the admin console — dev manifests load unpinned and override same-handle installs (an installed record's pinned integrity breaks when you rebuild bundles without bumping the version; the dev path exists precisely for that loop). See `apps/addon-demo`.

## Contract notes

- The authoring contract promises only that `gh-*` primitives are observed. Add-ons run in an iframe realm today (a real, hidden, inert DOM exists), but DOM fidelity beyond the primitives is explicitly not promised, so the execution model can move into a Worker without breaking add-ons.
- The vocabulary is deliberately small (`gh-text`, `gh-stack`, `gh-inline`, `gh-badge`, `gh-heading`, `gh-separator`, `gh-stat`, `gh-sparkline`, `gh-tabs`/`gh-tab`, `gh-button`) and grows ad hoc when a real add-on hits a wall — never speculatively.
- Cross-boundary function references use `@quilted/threads` **manual retain/release**, wired into the `RemoteReceiver` — this is load-bearing, not polish.
- Ghost admin currently ships no CSP; if it ever gains one, the sandbox bootstrap needs a deliberate carve-out.
