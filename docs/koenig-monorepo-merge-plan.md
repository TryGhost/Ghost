# Plan: Merge Koenig into Ghost (July 2026)

Supersedes the unmerged July 2025 attempt, which predated the Yarn→pnpm
switch, the Nx-affected CI restructure, and the `pnpm deploy`-based release
packaging. Verified against both repos as of 2026-07-07 (Ghost @ 05df703819,
Koenig @ 84bff4510).

## Context

Move all **13** Koenig packages (`TryGhost/Koenig packages/*`) into
`TryGhost/Ghost` under a top-level `koenig/` directory, preserving full git
history so `git log`, `git blame`, and `git bisect` work at the new paths.

Current packages (the old plan said 17 — `html-to-mobiledoc`,
`kg-parser-plugins`, `kg-mobiledoc-html-renderer`, and one other have since
been deleted):

kg-card-factory, kg-clean-basic-html, kg-converters, kg-default-cards,
kg-default-nodes, kg-default-transforms, kg-html-to-lexical,
kg-lexical-html-renderer, kg-markdown-html-renderer, kg-simplemde,
kg-unsplash-selector, kg-utils, koenig-lexical

### Requirements

1. Full git history preserved at the new paths.
2. **Hard requirement:** local development must not depend on npm-published
   Koenig packages. Same for CI.
3. Production may consume published versions only if publishing is fully
   automated (no "assumed but unpublished" version skew possible).

### Key facts that reshape the old plan

- **Requirement 3 is already solved by Ghost's release packaging — npm isn't
  needed for production at all.** `ghost/core/scripts/pack.js` builds the
  release artifact with `pnpm deploy --config.inject-workspace-packages=true`:
  every `workspace:*` dependency of ghost/core becomes a `file:` ref and is
  repacked as a component tarball inside the Ghost archive (this is how
  `@tryghost/i18n` and `@tryghost/parse-email-address` ship today). Once the
  kg-* packages are workspace deps, they ride along automatically. The same
  tarball is what `publish_ghost` pushes to npm. Version skew is structurally
  impossible.
- **`ghost/admin` no longer loads koenig-lexical from a CDN.** Its ember build
  copies `node_modules/@tryghost/koenig-lexical/dist/koenig-lexical.umd.js`
  into admin assets (`ember-cli-build.js:287`), and the built admin ships
  inside the Ghost tarball. So the editor is bundled at build time, not
  resolved at install time. Root `package.json` already has `dev:lexical`
  (EDITOR_URL) for live-editor dev against a local build.
- **Ghost already has automated npm publish machinery** —
  `publish_public_apps` in ci.yml + `compute-next-app-version.js`: npm is the
  source of truth for the patch number, package.json pins the major.minor
  line, OIDC auth, per-package concurrency. Koenig publishing reuses these
  mechanics but triggers on Ghost release tags rather than per main-merge
  (see Step 6) — replacing the old plan's bespoke `ship-koenig.js` /
  `publish-koenig.js`. Lerna and `yarn ship` die entirely.
- **Ghost CI is Nx-affected-driven.** `job_unit-tests` runs every affected
  project with a `test:unit` target; `job_apps_acceptance-tests` runs a matrix
  of affected projects with a `test:acceptance` target (currently filtered to
  `apps/*`). No bespoke `job_koenig_tests` is needed — just conform the
  package scripts and widen two filters.
- **New consumers since the old plan:** `apps/posts` and
  `apps/admin-x-framework` now also depend on `@tryghost/koenig-lexical`
  (via `catalog:`), alongside ghost/core, ghost/admin, apps/admin, and
  apps/admin-x-settings.
- **Ghost's workspace has supply-chain policies** (`catalogMode: strict`,
  `minimumReleaseAge: 4320`, `blockExoticSubdeps`, `strictDepBuilds`) and pnpm
  strict node_modules linking. The Koenig packages come from a Yarn v1
  hoisted world — expect phantom-dependency and catalog-normalization work.

---

## Step 1 — Rewrite Koenig history with `git filter-repo`

```bash
git clone --no-local Koenig Koenig-filtered
cd Koenig-filtered
git filter-repo \
  --path packages/ \
  --path-rename packages/:koenig/ \
  --message-callback '
    import re
    return re.sub(br"(^|[\s(])#(\d+)", br"\1TryGhost/Koenig#\2", message)
  '
git tag -l | xargs -r git tag -d   # ~2k lerna tags must not leak into Ghost
```

Changes from v1:

- `--path packages/` imports **only** package history. Koenig root files
  (lerna.json, workflows, yarn.lock, CNAME, …) never enter the merge, so
  v1's Step 2 conflict-resolution dance (`--ours` on every root file, then
  `git rm` leaked files) disappears entirely.
- `--message-callback` rewrites `#123` issue/PR references to
  `TryGhost/Koenig#123` so GitHub doesn't link them to unrelated Ghost
  PRs/issues after the merge. (Same practice as prior TryGhost repo merges.)
- Delete the lerna release tags in the filtered clone — `git fetch` would
  otherwise auto-follow thousands of `@tryghost/*@x.y.z` tags into Ghost.

## Step 2 — Merge into Ghost

```bash
cd Ghost
git remote add koenig-filtered /path/to/Koenig-filtered
git fetch --no-tags koenig-filtered main
git merge koenig-filtered/main --allow-unrelated-histories
```

There should be **no conflicts** now (nothing outside `koenig/` comes over).

**Process constraint the old plan missed:** this must land as a true merge
commit. Ghost PRs are squash-merged, which would flatten the imported history.
Landing it requires either a direct push to main by an admin (branch
protection temporarily relaxed) or temporarily enabling merge commits for one
PR. Precedent: the 2022 Admin→Ghost monorepo merge. Coordinate a short freeze
on the Koenig repo: land/close outstanding Koenig PRs, do the filter-repo run
from the frozen SHA, merge, then archive.

Verify: `git log --follow koenig/koenig-lexical/package.json` shows full
Koenig history; `git blame koenig/kg-utils/lib/*.js` shows original authors.

## Step 3 — Workspace + Nx integration

**`pnpm-workspace.yaml`:**

- Add `- 'koenig/*'` to `packages:`.
- Remove `@tryghost/kg-clean-basic-html`, `@tryghost/kg-converters`,
  `@tryghost/koenig-lexical` from the catalog (they become workspace
  packages).
- Add catalog entries for any shared external deps the koenig packages bring
  (see Step 4).

Nx discovers the new projects automatically from the workspace globs; project
names = package names. Existing `targetDefaults` (`build` dependsOn `^build`,
etc.) give us build ordering: koenig-lexical's dist is built before
ghost/admin imports it, kg-default-nodes before kg-default-transforms, etc.
Verify with `pnpm nx graph`.

**Root `package.json`:** keep `dev:lexical` as-is (it already points at the
built editor assets); optionally add `dev:koenig` →
`pnpm nx run @tryghost/koenig-lexical:dev` for standalone editor dev with
EDITOR_URL pointing at the Vite dev server. Check the docker-compose dev
setup (`ghost-monorepo:docker:dev`) mounts `koenig/` like it does `apps/`.

## Step 4 — Convert dependencies to workspace resolution

**Ghost consumers → `workspace:*`** (replacing `catalog:` or exact pins):

| File | Packages |
|------|----------|
| `ghost/core/package.json` | kg-card-factory, kg-clean-basic-html, kg-converters, kg-default-cards, kg-default-nodes, kg-html-to-lexical, kg-lexical-html-renderer, kg-markdown-html-renderer |
| `ghost/admin/package.json` | kg-clean-basic-html, kg-converters, koenig-lexical |
| `apps/admin/package.json` | kg-unsplash-selector, koenig-lexical |
| `apps/admin-x-settings/package.json` | kg-unsplash-selector |
| `apps/posts/package.json` | koenig-lexical |
| `apps/admin-x-framework/package.json` | koenig-lexical |

**Koenig inter-package deps → `workspace:~`** (not `workspace:*`). Current
graph (regenerated 2026-07):

- koenig-lexical → kg-clean-basic-html, kg-converters, kg-default-nodes,
  kg-default-transforms, kg-markdown-html-renderer, kg-simplemde,
  kg-unsplash-selector
- kg-default-cards → kg-markdown-html-renderer, kg-utils
- kg-default-nodes → kg-clean-basic-html, kg-markdown-html-renderer
- kg-default-transforms → kg-default-nodes
- kg-html-to-lexical → kg-default-nodes, kg-default-transforms
- kg-lexical-html-renderer → kg-default-nodes, kg-default-transforms
- kg-markdown-html-renderer → kg-utils

Why `workspace:~`: under the auto-publish model (Step 6) the patch digit in
package.json goes stale by design. `pnpm publish` rewrites `workspace:~` to
`~x.y.z`, so published packages tolerate the stale patch; `workspace:*` would
pin exact stale versions in the published artifacts.

**Yarn→pnpm normalization (new; the old plan missed this):**

- Phantom dependencies: pnpm's strict linking will break any koenig package
  importing something it doesn't declare (Yarn v1 hoisting hid this). Fix by
  declaring deps as `pnpm install` + tests surface them.
- Catalog normalization: dedupe shared external deps (react, react-dom,
  lexical/@lexical/*, @playwright/test, vitest, eslint toolchain, tailwind…)
  through the catalog where Ghost already has entries; the workspace runs
  `catalogMode: strict`, so expect friction until specs are aligned. Koenig
  pins `lexical` 0.13.1 — keep that pinned (possibly as a named catalog) and
  don't try to align it with anything else during the migration.
- `minimumReleaseAge: 4320` applies to lockfile-new registry deps — Koenig's
  pins are old, so this should be a non-issue, but expect it if bumping
  anything during the merge.
- Koenig root devDeps (lerna, husky, lint-staged) are dropped; its eslint
  tooling is already the same family Ghost uses (`eslint-plugin-ghost`).

Then `pnpm install` to regenerate the lockfile and `pnpm nx run-many -t build`
to shake out ordering/phantom issues.

## Step 5 — CI: conform to the affected-projects machinery

No new test job (the old plan's `job_koenig_tests` is obsolete). Instead:

- **Unit tests:** ensure every koenig package exposes `test:unit`
  (kg-card-factory, kg-clean-basic-html, kg-default-cards,
  kg-markdown-html-renderer, kg-utils currently only have `test`;
  kg-simplemde has no scripts — leave it, it's vendored/prebuilt). They then
  flow into `job_unit-tests` via
  `nx show projects --withTarget test:unit` automatically.
- **Playwright suites:** rename koenig-lexical's `test:e2e` to
  `test:acceptance` (kg-unsplash-selector already has `test:acceptance`), and
  select the `job_apps_acceptance-tests` matrix by an Nx **`playwright` tag**
  (set via `nx.tags` in each acceptance-suite package.json) instead of the
  current directory glob `--projects 'apps/*'` — packages opt in by tagging
  themselves, so the matrix isn't coupled to workspace layout. Check
  `job_apps_acceptance-tests` covers koenig's needs: Playwright browser
  install/cache exists there. (MS core fonts turned out to be unnecessary —
  the visual-regression assertions they supported no longer exist in the
  suite; no `toHaveScreenshot`/`toMatchSnapshot` usages remain.) Keep the
  playwright-report artifact upload, resolving each project's root via
  `nx show project` since suites live in both `apps/*` and `koenig/*`.
- **Path filters:** confirm the `shared`/`e2e`/`any-code` path filters in
  `job_setup` treat `koenig/**` as code (Nx-affected does the per-project
  work, but the workflow-level filters gate whole lanes like run_e2e).
- **`job_app_version_bump_check`:** decide whether koenig packages need the
  same guard once they're in the auto-publish matrix.
- Codecov: koenig packages' coverage flows through the same upload steps as
  other projects; add flags only if the team wants them split.

## Step 6 — Publishing: piggyback on the Ghost release

npm publishing is **only for external consumers** (gscan, Zapier integrations,
third parties using kg-lexical-html-renderer etc.) — Ghost itself never
installs these from npm again (dev/CI: workspace links; production: component
tarballs inside the Ghost archive, see Context). Per-main-merge publishing
(the public-apps model) would be needless churn for packages that already
ship inside the Ghost build, so instead publish **only when Ghost itself is
released**, i.e. in the existing tag lane:

- **New job `publish_koenig_packages`** in ci.yml, in the release lane:
  `needs: [publish_ghost]`, gated on `startsWith(github.ref, 'refs/tags/v')`
  — packages only reach npm when the Ghost release that contains them
  actually shipped. Every published kg-* version therefore corresponds to
  released Ghost content by construction.
- **Changed-only detection via git, not Nx-affected:** checkout with
  `fetch-depth: 0`, find the previous release tag with
  `git describe --tags --abbrev=0 --match 'v*' ${GITHUB_REF_NAME}^`, and for
  each koenig package publish only if
  `git diff --quiet $PREV $GITHUB_REF_NAME -- koenig/<pkg>/` reports changes.
  First release after the merge has no prior tag containing `koenig/` — all
  13 publish once, which is the correct baseline. This also does the right
  thing for patch releases cut from release branches (diff is against the
  previous tag on that branch's history).
- **Versioning:** same npm-source-of-truth model as public apps, reusing
  `compute-next-app-version.js`: package.json pins the major.minor line,
  the job computes next patch above what's on npm, `npm pkg set version`
  before build. Humans bump major/minor in package.json when warranted.
- **One sequential job, not a matrix:** 13 small packages; loop over them
  (dependency-topological order for tidiness, though `workspace:~` → `~x.y.z`
  rewriting makes order non-critical). Add a `concurrency` group
  (`publish-koenig`, `cancel-in-progress: false`) so two tags cut close
  together can't race on patch numbers. OIDC auth (`id-token: write`) as
  today; build via `pnpm nx build` so `^build` deps are satisfied.
- The koenig packages do **not** join `public-apps.json` /
  `publish_public_apps` (that flow stays CDN-app-specific), and
  `job_app_version_bump_check` doesn't apply to them.
- Sanity-check `ghost/core/scripts/pack.js` output after the merge: kg-*
  should appear as `file:components/*.tgz` deps in the deploy dir, and the
  validation step should pass. (pack.js's comment says component tarballs are
  for *private* packages — the mechanism keys off `file:` refs, which
  injected workspace packages all get, but verify none of the koenig packages'
  `files`/`prepublishOnly` assumptions break under `pnpm pack`.)

Trade-off to be aware of: external consumers get fixes at Ghost's release
cadence (roughly weekly minors plus branch patches), not per-merge. If a
kg-* fix is ever needed on npm urgently, a `workflow_dispatch` input on the
same job (package name allowlist) covers the escape hatch.

## Step 7 — Koenig demo (GitHub Pages)

Still needed, unchanged in substance from v1: a workflow to build
`koenig-lexical`'s demo and deploy to Pages on main pushes touching
`koenig/**`. The CNAME/DNS moves from the Koenig repo. (The old repo's
pages.yml/CNAME don't come over thanks to the `--path packages/` filter.)

## Step 8 — Cleanup & decommission

- `.gitignore`: `koenig/*/dist`, `koenig/*/build`,
  `koenig/koenig-lexical/playwright-report/`, `koenig/koenig-lexical/test-results/`.
- Update AGENTS.md / CLAUDE.md / CONTEXT-MAP.md for the `koenig/` directory
  and dev workflow (`dev:lexical`, standalone editor dev).
- Renovate: Ghost's config stops seeing kg-*/koenig-lexical as external deps
  once catalog entries are removed — check for any explicit rules; Koenig's
  own renovate setup dies with the repo.
- Knip/sonar/eslint root configs: extend to `koenig/` where they enumerate
  directories (check `knip.json`, root eslint config).
- Archive `TryGhost/Koenig` with a pointer to `Ghost/koenig/`; transfer any
  open issues worth keeping.

## Verification checklist

- [ ] `git log --follow koenig/koenig-lexical/package.json` shows full Koenig history
- [ ] `git blame` on a koenig file shows original authors/dates
- [ ] No `@tryghost/*@x.y.z` tags from Koenig appear in Ghost (`git tag -l`)
- [ ] `pnpm install` resolves all koenig packages from the workspace (no registry fetch for @tryghost/kg-*)
- [ ] `pnpm nx run-many -t build` succeeds (build ordering via ^build)
- [ ] `pnpm nx run-many -t test:unit -p '@tryghost/kg-*,@tryghost/koenig-lexical'` passes under pnpm linking
- [ ] koenig-lexical Playwright suite passes in `job_apps_acceptance-tests` (fonts installed)
- [ ] `ghost/admin` build picks up workspace koenig-lexical UMD; `dev:lexical` works
- [ ] `pnpm --filter ghost archive` produces a tarball where kg-* are `file:components/*.tgz` and its pack.js validation passes
- [ ] Fresh `ghost install --archive` (or Docker prod build) boots with zero registry installs of @tryghost/kg-*
- [ ] Publish dry-run at a test tag: only packages with `git diff` changes vs the previous release tag are selected; computed versions are next-patch over npm; nothing publishes if `publish_ghost` fails
