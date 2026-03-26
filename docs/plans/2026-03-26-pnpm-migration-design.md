# PNPM Migration Design

**Date:** 2026-03-26

## Goal

Migrate the Ghost monorepo from Yarn v1 workspaces to pnpm as a hard cutover, without enabling `shamefully-hoist`, while keeping the legacy Ember admin buildable and testable.

## Scope

This migration includes:

- root workspace management and lockfile migration
- root/package/workspace script updates from `yarn` to `pnpm`
- Docker development image and entrypoint changes
- GitHub Actions install/cache/command updates
- `ghost/core` packaging and monobundle changes that currently assume `yarn.lock`
- `ghost/admin` dependency and build-path fixes required by pnpm's stricter module layout
- targeted pnpm compatibility settings when explicit dependency fixes are not sufficient

This migration does not include:

- upgrading Ember itself
- rewriting the admin build to Embroider or Vite
- preserving dual Yarn/pnpm support

## Constraints

- Hard cutover: the repository should present pnpm as the only supported package manager after the change.
- No `shamefully-hoist`.
- Targeted `hoist-pattern`, `public-hoist-pattern`, or `packageExtensions` are acceptable if required.
- Changes may be made both in package-manager configuration and in `ghost/admin`.

## Current Blockers

### Repository-wide Yarn assumptions

The repository currently assumes Yarn in several places:

- root scripts in `/Users/jonatan/.codex/worktrees/393f/Monorepo/package.json`
- Docker install and lockfile hashing in `/Users/jonatan/.codex/worktrees/393f/Monorepo/docker/development.entrypoint.sh`
- dev image dependency installation in `/Users/jonatan/.codex/worktrees/393f/Monorepo/docker/ghost-dev/Dockerfile`
- CI install, cache keys, and changed-file filters in `/Users/jonatan/.codex/worktrees/393f/Monorepo/.github/scripts/install-deps.sh` and `/Users/jonatan/.codex/worktrees/393f/Monorepo/.github/workflows/ci.yml`
- standalone packaging in `/Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/core/package.json` and `/Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/core/monobundle.js`

### Ember admin pnpm-hostile assumptions

The legacy admin has two classes of problems:

1. Hardcoded package layout assumptions
   - `/Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/admin/ember-cli-build.js` imports assets from `node_modules/...`, which is brittle under pnpm.

2. Missing or indirect dependency usage
   - `/Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/admin/lib/asset-delivery/index.js` requires `lodash/camelCase`, but `ghost/admin/package.json` does not declare `lodash`.
   - Old Ember addons and test tooling are likely relying on undeclared peers/transitives that Yarn's flatter tree currently exposes.

## Recommended Approach

Use a three-layer strategy:

1. Convert the repo to pnpm cleanly at the root and infrastructure layers.
2. Fix in-repo dependency and path issues in `ghost/admin` so the app is correct under isolated installs.
3. Add the smallest possible pnpm compatibility layer for third-party Ember package issues that remain.

This is the best trade-off between correctness and cutover risk. It avoids carrying a fragile "pretend Yarn" setup inside pnpm while still giving the old Ember app a practical escape hatch.

## Workspace And Package Manager Design

### Root workspace

Add:

- `pnpm-workspace.yaml` with:
  - `ghost/*`
  - `apps/*`
  - `e2e`

Update root `package.json`:

- add `packageManager` pointing to the chosen pnpm version
- keep existing workspace metadata if Nx or internal scripts read it, unless testing shows it can be removed safely
- convert `yarn workspace ...` calls to `pnpm --filter ...`
- convert `yarn nx ...` calls to `pnpm nx ...`
- convert recursive script chaining to pnpm-compatible forms

### Lockfile and install policy

- remove `yarn.lock`
- generate `pnpm-lock.yaml`
- standardize installs on `pnpm install --frozen-lockfile`
- preserve `--ignore-scripts` behavior in CI, then run the explicit sqlite3 recovery step if still needed

## PNPM Compatibility Design

### First choice: explicit fixes

Prefer fixing repository-owned issues directly:

- declare missing direct dependencies in `ghost/admin/package.json`
- declare missing addon dependencies in local addon `package.json` files under `ghost/admin/lib`
- replace `node_modules/...` asset imports with package-resolution-based absolute paths or addon-safe resolved paths

### Second choice: `packageExtensions`

Use pnpm `packageExtensions` for third-party packages with broken manifests, especially old Ember addons that assume undeclared peers or build dependencies.

This keeps the compatibility policy explicit and localized.

### Third choice: targeted hoisting

If explicit fixes and `packageExtensions` are not enough, add a short allowlist via `public-hoist-pattern` or `hoist-pattern` for the exact packages that still require visibility from the project root.

The allowlist should be driven by observed failures, not guesswork.

Likely candidates, if needed, will come from old Ember CLI and addon tooling rather than modern React apps.

## Ember Admin Design

### Dependency cleanup

Audit `ghost/admin` imports and `require()` calls against declared dependencies. Add missing packages that are used directly by:

- `ghost/admin` application code
- test files
- custom in-repo addons under `ghost/admin/lib`
- build-time hooks such as `asset-delivery`

### Build path cleanup

Refactor `ghost/admin/ember-cli-build.js` to avoid `app.import('node_modules/...')`.

Preferred pattern:

- resolve package roots with `require.resolve(...)`
- derive asset paths from resolved package locations
- pass resolved absolute paths into `app.import(...)`

This is compatible with pnpm's symlinked store and avoids depending on a local flat `node_modules` tree.

### Verification target

The minimal success bar for the admin is:

- `pnpm nx run ghost-admin:build:dev` passes
- `pnpm nx run ghost-admin:test` passes, or if the existing test target is unstable, the known maintainable subset is documented and run

## Docker And CI Design

### Docker

Update development image and runtime scripts to:

- copy `pnpm-lock.yaml` instead of `yarn.lock`
- hash the pnpm lockfile instead of the Yarn lockfile
- install pnpm in the image in a deterministic way
- use pnpm cache mounts instead of Yarn cache mounts where appropriate
- run `pnpm nx reset` and `pnpm dev`

### CI

Update CI to:

- detect `pnpm-lock.yaml` changes instead of `yarn.lock`
- compute dependency cache keys from `pnpm-lock.yaml`
- install pnpm before dependency installation
- run pnpm-based commands everywhere that currently call Yarn

The changed-path filters should treat `pnpm-lock.yaml` as shared infra input the same way `yarn.lock` is treated today.

## Packaging Design

`ghost/core` packaging currently copies `yarn.lock` into packed output and uses scripts that assume Yarn-managed workspace packaging behavior.

Migration changes should:

- copy `pnpm-lock.yaml` where a lockfile is required in packaged artifacts
- confirm whether standalone packaging still expects a lockfile in the tarball
- keep `npm pack` where package tarball generation is intentional and unrelated to workspace management

## Testing Strategy

Run verification in increasing cost order:

1. `pnpm install`
2. `pnpm nx run ghost-admin:build:dev`
3. `pnpm nx run ghost-admin:test`
4. `pnpm nx run-many -t build --exclude=ghost-admin`
5. representative root scripts such as `pnpm test:e2e --help` or a lighter smoke-check equivalent
6. if Docker is in scope for this branch, build the dev image or at minimum validate the dependency-install layer

If a failure is caused by missing package visibility:

1. add the missing explicit dependency if the repo owns the import
2. add a `packageExtensions` entry if the package manifest is wrong
3. add a targeted hoist rule only if the first two are insufficient

## Risks

- Ember 3.24-era addons may rely on transitive peer visibility in ways that are only exposed after a real install/build.
- CI cache behavior will change because pnpm's store and symlink layout differ from Yarn's `node_modules` caching model.
- Docker install flow may need iteration if native module behavior changes under pnpm plus `--ignore-scripts`.

## Rollback

Because this is a hard cutover, rollback is simple:

- revert the migration branch or commit series
- restore `yarn.lock`
- restore Yarn-specific CI and Docker commands

No attempt should be made to maintain both package managers simultaneously after merge.
