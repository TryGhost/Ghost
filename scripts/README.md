# scripts

`@internal/scripts` — repo automation invoked from CI workflows and local `pnpm`
aliases. A private workspace member, so it is linted and tested like any other
package: `pnpm nx run-many -t lint test` covers it, and Nx's affected graph runs
those targets whenever anything here changes.

New automation belongs here by default, whether it runs locally, in CI, or both.
The old `.github/scripts` split tracked nothing real — `release-apps` is run by
devs via `pnpm ship`, while `release.js` is run by a workflow.

## Adding a script

Write new scripts in TypeScript (`.ts`, ESM) and parse arguments with
`node:util`'s `parseArgs`. Declare any dependency in `scripts/package.json`;
`semver` is already there. Keep it cheap: everything here lands in every dev's
`pnpm install`, so prefer `node:` built-ins.

Put logic shared by several scripts in `lib/`. A script that is its own
entrypoint can just export the parts worth testing and guard the CLI path with
`import.meta.main` — see `build-public-apps-matrix.js`. Either way, cover it in
`test/`: tests use `node --test` with explicit JS/TS globs. TypeScript runs directly on
the pinned Node version; `test:types` checks source, renderer and tests with the
shared strict configuration. Note this
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

## TypeScript inventory

Run `pnpm inventory:typescript --output /tmp/ghost-typescript` from the root to
write a searchable HTML report and a JSON inventory. Open
`/tmp/ghost-typescript.html` in a browser. Use `--scope ghost/core` (or another
repository-relative directory) to focus the report. Resolution and dependent
counts still consider the whole repository. The HTML folder tree expands down
to individual files, with recursive JS/TS counts on each folder. Select a file
to inspect its dependencies.

The inventory reads tracked working-tree JS/JSX/TS/TSX files, including `.mjs`,
`.cjs`, `.mts`, and `.cts`. It excludes submodules, untracked files, fixture and
snapshot directories, vendor directories, build/dist/coverage output, minified
JavaScript, the package template, and SimpleMDE's generated debug bundles.
Declaration files are counted separately. Exclusion paths and declaration totals
are repository-wide, even in scoped reports. Percentages compare implementation
files and physical lines (including comments and blanks); they do not measure
type safety or enforce conversion of intentional JavaScript tooling.

Files are grouped by their nearest package manifest. Tests and tooling use path
and filename conventions; these categories are approximate. Production is split
into frontend (`apps/`, Koenig's three editor UI packages, and Core's
`core/frontend/public/` browser scripts) and backend (remaining server code and
library packages, including libraries shared with the frontend). Core's
`core/frontend/` routing and rendering code executes on the server and therefore
belongs to backend. Tests and tooling take precedence over this split. JSON
schema version 2 replaces the old `production` category with these two values.

Static imports, re-exports, literal dynamic imports, and `require()` calls are
parsed with the TypeScript compiler API. Dependency resolution uses the nearest tracked
`tsconfig.json`, including inherited options, or NodeNext defaults when absent.
Resolution runs with `allowJs` to identify JavaScript dependencies. The report
shows the configuration and resolved path for each dependency. Node built-ins
are marked typed only when Node declarations resolve from the importing file.

Difficulty is a transparent triage heuristic:

- Each dependency resolving to JavaScript adds 3 points.
- Each unresolved dependency or built-in without available Node types adds 5.
- Each computed import or require adds 5.
- Each 100 physical lines and each 5 functions adds 1 (rounded up).
- CommonJS adds 2; each parse error adds 10.
- Scores up to 5 are easier, up to 15 moderate, and above 15 harder.

Repeated imports are deduplicated by specifier and import/require mode. Direct
callers are listed separately to show conversion impact. This is a static module
graph: runtime loading and shadowed `require` calls are not resolved semantically.
Cycles, ambient module declarations, JSDoc quality, bundler-specific resolution,
and business complexity are not assessed. Missing builds or dependencies can
produce unresolved imports; available declarations can still contain `any`.
Inspect the evidence before choosing a conversion. The report neither executes
source modules nor queries package registries.

The implementation follows TypeScript's
[module resolution reference](https://www.typescriptlang.org/docs/handbook/modules/reference)
and [compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API).
Run its tests with
`pnpm --filter @internal/scripts exec node --test test/typescript-inventory.test.ts`.

### Published reports

The `TypeScript inventory` workflow runs independently on every push to `main`.
It installs locked dependencies and builds workspace declarations before scanning,
then retains the HTML and JSON as a `typescript-inventory` artifact for 30 days.
Runs do not cancel each other. Each push measures its head commit; commits batched
into a single push do not each get a separate measurement.

After a successful run, a separate workflow dispatches its run ID to
Ghost-Benchmarks using the existing cross-repository publishing credential.
The receiver verifies the source run before publishing the latest report at
[TypeScript inventory](https://tryghost.github.io/Ghost-Benchmarks/typescript/).
It retains compact per-commit counts in `typescript/history.json`. Older runs
can add history without replacing a newer report. Failed scans leave the last
published report intact; rerun the failed workflow to retry. Publishing requires
the receiver workflow to be installed on Ghost-Benchmarks main first.
