# Repository automation

`@internal/scripts` is the private workspace for repository setup, validation,
builds, CI reports and releases. pnpm/Nx tasks, hooks and workflows invoke these
files directly. [Tooling ownership](../README.md) explains the boundary with gx,
shared configuration and Ghost's build/installed tools.

Contributor commands belong in [gx](../gx/README.md). Shared environment and
bootstrap helpers listed below remain repository automation.
Release automation stays here even when a maintainer runs it through `pnpm ship`.

## Automation groups

Use three responsibility groups: `ci/`, `build/` and `release/`. Bootstrap,
shared development setup, repair and formatting remain root concerns. These are
the intended subfolders; existing entrypoints are currently flat. The tables use
current filenames, so they remain usable before the path migration. Grouping a
file does not change its command, environment or dependencies.

Keep private implementation with its group and genuinely shared support in
`lib/`. Retain the central `test/` directory. These existing support directories
are not additional automation categories. Workspace metadata and lint/type
configuration remain at the root.
All groups stay within the same `@internal/scripts` workspace.

### CI and validation — ci/

Checks, affected/shard selection and report generation. Classify by purpose:
`build-publish-matrix.ts` belongs to release, although CI calls it; TypeScript
inventory is a reporting tool, although contributors can run it locally.

| Current file                                                   | Purpose                                                                 | Caller                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------- |
| [assert-boot-skips-modules.ts](assert-boot-skips-modules.ts)   | Fail boot smoke checks if deferred native modules load eagerly          | CI Node --import preload                                  |
| [change-check.ts](change-check.ts)                             | Require changesets for changed publishable workspace packages           | CI and pre-commit hook                                    |
| [check-agent-guidance.ts](check-agent-guidance.ts)             | Check tracked AGENTS.md line limits                                     | pnpm lint:agent-guidance                                  |
| [check-agent-skill-links.ts](check-agent-skill-links.ts)       | Validate repository skill discovery and Claude symlinks                 | pnpm lint:agent-skills                                    |
| [check-app-version-bump.ts](check-app-version-bump.ts)         | Check CDN app version lines against Core defaults                       | PR CI                                                     |
| [check-internal-packages.ts](check-internal-packages.ts)       | Validate internal package layout, exports and template conventions      | pnpm lint:packages                                        |
| [check-migration-integrity.ts](check-migration-integrity.ts)   | Reject invalid changes to released or incorrectly versioned migrations  | PR CI                                                     |
| [check-versioning-ignore.ts](check-versioning-ignore.ts)       | Check workspace versioning exclusions and externally versioned packages | pnpm lint:versioning                                      |
| [compare-image-report.ts](compare-image-report.ts)             | Compare production image file/size reports for CI summaries             | Image-report CI step                                      |
| [e2e-shards.ts](e2e-shards.ts)                                 | Plan browser-test shards and update recorded execution timings          | Browser-test CI: plan / record; sparse checkout supported |
| [nx-set-shas.ts](nx-set-shas.ts)                               | Select affected CI commit ranges from successful workflow history       | CI job setup                                              |
| [summarize-admin-acceptance.ts](summarize-admin-acceptance.ts) | Render Admin acceptance-test results into a CI summary                  | Acceptance CI after test shards                           |
| [typescript-inventory.ts](typescript-inventory.ts)             | Measure tracked JS/TS adoption, dependencies and historical counts      | pnpm inventory:typescript; TypeScript inventory workflow  |

### Build support — build/

Cross-workspace asset assembly, build-cache inputs and post-build artifacts.
Ghost-owned browser asset builds stay in [ghost/scripts](../../ghost/scripts/README.md).

| Current file                                               | Purpose                                                      | Caller                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| [assemble-admin-assets.ts](assemble-admin-assets.ts)       | Assemble Admin and isolated editor-renderer assets for Ghost | Admin build / app-local pnpm assemble:assets  |
| [hash-vite-env.ts](hash-vite-env.ts)                       | Hash Vite environment files into the build cache input       | Admin Nx runtime input --directory=apps/admin |
| [upload-sentry-sourcemaps.ts](upload-sentry-sourcemaps.ts) | Upload tagged bundle source maps after the build             | Post-build CI upload with release identifier  |

#### Admin asset assembly

`assemble-admin-assets.ts` copies the built Admin into Core and the isolated
Koenig embed renderer beside it. Admin's build invokes it after Vite;
`pnpm assemble:assets` in the Admin workspace can rerun assembly from existing
outputs. The renderer stays outside Admin's assets, with normalized permissions
for Nx caches.

### Versioning and publishing — release/

Publishing policy, version selection and release preparation. The publishing
manifest is release-owned data, shared with validation through `lib/publish-manifest.ts`.

| Current file                                       | Purpose                                                                | Caller                                                                 |
| -------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [build-publish-matrix.ts](build-publish-matrix.ts) | Select affected continuous-publishing packages and CDN purge paths     | CI setup: `node tools/scripts/build-publish-matrix.ts <affected-json>` |
| [compare-published.ts](compare-published.ts)       | Compare locally packed output with the live registry version           | Continuous-publishing CI gate                                          |
| [generate-changeset.ts](generate-changeset.ts)     | Create changesets for automated dependency updates                     | Renovate post-upgrade task                                             |
| [next-version.ts](next-version.ts)                 | Compute the next continuous-publishing version from registry state     | Publishing CI; --latest prints the comparison version                  |
| [publish-packages.ts](publish-packages.ts)         | Publish eligible workspace packages in dependency order                | Tagged-release / manual publishing workflow                            |
| [release-apps.ts](release-apps.ts)                 | Prepare intentional CDN-app minor/major releases and matching defaults | App-local pnpm ship                                                    |
| [release.ts](release.ts)                           | Prepare Ghost and package release versions, commits and tags           | pnpm release; release workflow                                         |

### Root setup and maintenance

Stable setup and repair entrypoints, including commands used before dependencies
exist. Shared development environment machinery also serves Nx, database aliases
and gx; it is not another contributor command family.

| Current file                                             | Purpose                                                                         | Caller                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [clean.ts](clean.ts)                                     | Repair a broken checkout by clearing dependencies, Nx state and build artifacts | pnpm fix; plain Node entrypoint before reinstall               |
| [dev-infra-up.ts](dev-infra-up.ts)                       | Start shared Compose services and provision the checkout database               | Nx development-infrastructure prerequisite                     |
| [enforce-package-manager.ts](enforce-package-manager.ts) | Require pnpm without needing installed dependencies                             | Root preinstall; selectively copied by development Dockerfiles |
| [format.ts](format.ts)                                   | Run the repository formatter and stabilize its output                           | pnpm format; pre-commit hook                                   |
| [ghost-dev-env.ts](ghost-dev-env.ts)                     | Prepare checkout configuration, theme submodules and development assets         | Nx setup prerequisite; Stripe wrapper                          |
| [init-submodules.sh](init-submodules.sh)                 | Initialize theme submodules, reusing local repositories in worktrees            | pnpm bootstrap; direct Bash helper                             |
| [with-ghost-dev-env.ts](with-ghost-dev-env.ts)           | Run commands with shared checkout and Compose environment settings              | Nx dev tasks, database aliases, analytics tasks and gx         |

## Shared support and tests

`lib/` contains repository paths, Git/workspace queries, JSON/process helpers,
publishing policy, package-template tokens and shared Compose/environment setup.
Keep helpers shared by CI, releases or gx here; do not force gx to duplicate them.
Tests and temporary-workspace helpers live in `test/`. Some tests verify
cross-workspace build, lint, packaging and CI contracts; they are repository
validation, even when the implementation they exercise lives elsewhere.

Private helpers such as Admin asset assembly, boot-module checks, PR-base
resolution, release-note generation and inventory types follow their owning
group when entrypoints move. `lib/release-notes.ts` is also a direct workflow
entrypoint, so its path is a caller contract rather than just an internal import.

## Language and adding a script

New executable automation uses TypeScript ESM and `node:util`'s `parseArgs`.
Declare dependencies in this workspace and prefer Node built-ins. Keep source
runnable with the repository's pinned Node version and check types separately.

The current exceptions are deliberate: `eslint.config.mjs` is JavaScript
configuration; `lib/service-dependency-resolver.mjs` is a JavaScript loader hook
for Dependency Cruiser; `init-submodules.sh` is a Bash bootstrap helper. Do not
add another JavaScript command by copying those exceptions.

Export testable logic and guard executable-only work where appropriate; see
`build-publish-matrix.ts`. Its `import.meta.main` guard uses the Node version
pinned by the repository. This workspace's tests use `node --test`, not the root
Vitest watcher.

```sh
pnpm --filter @internal/scripts lint
pnpm --filter @internal/scripts test
```

Tests that inspect other workspaces' configuration need matching Nx inputs in
`package.json`. Keep those contracts updated when changing CI filters, Admin
inputs, lint policy or shared configuration.

## Bootstrap and checkout contracts

`enforce-package-manager.ts` runs as `preinstall` before `node_modules` exists.
It must stay dependency-free and runnable by plain Node on a literal path. The
development Dockerfiles copy it independently. `clean.ts` repairs missing or
corrupted dependencies and must not acquire installed dependencies either.

`with-ghost-dev-env.ts` is shared by Nx development tasks, database aliases,
analytics and gx. Keep that environment setup independent of the CLI framework.

The isolated `.github/scripts/i18n-review` workflow intentionally keeps its own
package, lockfile and sparse-checkout install. Its location is a CI trust/install
boundary; see [its README](../../.github/scripts/i18n-review/README.md).

## Service dependency audit

`pnpm audit:services` uses Dependency Cruiser's native reports. Pass
`--output-type markdown` or `--output-type json` for saved output;
`pnpm --silent audit:services:summary` uses local `jq` to summarise implementation
violations. Rules and the allowlist live in `.dependency-cruiser.cjs`; the
[services guide](../../ghost/core/server/services/README.md#dependency-boundaries)
defines their meaning. The resolver adapter in `lib/` supports that analysis;
it does not implement a separate service CLI.

## TypeScript inventory

`pnpm inventory:typescript --output /tmp/ghost-typescript` writes an adoption and
dependency report. See the [inventory reference](../../docs/reference/typescript-inventory.md)
for counting rules, schema, difficulty heuristics, CI publication and historical
comparisons. Keep its implementation in automation; a contributor CLI wrapper
is optional.
