# scripts

`@internal/scripts` — repo automation invoked from CI workflows and local `pnpm`
aliases. A private workspace member, so it is linted and tested like any other
package: `pnpm nx run-many -t lint test` covers it, and Nx's affected graph runs
those targets whenever anything here changes.

New automation belongs here by default, whether it runs locally, in CI, or both.
The old `.github/scripts` split tracked nothing real — `release-apps` is run by
devs via `pnpm ship`, while `release.cjs` is run by a workflow.

## Adding a script

Write it as ESM (`.js` — the package is `type: module`) and parse arguments with
`node:util`'s `parseArgs`. Declare any dependency in `scripts/package.json`;
`semver` is already there. Keep it cheap: everything here lands in every dev's
`pnpm install`, so prefer `node:` built-ins.

Put testable logic in `lib/` and cover it in `test/` — tests are plain
`node --test`, discovered automatically. Note this package is *not* part of the
root Vitest watcher (`pnpm test:watch`), which only covers Vitest-based projects.

## The `.cjs` files

`.cjs` marks a script that predates the ESM default and hasn't been converted.
Nothing is wrong with them; they just haven't been touched. Migrating one is a
self-contained change: rename `foo.cjs` → `foo.js`, swap `require` for `import`,
and update its call sites (workflows, root `package.json`, or an app's `ship`
script). No config change is needed — `scripts/eslint.config.mjs` keys off the
extension. When the last one is gone, that config drops to a single block.

Don't add new `.cjs` files.

## Two things that don't live by these rules

**`enforce-package-manager.js`** is the root `preinstall` hook, so it runs
*before* `node_modules` exists. It can never import anything — not even from
`lib/` — and must stay runnable by plain `node` on a literal path. The
devcontainer image copies it (and only it) out of this directory for the same
reason; see `docker/ghost-dev/Dockerfile`.

**`.github/scripts/i18n-review`** is intentionally *not* a workspace member and
stays where it is. It carries its own lockfile, eslint config and CI workflow so
its `pull_request_target` job can install from a sparse checkout of `main`
without the root lockfile, and so its CI-only deps never reach a dev's install.
See that directory's README before changing anything about how it's wired.
