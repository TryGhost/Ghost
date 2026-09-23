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

| Target                               | Surface                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| `admin.dashboard.card.render`        | Card content inside a host-owned shell on the analytics Overview page                |
| `admin.dashboard.card.should-render` | Paired visibility check for the card                                                 |
| `admin.page.render`                  | Full page at `#/apps/:handle/*` (wildcard path arrives as `ghost.data.context.path`) |
| `admin.page.should-render`           | Paired visibility check (contract-reserved)                                          |

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

For local development, set `localStorage['ghost-addons-dev'] = JSON.stringify(['http://localhost:4650/manifest.json'])` in the admin console — dev manifests load unpinned and override same-handle installs. See `apps/addon-demo`.

### Full editor-block demo

Start the SEO baseline and all three editor-block providers together from the repository root:

```bash
pnpm dev:addons
```

Run this alongside `pnpm dev`. It starts the four providers and Koenig's integrated build watcher. The main development command already starts the add-on kit watcher, so editor-host changes are served without a second watcher or a separate `pnpm dev:lexical` process.

With Ghost and React Admin running, enable the **Add-ons** developer experiment and open **Apps → Browse marketplace**. The marketplace contains all four local providers. Install the three editor demos, then create a post and insert each named block from the slash menu:

- **Event** is the static baseline. Change the title, date, location, description, and link; the same useful content is saved for web, email, and RSS without a hydration runtime.
- **Podcast player** accepts a public episode URL. Its provider backend resolves the episode into a durable snapshot, and the public web card hydrates into an audio player.
- **Chart** starts with sample data. Import [`../addon-demo-chart/demo-data.csv`](../addon-demo-chart/demo-data.csv), switch the chart mode or series, and observe the SVG update before the Ghost-hosted email/RSS image fallback finishes uploading.

Publish or preview the post to compare the static event, hydrated podcast player, and progressively enhanced chart. Temporarily stopping the provider processes after saving is a useful final check: durable card snapshots should continue rendering.

## Contract notes

- The authoring contract promises only that `gh-*` primitives are observed. Add-ons run in an iframe realm today (a real, hidden, inert DOM exists), but DOM fidelity beyond the primitives is explicitly not promised, so the execution model can move into a Worker without breaking add-ons.
- The vocabulary is deliberately small (`gh-text`, `gh-stack`, `gh-inline`, `gh-badge`, `gh-heading`, `gh-separator`, `gh-stat`, `gh-sparkline`, `gh-tabs`/`gh-tab`, `gh-button`) and grows ad hoc when a real add-on hits a wall — never speculatively.
- Cross-boundary function references use `@quilted/threads` **manual retain/release**, wired into the `RemoteReceiver` — this is load-bearing, not polish.
- Ghost admin currently ships no CSP; if it ever gains one, the sandbox bootstrap needs a deliberate carve-out.

## Discovering posts containing a card

The Admin posts browse endpoint accepts an optional `has_card` selector:

```text
/ghost/api/admin/posts/?has_card=addon:podcast:episode&filter=status:published
```

The selector matches `type: "addon"`, `addonHandle`, and `blockName` on the same
Lexical node. It follows the root/children tree, excluding objects inside props
and text. Filtering happens before pagination and counts; multiple matching
cards still return one post. Existing permissions, filters, and ordering apply.
This is candidate discovery, not a decision about a reader's access to a card.

For identities containing punctuation, Unicode, or separators, URI-encode each
component before query-string encoding the complete selector:

```js
const selector = `addon:${encodeURIComponent(handle)}:${encodeURIComponent(blockName)}`;
const params = new URLSearchParams({has_card: selector, filter: 'status:published'});
```

Invalid selectors return a validation error. This spike queries saved Lexical
JSON directly on MySQL and SQLite; it does not maintain tags, metafields, or a
persistent card index. The option is available on Admin browse, not Content API.

## Public card data

Editor renderers can return `publicProps` alongside their static content. Saved
`props` remain the authoritative authoring data; only `publicProps` enter the
public iframe bootstrap. Return `{}` when hydration should receive none of the
authoring fields. Omitting `publicProps` retains the original contract in which
all props are public, for existing public cards.

Static HTML, CSS, portable content, and resource policies are also public.
Providers must keep private authoring values out of those outputs. Loading and
failed insertion placeholders expose no authoring props. Admin keeps the saved
Lexical data; the Content API does not return Lexical or Mobiledoc source.

## Editor media uploads

`GhEditorRow` groups two related settings fields into equal-width columns.
Editor snapshots can mark an element with `data-ghost-post-title` to display the
current post title as text. Koenig refreshes previews on load and resolves this
binding locally, without copying the title into app properties or post history.

The React host supplies `gh-media-upload` in card settings. Use `GhMediaUpload`
from the editor-settings export with a label, audio/video format, and optional
current URL. Its change event contains `{url, mime_type, byte_length}`, or null
when removing a file. File bytes and authenticated upload requests stay in the
host. Saved references use the card's normal patch and post-save pipeline.

Host controls are supplied through the optional `settingsComponents` map when
creating the editor block configuration. Koenig retains the mounted settings
surface while closed, allowing an in-flight upload to finish on its original
card; disposing that surface prevents late upload callbacks.

## Post access and card visibility

Providers can use their integration Admin key to call `POST /ghost/api/admin/post_access/`
with `{post_access: [{post_ids: [...], member: {uuid, key}}]}`. Omit `member` for
anonymous access. The batch accepts at most 100 IDs and returns one
`{id, access, visible_card_ids}` decision per distinct ID. Missing, unpublished,
scheduled, and deleted posts return false access and no visible cards.

Card visibility runs the real Lexical renderer and Ghost's website preview and
conditional-content gating. Temporary unpredictable markers bind the result to
actual rendered card nodes; HTML mentioning a card ID cannot grant access.
Empty or rejected snapshots and ambiguous duplicate card IDs are omitted. A
rendering failure fails the request instead of returning partial decisions.

The same-origin `GET /members/api/member/context/` returns the current signed-in
member's existing `{uuid, key}` signed-link credential, or null. These credentials
are a spike contract for later replacement; they are not app-specific. Both
context and access responses are private and uncached. Providers must keep Admin
keys server-side and validate access on each request.

Published decisions also carry `card_revision`, a digest of the saved Lexical
content and access configuration. Admin browse requests using `has_card` and
Lexical format return the same digest; include tiers when requesting relations.
Providers must require matching revisions before selecting media from a separate
post read. This detects conflicting edits even within the same timestamp second.

Rendered card figures carry `data-addon-post-id` from the current enclosing
post response, alongside the node's `data-addon-id`. This includes preview
pages and HTML-only Content API responses. Parent identity is not saved in card
props: copying a card or a post binds it to its new parent. Providers must still
verify the published post, card identity, and access for every player request.

Hydration requests receive website-only `envelope.context` containing the current
`postId`, `cardId`, and member credential, plus `bridge.fetch()` and
`bridge.requestSignin()`. Fetches are limited to the installed manifest's backend
origin and omit Ghost cookies; the iframe can retain `connect-src 'none'`.
The host remounts provider cards on session-refresh events and discards replies
from obsolete frames. The renderer replaces outdated saved markup before mounting
the current public representation, while preserving matching snapshots.
