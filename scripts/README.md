# scripts

`@internal/scripts` — repo automation invoked from CI workflows and local `pnpm`
aliases. A private workspace member, so it is linted and tested like any other
package: `pnpm nx run-many -t lint test` covers it, and Nx's affected graph runs
those targets whenever anything here changes.

New automation belongs here by default, whether it runs locally, in CI, or both.
The old `.github/scripts` split tracked nothing real — `release-apps` is run by
devs via `pnpm ship`, while `release.js` is run by a workflow.

## Adding a script

Write it as ESM (`.js` — the package is `type: module`) and parse arguments with
`node:util`'s `parseArgs`. Declare any dependency in `scripts/package.json`;
`semver` is already there. Keep it cheap: everything here lands in every dev's
`pnpm install`, so prefer `node:` built-ins.

Put logic shared by several scripts in `lib/`. A script that is its own
entrypoint can just export the parts worth testing and guard the CLI path with
`import.meta.main` — see `build-public-apps-matrix.js`. Either way, cover it in
`test/`: tests are plain `node --test`, discovered automatically. Note this
package is _not_ part of the root Vitest watcher (`pnpm test:watch`), which only
covers Vitest-based projects.

## The `.cjs` files

`.cjs` marks a script that predates the ESM default and hasn't been converted.
Nothing is wrong with them; they just haven't been touched. Migrating one is a
self-contained change: rename `foo.cjs` → `foo.js`, swap `require` for `import`,
and update its call sites (workflows, root `package.json`, or an app's `ship`
script). No config change is needed — `scripts/eslint.config.mjs` keys off the
extension. When the last one is gone, that config drops to a single block.

Don't add new `.cjs` files.

## Live WebMCP calls

`lib/webmcp-live-call.js` is an optional client helper for a browser agent with an
existing `tab.capabilities.get('webmcp')` handle. The Ghost editor registers stable
logical names, but the browser bridge can replace their UUID aliases when preview
documents change. The helper discovers the current alias immediately before each
call; it does not modify the browser bridge or register additional editor tools.

Import it from the absolute path of the checkout available to that browser session:

```js
const { createLiveWebMcpCaller } = await import(
  '/home/jonatan/Code/Monorepo/scripts/lib/webmcp-live-call.js'
);
const webmcp = await tab.capabilities.get('webmcp');
const call = createLiveWebMcpCaller(webmcp, {
  origin: approvedOrigin,
  pageUrl: approvedPageUrl,
});
const result = await call('ghost_canvas_state', {});
```

Set `approvedOrigin` and `approvedPageUrl` to the exact owner values from the
reviewed tool descriptors for the intended tab. The descriptor page URL may omit
the editor route hash. Tunnel origins are ephemeral: review the new origin before
reconnecting. A remote checkout path is not automatically available to a browser
agent running on another machine; make the helper available in that session first.

Review tool definitions before first use. Calls must be awaited sequentially;
overlapping calls are rejected. Subsequent calls reject changed definitions before
dispatch, ignoring only the alias. Inputs, application revision guards and call
options pass through unchanged. Errors and timeouts are never retried automatically,
including edits that might already have been accepted. Inspect current editor state
before deciding how to recover from an uncertain result.

This is a workaround for the bridge's textual `fetchTools().description()` catalog.
It does not suppress bridge notifications or prevent alias rotation. Origin and page
URL pins do not identify a document lifetime: after an editor reload, reacquire
application context. Navigation between discovery and dispatch can still reject a
call as stale. The helper's tests cover alias resolution and rejection behavior with
mock capabilities; they do not validate an installed browser bridge.

## Two things that don't live by these rules

**`enforce-package-manager.js`** is the root `preinstall` hook, so it runs
_before_ `node_modules` exists. It can never import anything — not even from
`lib/` — and must stay runnable by plain `node` on a literal path. The
devcontainer image copies it (and only it) out of this directory for the same
reason; see `docker/ghost-dev/Dockerfile`.

**`.github/scripts/i18n-review`** is intentionally _not_ a workspace member and
stays where it is. It carries its own lockfile, eslint config and CI workflow so
its `pull_request_target` job can install from a sparse checkout of `main`
without the root lockfile, and so its CI-only deps never reach a dev's install.
See that directory's README before changing anything about how it's wired.
