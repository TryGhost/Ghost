# pnpm catalog migration — findings and deferral

This document captures what was learned from the aborted attempt in PR #27533
to move a few `@tryghost/*` pins onto `pnpm-workspace.yaml`'s `catalog:` so
future framework bumps become single-line edits. The migration surfaced two
separate leak points in the repo's publishing paths and was deferred pending
a proper pass over the publishing pipeline.

## What was attempted

PR #27533 added three entries to `pnpm-workspace.yaml`'s `catalog:` block and
replaced every workspace pin (and the matching `pnpm.overrides` entries) with
`catalog:`:

| Package | Previous locations | Target |
|---|---|---|
| `@tryghost/debug` | 7 workspaces (`ghost/core`, `ghost/i18n`, `e2e`, `apps/portal`, `apps/comments-ui`, `apps/signup-form`, `apps/sodo-search`) | `catalog:` |
| `@tryghost/errors` | `ghost/core` pin + root `pnpm.overrides` | `catalog:` |
| `@tryghost/logging` | `ghost/core`, `e2e`, + root `pnpm.overrides` | `catalog:` |

All `pnpm install` / test / lint paths inside the workspace worked. The break
was in what leaves the workspace.

## Why catalog is a bigger change than it looks

`catalog:` is a pnpm-workspace-only protocol. Any tool that consumes a
`package.json` from outside the workspace and doesn't run through pnpm's
resolver will choke on it with
`ERR_PNPM_SPEC_NOT_SUPPORTED_BY_ANY_RESOLVER`. Ghost ships `package.json`
files to exactly those kinds of tools in two places.

### Leak 1 — Ghost-CLI tarball (`ghost/core/scripts/pack.js`)

`pnpm archive` (run by Ghost-CLI's install flow and by release) builds a
standalone tarball of ghost/core plus its private workspace packages. Two
sub-leaks surfaced:

1. **Component tarballs.** pack.js calls `npm pack` on each private workspace
   package (e.g. `@tryghost/i18n`, `@tryghost/parse-email-address`) to turn
   them into file-based tarballs inside the main artifact. `npm pack` copies
   `package.json` verbatim, so `"@tryghost/debug": "catalog:"` was preserved
   and crashed pnpm when Ghost-CLI ran `pnpm install --prod` against the
   extracted tarball.
2. **Root `pnpm.overrides`** merged into the packaged `package.json` as a
   Ghost-CLI compatibility shim. Any `catalog:` specifier in the root
   overrides (`@tryghost/errors`, `@tryghost/logging` after the migration)
   leaked straight through.

Fix applied on the aborted PR (see its pack.js diff) for reference:

- Swap `npm pack` → `pnpm pack` for component tarballs. `pnpm pack` (9+)
  substitutes both `workspace:` and `catalog:` to concrete versions the same
  way `pnpm publish` does.
- Read `pnpm-workspace.yaml` in pack.js and resolve `catalog:` to concrete
  versions before writing the merged overrides.

The fix is generic (it handles any catalog entry, not just the three in the
migration), so it's worth keeping as part of whatever future attempt is made.

### Leak 2 — public-app `npm publish` (`.github/workflows/ci.yml:1656`)

The `ci-release.yml` job publishes each public app to npm with:

```yaml
working-directory: ${{ matrix.package_path }}
run: npm publish --access public
```

`npm publish` (unlike `pnpm publish`) does **not** substitute `catalog:`
specifiers. That means the next `@tryghost/sodo-search`, `@tryghost/portal`,
`@tryghost/comments-ui`, or `@tryghost/signup-form` release would ship a
`package.json` on npm with `"@tryghost/debug": "catalog:"`, which would break
every consumer that installs these without a local pnpm workspace.

The `ship` / `preship` npm scripts in each app's `package.json` delegate to
`.github/scripts/release-apps.js`, which only commits a version bump — the
actual `npm publish` happens later in `ci-release.yml`. So the fix is
specifically in the CI workflow (or by rewriting the publish command to
`pnpm publish`), not in `release-apps.js`.

### Potentially more leak points

Not exhaustively audited during the PoC. Anywhere the repo pipes a
`package.json` to an external consumer is suspect. Likely candidates worth
checking before a second attempt:

- Docker builds (`Dockerfile*` under `ghost/core` and `e2e`).
- Any script that runs `npm pack` / tarball creation that isn't pack.js.
- Workflow jobs that copy package.json files to a container or temp dir and
  run `npm install` there.
- Theme / integration / published-SDK release paths I haven't seen.

## Why this was deferred

The original motivation was modest — collapse a Wave 4 diff from "eight
package.json edits" to "two catalog entries". That saves ~5 lines across the
remaining framework waves.

The cost, once both leaks are properly fixed, is:

- A new yaml-parsing step in `pack.js` with its own validation and error
  paths.
- A change to `ci-release.yml`'s publish command (probably `pnpm publish`
  with OIDC config adjustments — npm's OIDC workflow is not a drop-in with
  pnpm) or an explicit manifest-rewrite step before `npm publish`.
- An audit for other external-consumer leak points we haven't hit yet.

That's a standalone effort worth doing deliberately, not a side quest of the
framework-upgrade waves.

## Recommendation for a future PR

1. Start with a dedicated branch for catalog + publishing fixes. Do not
   couple it with a framework bump.
2. Land the `pack.js` fix first (it's self-contained and generic; also
   beneficial even without the catalog migration once anyone else adds
   `catalog:` anywhere).
3. Decide on the `ci-release.yml` strategy: either migrate publish to
   `pnpm publish --access public` (and reconcile OIDC + `.npmrc` expectations)
   or add an explicit catalog-resolution step that rewrites `package.json`
   before `npm publish` and restores it after.
4. Audit the other leak candidates listed above; fix or document each.
5. Only then add the `catalog:` entries and switch the workspace pins.

Until those are in place, keep `@tryghost/*` pinned explicitly in each
workspace as today. The duplication is manageable, and renovate's existing
grouping keeps the multi-workspace bumps arriving in a single PR.
