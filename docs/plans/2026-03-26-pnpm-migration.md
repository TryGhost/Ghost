# PNPM Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Hard-cut the monorepo from Yarn v1 to pnpm, keep the legacy Ember admin working without `shamefully-hoist`, and update repo tooling, CI, Docker, and packaging to the new package manager.

**Architecture:** The migration starts at the root workspace and infrastructure layers, then fixes pnpm-incompatible assumptions in `ghost/admin`, and finally adds only the smallest compatibility settings needed for unresolved third-party Ember issues. The implementation should favor explicit dependency declarations and resolved asset paths over hoisting, using `packageExtensions` and targeted hoist rules only as a measured fallback.

**Tech Stack:** pnpm workspaces, Nx, Node.js 22, GitHub Actions, Docker, Ember CLI 3.24, React/Vite apps, npm pack.

---

### Task 1: Create pnpm workspace and root package-manager config

**Files:**
- Create: `docs/plans/2026-03-26-pnpm-migration-design.md`
- Create: `docs/plans/2026-03-26-pnpm-migration.md`
- Create: `pnpm-workspace.yaml`
- Modify: `package.json`

**Step 1: Add pnpm workspace file**

Create `pnpm-workspace.yaml` with:

```yaml
packages:
  - ghost/*
  - apps/*
  - e2e
```

**Step 2: Update root package manager metadata**

Add a `packageManager` field to `/Users/jonatan/.codex/worktrees/393f/Monorepo/package.json`:

```json
"packageManager": "pnpm@<chosen-version>"
```

Use the exact version installed for the migration.

**Step 3: Convert root workspace commands**

Update root scripts from Yarn syntax to pnpm syntax. Convert examples such as:

```json
"knex-migrator": "pnpm --filter ghost run knex-migrator",
"test:e2e": "pnpm --filter @tryghost/e2e test",
"test:e2e:analytics": "pnpm --filter @tryghost/e2e test:analytics",
"test:e2e:all": "pnpm --filter @tryghost/e2e test:all"
```

Also convert chained commands like `yarn main:monorepo && yarn main:submodules` to pnpm equivalents.

**Step 4: Add initial pnpm config placeholder**

If needed, add `.npmrc` with only the minimum migration settings, for example:

```ini
auto-install-peers=true
strict-peer-dependencies=false
```

Do not add hoist rules yet unless a real install/build failure requires them.

**Step 5: Commit**

```bash
git add /Users/jonatan/.codex/worktrees/393f/Monorepo/package.json /Users/jonatan/.codex/worktrees/393f/Monorepo/pnpm-workspace.yaml /Users/jonatan/.codex/worktrees/393f/Monorepo/.npmrc
git commit -m "chore: add pnpm workspace configuration"
```

### Task 2: Convert repository scripts and packaging assumptions

**Files:**
- Modify: `package.json`
- Modify: `ghost/core/package.json`
- Modify: `ghost/core/monobundle.js`
- Modify: `e2e/scripts/run-playwright-host.sh`
- Modify: `e2e/scripts/prepare-ci-e2e-job.sh`
- Modify: `e2e/README.md`

**Step 1: Update `ghost/core` scripts**

Convert Yarn-based script calls in `/Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/core/package.json` to pnpm equivalents. Replace examples like:

```json
"build:assets": "pnpm build:assets:css && pnpm build:assets:js",
"pretest": "pnpm build:assets",
"test": "pnpm test:unit"
```

Apply the same change to all `test:*`, `lint:*`, and helper scripts that currently shell out to Yarn.

**Step 2: Update standalone packaging lockfile copy**

Replace `cp ../../yarn.lock package/` in `/Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/core/package.json` with:

```json
"pack:standalone": "rm -rf package ghost-*.tgz && npm pack && tar -xzf ghost-*.tgz && cp ../../pnpm-lock.yaml package/ && rm ghost-*.tgz"
```

**Step 3: Update `monobundle.js` copied files**

Replace:

```js
'yarn.lock'
```

with:

```js
'pnpm-lock.yaml'
```

in `/Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/core/monobundle.js`.

**Step 4: Update e2e helper scripts**

Convert `yarn workspace ...` calls to `pnpm --filter ...` in:

- `/Users/jonatan/.codex/worktrees/393f/Monorepo/e2e/scripts/run-playwright-host.sh`
- `/Users/jonatan/.codex/worktrees/393f/Monorepo/e2e/scripts/prepare-ci-e2e-job.sh`

**Step 5: Run targeted smoke checks**

Run:

```bash
pnpm --filter ghost run pack:standalone --help
pnpm --filter @tryghost/e2e test --help
```

Expected: command parsing succeeds without Yarn-specific errors.

**Step 6: Commit**

```bash
git add /Users/jonatan/.codex/worktrees/393f/Monorepo/package.json /Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/core/package.json /Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/core/monobundle.js /Users/jonatan/.codex/worktrees/393f/Monorepo/e2e/scripts/run-playwright-host.sh /Users/jonatan/.codex/worktrees/393f/Monorepo/e2e/scripts/prepare-ci-e2e-job.sh
git commit -m "chore: replace yarn workspace commands in scripts"
```

### Task 3: Update dependency installation for CI

**Files:**
- Modify: `.github/scripts/install-deps.sh`
- Modify: `.github/workflows/ci.yml`

**Step 1: Convert install script to pnpm**

Update `/Users/jonatan/.codex/worktrees/393f/Monorepo/.github/scripts/install-deps.sh` so the install function becomes:

```bash
install_dependencies() {
    pnpm install --frozen-lockfile --prefer-offline --ignore-scripts "$@"
}
```

**Step 2: Keep sqlite3 recovery explicit**

Retain the sqlite3 post-install fallback, but verify its path assumptions against pnpm's workspace layout. If `node_modules/sqlite3` remains valid in the repo root, keep it. If not, update the script to use:

```bash
pnpm exec node -p "require.resolve('sqlite3/package.json')"
```

to discover the installed package location before running `npm run install`.

**Step 3: Update CI lockfile tracking**

In `/Users/jonatan/.codex/worktrees/393f/Monorepo/.github/workflows/ci.yml`, replace every shared-input and cache-key reference to `yarn.lock` with `pnpm-lock.yaml`.

Update changed-path filters:

```yaml
- 'pnpm-lock.yaml'
```

Update hash computations:

```yaml
hashFiles('pnpm-lock.yaml')
```

**Step 4: Install pnpm in CI**

Add a pnpm setup step before dependency installation. Use a deterministic action or Corepack-based setup and ensure the version matches the root `packageManager`.

**Step 5: Convert CI commands**

Replace `yarn nx ...`, `yarn workspace ...`, and `yarn run ...` calls across the workflow with `pnpm ...`.

**Step 6: Commit**

```bash
git add /Users/jonatan/.codex/worktrees/393f/Monorepo/.github/scripts/install-deps.sh /Users/jonatan/.codex/worktrees/393f/Monorepo/.github/workflows/ci.yml
git commit -m "chore: migrate CI dependency installation to pnpm"
```

### Task 4: Update Docker development install flow

**Files:**
- Modify: `docker/development.entrypoint.sh`
- Modify: `docker/ghost-dev/Dockerfile`
- Modify: `compose.dev.yaml`

**Step 1: Switch lockfile hashing**

In `/Users/jonatan/.codex/worktrees/393f/Monorepo/docker/development.entrypoint.sh`, replace Yarn-specific comments, hash file paths, and lockfile references:

```bash
pnpm_lock_hash_file_path=".pnpmhash/pnpm-lock.yaml.md5"
calculated_hash=$(md5sum pnpm-lock.yaml | awk '{print $1}')
```

**Step 2: Switch runtime commands**

Replace:

```bash
yarn nx reset
```

with:

```bash
pnpm nx reset
```

**Step 3: Update Dockerfile copied files**

In `/Users/jonatan/.codex/worktrees/393f/Monorepo/docker/ghost-dev/Dockerfile`, replace:

```dockerfile
COPY package.json yarn.lock ./
```

with:

```dockerfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
```

Include any additional files needed for pnpm workspace installs.

**Step 4: Install pnpm in the image**

Add deterministic pnpm installation, preferably via Corepack:

```dockerfile
RUN corepack enable
```

Then replace the Yarn cache mount with a pnpm store cache mount if beneficial.

**Step 5: Update container default command**

Replace:

```dockerfile
CMD ["yarn", "dev"]
```

with:

```dockerfile
CMD ["pnpm", "dev"]
```

**Step 6: Build the dependency layer**

Run:

```bash
docker build -f docker/ghost-dev/Dockerfile .
```

Expected: dependency installation completes with pnpm and no missing workspace metadata.

**Step 7: Commit**

```bash
git add /Users/jonatan/.codex/worktrees/393f/Monorepo/docker/development.entrypoint.sh /Users/jonatan/.codex/worktrees/393f/Monorepo/docker/ghost-dev/Dockerfile /Users/jonatan/.codex/worktrees/393f/Monorepo/compose.dev.yaml
git commit -m "chore: migrate docker development flow to pnpm"
```

### Task 5: Fix pnpm-incompatible path assumptions in `ghost/admin`

**Files:**
- Modify: `ghost/admin/ember-cli-build.js`
- Modify: `ghost/admin/lib/asset-delivery/index.js`

**Step 1: Replace `node_modules/...` imports with resolved package paths**

In `/Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/admin/ember-cli-build.js`, replace statements like:

```js
app.import('node_modules/normalize.css/normalize.css');
app.import('node_modules/codemirror/lib/codemirror.css');
app.import('node_modules/google-caja-bower/html-css-sanitizer-bundle.js');
```

with a helper like:

```js
const path = require('path');

function packageAsset(specifier, relativePath = '') {
    const packageJsonPath = require.resolve(`${specifier}/package.json`);
    return path.join(path.dirname(packageJsonPath), relativePath);
}
```

and then:

```js
app.import(packageAsset('normalize.css', 'normalize.css'));
app.import(packageAsset('codemirror', 'lib/codemirror.css'));
app.import(packageAsset('google-caja-bower', 'html-css-sanitizer-bundle.js'));
```

Use package-specific resolution for GitHub-sourced packages that do not expose `package.json` predictably.

**Step 2: Verify asset-delivery dependencies**

In `/Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/admin/lib/asset-delivery/index.js`, keep `require.resolve()` usage, but ensure every imported package is declared by the owning package.

**Step 3: Run build to surface remaining layout problems**

Run:

```bash
pnpm nx run ghost-admin:build:dev
```

Expected: any remaining failures now point to missing dependencies rather than `node_modules` path assumptions.

**Step 4: Commit**

```bash
git add /Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/admin/ember-cli-build.js /Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/admin/lib/asset-delivery/index.js
git commit -m "fix: remove pnpm-hostile asset path assumptions in admin"
```

### Task 6: Make `ghost/admin` dependencies explicit

**Files:**
- Modify: `ghost/admin/package.json`
- Modify: `ghost/admin/lib/asset-delivery/package.json`
- Modify: `ghost/admin/lib/ember-power-calendar-moment/package.json`
- Modify: `ghost/admin/lib/ember-power-calendar-utils/package.json`

**Step 1: Add confirmed missing direct dependencies**

Add packages used directly by repository-owned code. Start with:

```json
"lodash": "4.17.21"
```

in the appropriate owning package, not just the root.

For `ghost/admin/lib/asset-delivery/package.json`, add explicit dependencies for packages required by addon code if the addon should own them:

```json
{
  "name": "asset-delivery",
  "keywords": ["ember-addon"],
  "dependencies": {
    "lodash": "4.17.21",
    "fs-extra": "11.3.0",
    "walk-sync": "3.0.0"
  }
}
```

Adjust ownership if Ember requires these on the parent app package instead.

**Step 2: Audit remaining missing imports**

Use an import scan and fix packages that are direct imports from repository-owned code but not declared in `ghost/admin` or local addon manifests.

**Step 3: Re-run admin build and tests**

Run:

```bash
pnpm nx run ghost-admin:build:dev
pnpm nx run ghost-admin:test
```

Expected: build succeeds; test failures, if any, should now be due to third-party addon peer/transitive issues rather than missing repository-owned deps.

**Step 4: Commit**

```bash
git add /Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/admin/package.json /Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/admin/lib/asset-delivery/package.json /Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/admin/lib/ember-power-calendar-moment/package.json /Users/jonatan/.codex/worktrees/393f/Monorepo/ghost/admin/lib/ember-power-calendar-utils/package.json
git commit -m "fix: declare admin dependencies required by pnpm"
```

### Task 7: Add targeted pnpm compatibility for third-party Ember issues

**Files:**
- Modify: `.npmrc`
- Modify: `package.json`

**Step 1: Add `packageExtensions` only for observed failures**

If install/build output shows third-party packages with missing peers or build deps, add entries under pnpm config in `/Users/jonatan/.codex/worktrees/393f/Monorepo/package.json`, for example:

```json
"pnpm": {
  "packageExtensions": {
    "some-ember-addon@*": {
      "dependencies": {
        "ember-cli-babel": "8.2.0"
      }
    }
  }
}
```

Only add packages that actually fail under pnpm.

**Step 2: Add targeted hoist rules only if still necessary**

If a package still fails due to visibility assumptions, add a short allowlist in `.npmrc`:

```ini
public-hoist-pattern[]=ember-*
public-hoist-pattern[]=@ember/*
```

Do not start with broad patterns. Narrow further if exact packages can be identified.

**Step 3: Re-run install and admin verification**

Run:

```bash
pnpm install
pnpm nx run ghost-admin:build:dev
pnpm nx run ghost-admin:test
```

Expected: pnpm completes without Yarn-era transitive dependency breakage.

**Step 4: Commit**

```bash
git add /Users/jonatan/.codex/worktrees/393f/Monorepo/.npmrc /Users/jonatan/.codex/worktrees/393f/Monorepo/package.json
git commit -m "chore: add targeted pnpm compatibility for legacy ember"
```

### Task 8: Generate lockfile and complete hard cutover verification

**Files:**
- Delete: `yarn.lock`
- Create: `pnpm-lock.yaml`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/README.md`
- Modify: package README files that document install or workspace commands

**Step 1: Generate pnpm lockfile**

Run:

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` is created and the workspace installs successfully.

**Step 2: Remove Yarn lockfile**

Delete:

```text
/Users/jonatan/.codex/worktrees/393f/Monorepo/yarn.lock
```

**Step 3: Update repository docs**

Replace root and package-level command examples from `yarn` to `pnpm` in the main developer-facing docs, starting with:

- `/Users/jonatan/.codex/worktrees/393f/Monorepo/README.md`
- `/Users/jonatan/.codex/worktrees/393f/Monorepo/AGENTS.md`
- `/Users/jonatan/.codex/worktrees/393f/Monorepo/docs/README.md`

Keep the first pass focused on active repo-contributor docs rather than every historical reference.

**Step 4: Run final verification**

Run:

```bash
pnpm install --frozen-lockfile
pnpm nx run ghost-admin:build:dev
pnpm nx run-many -t build --exclude=ghost-admin
pnpm lint
```

If the full lint is too expensive after migration churn, run the minimal relevant subset and document what remains.

**Step 5: Review git diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only intended pnpm migration files changed; no accidental lockfile or generated-file noise remains unreviewed.

**Step 6: Commit**

```bash
git add /Users/jonatan/.codex/worktrees/393f/Monorepo/pnpm-lock.yaml /Users/jonatan/.codex/worktrees/393f/Monorepo/README.md /Users/jonatan/.codex/worktrees/393f/Monorepo/AGENTS.md /Users/jonatan/.codex/worktrees/393f/Monorepo/docs/README.md
git rm /Users/jonatan/.codex/worktrees/393f/Monorepo/yarn.lock
git commit -m "chore: hard-cut the monorepo over to pnpm"
```
