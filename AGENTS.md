# AGENTS.md

This file provides guidance to AI Agents when working with code in this repository.

## Package Manager

**Always use `pnpm` for all commands.** This repository uses pnpm workspaces, not npm.

Shared dependency versions are pinned in `pnpm-workspace.yaml` under `catalog:` and referenced as `"pkg": "catalog:"` (or `catalog:<name>` for named catalogs). `catalogMode` is `strict`, so `pnpm add` routes new deps into the catalog automatically — don't inline the version.

## Monorepo Structure

Ghost is a pnpm + Nx monorepo with four workspace groups:

### ghost/* - Core Ghost packages
- **ghost/core** - Main Ghost application (Node.js/Express backend)
  - Core server: `ghost/core/core/server/`
  - Frontend rendering: `ghost/core/core/frontend/`

### apps/* - React-based UI applications
Two categories of apps:

**Admin Apps** (embedded in Ghost Admin):
- `ember-admin` - Ember.js admin client (legacy, being migrated to React)
- `admin` - The consolidated React admin shell, organized by domain (`src/{analytics,members,posts,tags,comments,automations,...}`)
- `admin-x-settings`, `activitypub` - Settings and ActivityPub integration (route-composed into `admin`)
- Built with Vite + React + `@tanstack/react-query`

**Public Apps** (served to site visitors):
- `portal`, `comments-ui`, `signup-form`, `sodo-search`, `announcement-bar`
- Built as UMD bundles, loaded via CDN in site themes

**Foundation Libraries**:
- `admin-x-framework` - Shared API hooks, routing, utilities
- `shade` - Design system (shadcn/ui + Radix UI + react-hook-form + zod)

### koenig/* - Ghost editor (Koenig) packages
Merged from the former TryGhost/Koenig repo with full git history:

- **koenig-lexical** - The Lexical-based rich text editor UI. Bundled into
  Ghost Admin at build time (`apps/ember-admin` copies its UMD build into admin
  assets; `apps/admin` imports it directly)
- **kg-*** - Editor support packages: server-side renderers and converters
  consumed by `ghost/core` (kg-default-nodes, kg-lexical-html-renderer,
  kg-html-to-lexical, ...) plus frontend helpers (kg-unsplash-selector)

All Koenig packages resolve via `workspace:` — nothing in dev, CI, or the
release archive installs them from npm. They are published to npm for
external consumers only, automatically as part of the Ghost release lane
(see `publish_koenig_packages` in ci.yml).

**Zero-build dev via the `source` export condition.** The `kg-*` libraries
consumed by `ghost/core` (and `packages/parse-email-address`) declare a `source`
condition in their `package.json` `exports` that points at the raw
`src/*.ts`, listed *before* `types`/`import`/`require`:

```jsonc
".": {
  "source": "./src/index.ts",     // dev/test: read raw TS
  "types": "./build/esm/index.d.ts",
  "import": "./build/esm/index.js",
  "require": "./build/cjs/index.js" // prod/published: compiled JS
}
```

`ghost/core`'s dev runner (`nodemon.json`: `node --conditions=source --import=tsx`)
and its Vitest configs (`resolve.conditions: ['source', 'node']` +
`--import tsx --conditions=source`) activate this condition, so a source change
in a `kg-*` package is picked up with **no `tsc` rebuild**. Production and the
published npm tarball run plain `node`, which ignores `source` and uses
`build/` — and `src/` is excluded from each package's `files` array, so it is
never shipped. When adding a new backend-consumed TS workspace package, copy
this `exports` shape (see `packages/parse-email-address`) so it works build-free
in dev from day one; keep the `^build` graph for `tsc`/type-checking and prod.

### packages/* - Shared workspace libraries
Backend and shared libraries consumed via `workspace:` — not published to npm:

- **i18n** - Centralized internationalization for all apps
- **parse-email-address** - Email address parsing (see the `source` export
  condition above)
- **adapters/** - Adapter base classes (`adapter-base-*`: scheduling, storage,
  SSO, redirects, route settings)
- **custom-field-types**, **testing** - Shared field-type definitions and test
  helpers
- **_template** - Scaffold for new packages; excluded from the workspace

### e2e/ - End-to-end tests
- Playwright-based E2E tests with Docker container isolation
- See `e2e/CLAUDE.md` for detailed testing guidance

## Common Commands

### Development
```bash
corepack enable pnpm           # Enable corepack to use the correct pnpm version
pnpm run setup                 # First-time setup (installs deps + submodules + builds workspace packages)
pnpm dev                       # Start development (Docker backend + host frontend dev servers)
```

> **Fresh worktree / first run — run `pnpm setup` before anything else.** It installs deps and syncs submodules. `pnpm fix` does a clean reinstall if anything misbehaves after a branch switch.

### Building
```bash
pnpm build                     # Build all packages (Nx handles dependencies)
pnpm build:clean               # Clean build artifacts and rebuild
```

### Testing
```bash
# Unit tests (from root)
pnpm test:unit                 # Run all unit tests in all packages
pnpm test:watch                # Watch mode — unified Vitest watcher (ghost/core + all apps)

# Ghost core tests (from ghost/core/)
cd ghost/core
pnpm test:unit                 # Unit tests only (Vitest, run once)
pnpm test:watch                # Watch mode — ghost/core unit tests only
pnpm test:integration          # Integration tests
pnpm test:e2e                  # Server-side e2e suites (webhooks/server/frontend/api) — not browser
pnpm test:all                  # All test types

# These run on sqlite with no extra services. The Redis/MinIO/S3 adapter suites
# probe for their service and auto-skip when it's down (run `pnpm dev:storage`
# etc. to exercise them); they always run in CI, which starts the services.

# E2E browser tests (from root)
pnpm test:e2e                  # Run e2e/ Playwright tests

# Running a single test
cd ghost/core
pnpm test:single test/unit/path/to/test.test.js   # routes test/unit/* → unit config, test/* → DB config

# Watch a single DB-backed file (integration/e2e) — the default test:watch only
# covers unit tests, so point it at the DB config explicitly:
pnpm exec vitest -c vitest.config.db.ts test/integration/path/to/test.test.js
```

### Linting
```bash
pnpm lint                      # Lint all packages
cd ghost/core && pnpm lint     # Lint Ghost core (server, shared, frontend, tests)
cd apps/ember-admin && pnpm lint    # Lint Ember admin
```

### Database
```bash
pnpm knex-migrator migrate     # Run database migrations
pnpm reset:data                # Reset database with test data (1000 members, 100 posts) (requires pnpm dev running)
pnpm reset:data:empty          # Reset database with no data (requires pnpm dev running)
```

### Docker
```bash
pnpm docker:build              # Build Docker images
pnpm docker:clean              # Stop containers, remove volumes and local images
pnpm docker:down               # Stop containers
```

### How `pnpm dev` works

The `pnpm dev` command uses a **hybrid Docker + host development** setup:

**What runs in Docker:**
- Ghost Core backend (with hot-reload via mounted source)
- MySQL, Redis, Mailpit
- Caddy gateway/reverse proxy

**What runs on host by default:**
- Admin, legacy Ember admin, Portal, and foundation library dev watchers
- Optional public UMD app watchers can be added when needed

**Setup:**
```bash
# Start Ghost backend, Admin, Portal, and Docker services
pnpm dev

# Add optional public apps (comments-ui, sodo-search, signup-form, admin-toolbar)
pnpm dev:public

# Develop the Koenig editor against Ghost Admin (adds a koenig-lexical rebuild
# watcher + preview server; Admin loads the editor from your local build)
pnpm dev:lexical

# With optional services (uses Docker Compose file composition)
pnpm dev:analytics             # Include Tinybird analytics
pnpm dev:storage               # Include MinIO S3-compatible object storage
pnpm dev:stripe                # Include Stripe webhook forwarding
pnpm dev:full                  # Include analytics, storage, Stripe, and public app watchers

# Everything available
pnpm dev:all                   #
```

**Accessing Services:**
- Ghost: `http://localhost:2368` (database: `ghost_dev`)
- Mailpit UI: `http://localhost:8025` (email testing)
- MySQL: `localhost:3306`
- Redis: `localhost:6379`
- Tinybird: `http://localhost:7181` (when analytics enabled)
- MinIO Console: `http://localhost:9001` (when storage enabled)
- MinIO S3 API: `http://localhost:9000` (when storage enabled)

## Architecture Patterns

### Admin Apps Integration (Micro-Frontend)

**Build Process:**
1. Admin-x React apps build to `apps/*/dist` using Vite
2. `apps/ember-admin/lib/asset-delivery` copies them to `ghost/core/core/built/admin/assets/*`
3. Ghost admin serves from `/ghost/assets/{app-name}/{app-name}.js`

**Runtime Loading:**
- Ember admin uses `AdminXComponent` to dynamically import React apps
- React components wrapped in Suspense with error boundaries
- Apps receive config via `additionalProps()` method

### Public Apps Integration

- Built as UMD bundles to `apps/*/umd/*.min.js`
- Loaded via `<script>` tags in theme templates (injected by `{{ghost_head}}`)
- Configuration passed via data attributes

### i18n Architecture

Translations are centralised in `packages/i18n`. **Never split a sentence across multiple `t()` calls** (translators can't reorder words across keys — use `@doist/react-interpolate` instead), and **always run `pnpm --filter @tryghost/i18n translate`** after adding or changing a `t()` call, or CI fails.

For the full workflow, namespaces, and interpolation patterns, load the `i18n-translations` skill from `.agents/skills/i18n-translations`.

### Build Dependencies (Nx)

Critical build order (Nx handles automatically):
1. `shade` builds
2. `admin-x-framework` builds (depends on #1)
3. Admin apps build (depend on #2)
4. `apps/ember-admin` builds (depends on #3, copies via asset-delivery)
5. `ghost/core` serves admin build

## CSS Architecture

Admin runs TailwindCSS v4 through a single centralized pipeline; the public apps
remain on v3. See [apps/AGENTS.md](apps/AGENTS.md) for the entry point, the
unlayered-imports rationale, and the rule that embedded apps must not import
Shade styles independently.

## Code Guidelines

### Commit Messages
When the user asks you to create a commit or draft a commit message, load and follow the `commit` skill from `.agents/skills/commit`.

### ESLint Config
Lint config lives in two internal packages — [`@internal/cfg-eslint`](configs/eslint/index.mjs) and [`@internal/cfg-eslint-react`](configs/eslint-react/index.mjs) — consumed by name as a `workspace:*` devDependency. **Rules are `'error'` or `'off'` — never `'warn'`**, across the shared configs and the standalones; `e2e/` is the one exception, with warn-level Playwright rules still pending cleanup.

When creating or editing an `eslint.config.js`, load the `eslint-config` skill from `.agents/skills/eslint-config` for the factories, the standalone configs, and the plugin-dependency rules.

### When Working on Admin UI
- **New features:** Build in React in `apps/admin` (domain folders under `src/`)
- **Use:** `admin-x-framework` for API hooks (`useBrowse`, `useEdit`, etc.)
- **Use:** `shade` design system for new components
- **Translations:** Add to `packages/i18n/locales/en/ghost.json`

### When Working on Public UI
- **Edit:** `apps/portal`, `apps/comments-ui`, etc.
- **Translations:** Separate namespaces (`portal.json`, `comments.json`)
- **Build:** UMD bundles for CDN distribution

### When Working on Backend
- **Core logic:** `ghost/core/core/server/`
- **Database Schema:** `ghost/core/core/server/data/schema/`
- **API routes:** `ghost/core/core/server/api/`
- **Services:** `ghost/core/core/server/services/`
- **Models:** `ghost/core/core/server/models/`
- **Frontend & theme rendering:** `ghost/core/core/frontend/`

### Analytics (Tinybird)
- **Local development:** `pnpm dev:analytics` (starts Tinybird + MySQL)
- **Config:** Add Tinybird config to `ghost/core/config.development.json`
- **Scripts:** `ghost/core/core/server/data/tinybird/scripts/`
- **Datafiles:** `ghost/core/core/server/data/tinybird/`

## Troubleshooting

### Build Issues
```bash
pnpm fix                       # Clean cache + node_modules + reinstall
pnpm build:clean               # Clean build artifacts
pnpm nx reset                  # Reset Nx cache
```

### Test Issues
- **E2E failures:** Check `e2e/CLAUDE.md` for debugging tips
- **Docker issues:** `pnpm docker:clean && pnpm docker:build`
