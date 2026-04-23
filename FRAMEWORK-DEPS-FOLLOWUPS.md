# Framework-deps follow-ups

Two structural issues the in-flight `@tryghost/framework` upgrade
campaign has surfaced but deliberately *not* resolved. Both deserve
their own PRs once the framework waves finish, because fixing them
properly changes the shape of the build or publish pipeline.

## 1. pnpm catalog migration is blocked by our publish paths

### What we tried

PR #27533 moved three `@tryghost/*` pins onto `pnpm-workspace.yaml`'s
`catalog:` block so future framework bumps would be one-line edits:

| Package | Previous locations | Target |
|---|---|---|
| `@tryghost/debug` | 7 workspaces (`ghost/core`, `ghost/i18n`, `e2e`, `apps/portal`, `apps/comments-ui`, `apps/signup-form`, `apps/sodo-search`) | `catalog:` |
| `@tryghost/errors` | `ghost/core` + root `pnpm.overrides` | `catalog:` |
| `@tryghost/logging` | `ghost/core`, `e2e`, + root `pnpm.overrides` | `catalog:` |

All inside-workspace paths (install, tests, lint) passed. The breakage
was only visible once the workspace packages crossed into external
consumers — which is when `catalog:` stops being understood.

### Two places `catalog:` leaks out

**Ghost-CLI tarball (`ghost/core/scripts/pack.js`).**
`pnpm archive` builds a standalone tarball of `ghost/core` plus its
private workspace packages (bundled as component tarballs). Two
sub-leaks:

1. pack.js runs `npm pack` on each workspace source dir for the
   component tarballs. `npm pack` copies `package.json` verbatim, so
   `"@tryghost/debug": "catalog:"` survives and crashes pnpm on
   extract with `ERR_PNPM_SPEC_NOT_SUPPORTED_BY_ANY_RESOLVER`. Fix:
   use `pnpm pack` (9+), which substitutes `workspace:` and
   `catalog:` the same way `pnpm publish` does.
2. The merged root `pnpm.overrides` written into the packaged
   `package.json` (a Ghost-CLI compatibility shim) still contained
   `catalog:` entries. Fix: resolve them in pack.js by reading
   `pnpm-workspace.yaml` before merging.

Both fixes are small and self-contained. They'd be a net positive
even without catalog adoption.

**Public-app `npm publish` (`.github/workflows/ci.yml:1656`).**
Each public app (`portal`, `comments-ui`, `sodo-search`, `signup-form`)
is published to npm with:

```yaml
working-directory: ${{ matrix.package_path }}
run: npm publish --access public
```

`npm publish` (unlike `pnpm publish`) does not substitute `catalog:`.
We actually hit this in production: the catalog PR merged, the next
main CI run picked it up, and four public-app tarballs shipped to
npm with `"@tryghost/debug": "catalog:"` baked in. Only the CDN-served
UMD bundle matters for real Ghost sites so the functional impact was
near-zero, but `npm install @tryghost/portal` is broken on those
versions. Post-mortem detail in PR #27535 (the revert).

Why CI didn't catch it: the `publish_packages` job is gated to
`push-to-main` only, because `id-token: write` OIDC permission must
never be exposed to PR-controlled code. The only validation of the
published shape is the publish itself.

### Other suspect paths (not audited)

Anywhere the repo hands a `package.json` to an external consumer is
a potential leak point. Haven't checked:

- `Dockerfile*` under `ghost/core` and `e2e`.
- Any other script that runs `npm pack` / tarball creation.
- Workflow jobs that copy package.json files to a container / temp
  dir and run `npm install`.
- Theme / integration / published-SDK release paths.

### How to attempt a catalog migration next time

1. Land the pack.js fix first (pnpm pack + catalog resolution in
   overrides merge). It's generic and beneficial even without
   catalog adoption.
2. Decide the `ci-release.yml` strategy: either move publish to
   `pnpm publish --access public` (and reconcile OIDC + `.npmrc`
   expectations — pnpm's OIDC story is not drop-in with npm's) or
   add an explicit manifest-rewrite step that resolves `catalog:`
   before `npm publish` and restores after.
3. Add a PR-time guard: run `pnpm pack --dry-run` for each published
   app and grep the packed `package.json` for `catalog:` / `workspace:` /
   `link:` specifiers. Would have caught the four broken publishes
   on PR #27533 instead of on npm.
4. Audit the other leak candidates above.
5. Only then switch workspace pins to `catalog:`.

Until all of that lands, keep multi-workspace `@tryghost/*` pins
explicit. Renovate's existing `matchPackageNames` grouping keeps
the bumps arriving as one PR, which is the main ergonomic benefit
catalog would have given us anyway.

## 2. `@tryghost/errors` is pinned to v1 in `pnpm.overrides`

### The state today

`package.json` has:

```json
"pnpm": {
  "overrides": {
    "@tryghost/errors": "^1.3.7",
    ...
  }
}
```

This forces the entire dependency tree to resolve `@tryghost/errors`
to the `1.x` line, regardless of what individual consumers request.

### Why the override exists

Two reasons — only one of them still holds.

**Historical: tree consolidation.** Without the override, five
copies of `@tryghost/errors` end up in `node_modules` (real numbers
from dropping the override on a Wave 4 draft):

- `@tryghost/errors@1.3.6` via `knex-migrator`
- `@tryghost/errors@1.3.13` via `@tryghost/api-framework`, `@tryghost/job-manager`, `@tryghost/mw-error-handler`, `@tryghost/nodemailer`, `@tryghost/request`, `@tryghost/validator`, `bookshelf-relations`
- `@tryghost/errors@2.2.1` via `@tryghost/admin-api-schema`, `@tryghost/image-transform`, `@tryghost/limit-service`
- `@tryghost/errors@3.0.3` via `gscan@5.4.3`
- `@tryghost/errors@3.1.0` via `@tryghost/bookshelf-plugins@2.0.3` and any direct pin

That split breaks `instanceof errors.ValidationError` across test
boundaries — the class ghost/core imports isn't the class validator
or bookshelf-plugins throws. Five Ghost unit tests fail on this
pattern when the override is dropped:

```
Unit: models/MemberCreatedEvent   throws error for invalid attribution_type
Unit: models/MemberCreatedEvent   throws if source is invalid
Unit: models/MemberSubscribeEvent throws if source is invalid
Unit: models/outbox               rejects invalid status values
Unit: models/SubscriptionCreatedEvent throws error for invalid attribution_type
```

**Wanted-to-be-reason: move to errors@3.** Every tree reaches a
single modern copy. But `@tryghost/errors@3` is **Node-only** —
it replaced the `uuid` npm package with `import { randomUUID } from 'crypto'`.
`apps/admin-x-settings` imports `@tryghost/limit-service` at runtime
(`src/hooks/use-limiter.tsx`), and limit-service's `lib/LimitService.js`
requires `@tryghost/errors`. Under `errors@3`, Vite fails to bundle
admin-x-settings for the browser with
`[commonjs--resolver] Failed to resolve entry for package "crypto"`.

So the override to v1 isn't redundant. It's solving a real problem:
we can't consolidate the tree on `errors@3` without breaking the
admin-x-settings browser build.

### What the real fix looks like

The cleanest answer is not to patch `@tryghost/errors` to be
isomorphic (Node's `crypto` is the right module to use server-side;
we shouldn't polyfill it). The smell is upstream:

1. **`@tryghost/limit-service` shouldn't drag `@tryghost/errors`
   into a browser bundle.** It uses `IncorrectUsageError` in two
   places. That's replaceable with a plain `class extends Error`
   with a known `name`, or the package could be split so the
   browser-consumable bits have no error dep.
2. **`apps/admin-x-settings`'s usage of `@tryghost/limit-service` is
   worth re-examining.** It's dynamic-imported in `use-limiter.tsx`
   at runtime; check whether the same behaviour can come from a
   thinner client-side shim instead of pulling a Node-shaped package
   into the browser.

Either fix would let us drop the override, move ghost/core to
`errors@3`, and remove the class-identity risk.

### Status

Deferred. The `errors` bump was rolled back in Wave 4 (the PR ships
`logging@4.1.0` alone) so the framework-upgrade campaign can keep
moving. Ghost/core's `errors` will bump when this override can safely
target `3.x`.

Waves that transitively pull `errors@3` (e.g. `@tryghost/zip@3` in
Wave 2) are unaffected because the override forces them back to v1;
none of them exercise v3-specific API surface at runtime. Wave 7's
`@tryghost/request` → v3 and `@tryghost/nodemailer` → v2 and Wave 8's
`@tryghost/api-framework` → v3 will need this override resolved (or
their own per-package-path overrides) because they depend on
`errors@3` internally and share the tree with admin-x-settings.
