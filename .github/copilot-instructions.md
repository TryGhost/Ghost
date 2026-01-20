# Ghost Copilot Instructions

This guide helps coding agents work efficiently with the Ghost codebase by providing essential information about build processes, testing, architecture, and common pitfalls.

## Repository Overview

**Ghost** is a professional, open-source publishing platform built with Node.js. It's a headless CMS with 100M+ downloads, featuring:
- **Backend**: Node.js/Express (ghost/core)
- **Admin UI**: Ember.js (being migrated to React)
- **Public Apps**: React (Portal, Comments, Signup Form, Search, etc.)
- **Build System**: Yarn v1 workspaces + Nx monorepo
- **Database**: MySQL 8 or SQLite3
- **Testing**: Mocha (unit/integration), Playwright (E2E browser tests)

## Critical Requirements

### Node.js Version
**REQUIRED**: Node.js **22.18.0** (as specified in CI workflow)
- Check current version: `node --version`
- The project uses `engines.node: "^22.13.1"` in ghost/core/package.json
- CI uses NODE_VERSION: 22.18.0

### Package Manager
**ALWAYS use `yarn` (v1), NEVER npm**
- This is a Yarn v1 workspace monorepo
- Check version: `yarn --version` (should be ~1.22.x)

## Monorepo Structure

Ghost uses Yarn v1 workspaces + Nx with three main groups:

### ghost/* - Core Ghost Packages
- **ghost/core** - Main Ghost application (Node.js/Express backend)
  - Core server: `ghost/core/core/server/`
  - Frontend/theme rendering: `ghost/core/core/frontend/`
  - API routes: `ghost/core/core/server/api/`
  - Services: `ghost/core/core/server/services/`
  - Models: `ghost/core/core/server/models/`
  - Database schema: `ghost/core/core/server/data/schema/`
- **ghost/admin** - Ember.js admin client (legacy, being migrated to React)
- **ghost/i18n** - Centralized i18n for all apps
  - Translations: `ghost/i18n/locales/{locale}/{namespace}.json`
  - Namespaces: ghost, portal, signup-form, comments, search
  - 60+ supported locales

### apps/* - React UI Applications

**Admin Apps** (embedded in Ghost Admin via micro-frontend pattern):
- `admin-x-settings`, `admin-x-activitypub` - Settings and integrations
- `posts`, `stats` - Post analytics and site-wide analytics
- Built with: Vite + React + @tanstack/react-query

**Public Apps** (served to site visitors as UMD bundles):
- `portal`, `comments-ui`, `signup-form`, `sodo-search`, `announcement-bar`
- Loaded via `<script>` tags in theme templates

**Foundation Libraries**:
- `admin-x-framework` - Shared API hooks, routing, utilities
- `admin-x-design-system` - Legacy design system (being phased out)
- `shade` - **New design system** (shadcn/ui + Radix UI + react-hook-form + zod)
  - **Always use `shade` for new components, NOT admin-x-design-system**

### e2e/ - End-to-End Tests
- Playwright-based E2E tests with Docker container isolation
- See `e2e/AGENTS.md` for detailed testing guidance

## Essential Commands

### First-Time Setup
```bash
# Clone and setup (run ONCE)
yarn setup                     # Installs deps + git submodules
```

**IMPORTANT**: `yarn setup` runs git submodule init/update. Always run this on first clone.

### Installing Dependencies
```bash
# Standard install (preferred)
yarn                           # Shorthand for yarn install

# CI-style install (used in GitHub Actions)
bash .github/scripts/install-deps.sh   # Installs with --frozen-lockfile --ignore-scripts, then builds sqlite3
```

**Note**: The install script uses `--ignore-scripts` for security, then selectively builds sqlite3 binaries.

### Development

```bash
# Local development (no Docker)
yarn dev                       # Start Ghost core + all frontend apps
yarn dev:debug                 # Same with DEBUG=@tryghost*,ghost:* enabled
yarn dev:admin                 # Run only admin frontend
yarn dev:ghost                 # Run only Ghost backend

# Docker-based development (RECOMMENDED for database)
yarn dev:forward               # Hybrid: Docker backend + host frontend dev servers
yarn dev:analytics             # Include Tinybird analytics
yarn dev:storage               # Include MinIO S3 storage
yarn dev:all                   # Include all optional services

# Docker services
yarn docker:dev                # Full Ghost in Docker with hot reload
yarn docker:shell              # Open shell in Ghost container
yarn docker:mysql              # Open MySQL CLI
yarn docker:reset              # Reset all Docker volumes (including database) and restart
yarn docker:build              # Build Docker images and delete ephemeral volumes
```

**Docker Development Access**:
- Ghost: http://localhost:2368 (database: `ghost_dev`)
- Mailpit UI: http://localhost:8025 (email testing)
- MySQL: localhost:3306 (user: root, password: root)
- Redis: localhost:6379

### Building

```bash
# Build all packages (Nx handles dependency order automatically)
yarn build                     # Build everything

# Clean build (when experiencing cache issues)
yarn build:clean               # Clean + rebuild (runs: nx reset + rimraf build dirs)

# Critical build order (automatic via Nx):
# 1. shade + admin-x-design-system
# 2. admin-x-framework (depends on #1)
# 3. Admin apps (depend on #2)
# 4. ghost/admin (depends on #3, copies via asset-delivery)
# 5. ghost/core serves admin build
```

**Build Output Locations**:
- Admin-x React apps: `apps/*/dist` (Vite output)
- Copied to: `ghost/core/core/built/admin/assets/*` (via ghost/admin/lib/asset-delivery)
- Public apps: `apps/*/umd/*.min.js` (UMD bundles for CDN)

### Testing

```bash
# Unit tests (from root)
yarn test:unit                 # All unit tests in all packages

# From ghost/core/ directory
cd ghost/core
yarn test:unit                 # Unit tests only
yarn test:integration          # Integration tests
yarn test:e2e                  # E2E API tests (NOT browser)
yarn test:browser              # Playwright browser tests for core
yarn test:all                  # All test types
yarn test:single test/unit/path/to/test.test.js  # Single test

# E2E browser tests (from root)
yarn test:e2e                  # Playwright E2E tests (e2e/ directory)
yarn test:browser              # Ghost core browser tests

# Docker tests
yarn docker:test:unit          # Unit tests in Docker
yarn docker:test:browser       # Browser tests in Docker
```

**Test Databases**:
- Unit tests: In-memory SQLite (fast)
- Integration/E2E: MySQL 8 or SQLite (configurable)
- Set via NODE_ENV: `testing` (sqlite) or `testing-mysql` (mysql)
- MySQL connection in tests: `database__connection__password=root`

**E2E Test Important Notes** (see e2e/AGENTS.md):
- Always use `yarn`, never npm
- Always run `yarn lint` and `yarn test:types` after changes
- Never use CSS/XPath selectors - only semantic locators or data-testid
- Follow AAA pattern (Arrange, Act, Assert)
- One test = one scenario
- Debug: `yarn test --debug` (shows browser)
- Debug failures: `PRESERVE_ENV=true yarn test` (keeps containers)

### Linting

```bash
# Lint all packages
yarn lint                      # Root level - runs Nx affected lint

# Lint specific packages
cd ghost/core && yarn lint     # Ghost core (server, shared, frontend, tests)
cd ghost/admin && yarn lint    # Ember admin
```

**ESLint Cache**: Workflow caches `.eslintcache` files for faster linting.

### Database Management

```bash
yarn knex-migrator migrate     # Run database migrations
yarn reset:data                # Reset DB with test data (1000 members, 100 posts)
yarn reset:data:empty          # Reset DB with no data
yarn reset:data:xxl            # Reset DB with 2M members (performance testing)

# Docker database
yarn docker:reset:data         # Reset data inside Docker container
yarn docker:mysql              # Access MySQL CLI
```

**Migrations Location**: `ghost/core/core/server/data/migrations/`

### Troubleshooting

```bash
# Nuclear option - clean everything and reinstall
yarn fix                       # Clean cache + node_modules + reinstall

# Build issues
yarn build:clean               # Clean build artifacts
yarn nx reset                  # Reset Nx cache

# Docker issues
yarn docker:clean && yarn docker:build
```

**Common Issues**:
1. **Build failures**: Try `yarn build:clean` first
2. **Dependency issues**: Run `yarn fix`
3. **Database issues**: Run `yarn docker:reset` (if using Docker)
4. **Nx cache corruption**: Run `yarn nx reset`

## CI/CD Workflow (.github/workflows/ci.yml)

### Workflow Triggers
- Pull requests (opened, synchronized, reopened, labeled, unlabeled)
- Pushes to main, release branches (v*), major version branches (*.x)

### Key CI Jobs

**job_setup**: Dependency installation and caching
- Uses Node 22.18.0
- Installs deps via `.github/scripts/install-deps.sh`
- Caches: node_modules, Playwright browsers, Nx cache
- Determines changed packages using path filters

**job_lint**: ESLint + TypeScript checks
- Runs: `yarn nx affected -t lint --base=$BASE_COMMIT`
- Uses cached .eslintcache

**job_unit-tests**: Mocha unit tests
- Matrix: Node versions (default: 22.18.0)
- Timezone: America/New_York (non-UTC testing)
- Runs: `yarn nx affected -t test:unit --base=$BASE_COMMIT`
- Requires: All packages built first (`yarn nx run-many -t build --exclude=ghost-admin`)

**job_acceptance-tests**: Integration + E2E API tests
- Matrix: MySQL 8, SQLite3, multiple Node versions
- MySQL setup via docker/mysql-action
- Runs in ghost/core:
  - `yarn test:ci:e2e` (with c8 coverage)
  - `yarn test:ci:integration` (with c8 coverage)

**job_browser-tests**: Playwright browser tests
- Requires: Stripe secrets (fails if from fork without secrets)
- Installs Stripe CLI v1.13.5
- Runs migrations: `yarn knex-migrator init`
- Builds admin: `yarn nx run ghost-admin:build:dev`
- Runs: `yarn test:browser`

**job_e2e_tests**: E2E tests with Docker
- Sharded 4 ways (matrix: 1-4)
- Tests both Ember and React shells (matrix: ember, react)
- Uses Docker Compose: `e2e/compose.yml`
- Runs: `yarn test:e2e --shard=$shardIndex/$shardTotal`

**job_admin-tests**: Ember admin tests
- Browser: Chrome
- Runs: `yarn nx run ghost-admin:test`
- Coverage merged and uploaded

**Admin-X tests**: Separate jobs for admin-x-settings, activitypub, comments-ui, signup-form
- All use Playwright
- Run when their respective paths change

**job_ghost-cli**: Tests Ghost-CLI compatibility
- Tests upgrade from v4 to canary
- Tests clean install
- Tests latest release upgrade

**job_docker_build**: Builds Docker development image
- Pushes to ghcr.io/tryghost/ghost-development
- Uses layer caching (main cache + PR-specific cache)
- Fork PRs: Saves image as artifact (no push)

### CI Performance Notes
- **Timeout**: job_browser-tests has 60-minute timeout
- **Parallel**: CI runs max 4 jobs in parallel (nx.json: parallel: 4)
- **Caching**: Heavy use of GitHub Actions cache for dependencies and Nx
- **Sharding**: E2E tests split into 4 shards for faster execution

### Required Secrets for Full CI
- `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` (browser tests)
- `CANARY_DOCKER_BUILD` (deployments, org membership check)
- `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` (Docker Hub login)
- `SLACK_WEBHOOK_URL` (failure notifications)
- `TINYBIRD_HOST`, `TINYBIRD_TOKEN` (Tinybird deployment)

## Commit Message Format

**ALWAYS follow this format**:

```
[emoji] Summary in past tense (max 80 chars)

ref|fixes|closes https://github.com/TryGhost/Ghost/issues/XXXX
Context: Why this change, why now, why not something else?
```

**Emojis for user-facing changes**:
- ✨ Feature
- 🎨 Improvement/change
- 🐛 Bug fix
- 🌐 i18n/translation
- 💡 Other user-facing changes

**Example**:
```
✨ Added dark mode toggle to admin settings

fixes https://github.com/TryGhost/Ghost/issues/12345
Users requested ability to switch themes for better accessibility
```

**For dependency bumps**: Describe the actual change, not what was bumped.

## Architecture & Patterns

### Admin Apps Integration (Micro-Frontend)

**Build Process**:
1. Admin-x React apps build to `apps/*/dist` using Vite
2. `ghost/admin/lib/asset-delivery` copies them to `ghost/core/core/built/admin/assets/*`
3. Ghost admin serves from `/ghost/assets/{app-name}/{app-name}.js`

**Runtime Loading**:
- Ember admin uses `AdminXComponent` to dynamically import React apps
- React components wrapped in Suspense with error boundaries
- Apps receive config via `additionalProps()` method

### Public Apps Integration
- Built as UMD bundles to `apps/*/umd/*.min.js`
- Loaded via `<script>` tags in theme templates (injected by `{{ghost_head}}`)
- Configuration passed via data attributes

### When Working on Different Parts

**Admin UI**:
- **New features**: Build in React (`apps/admin-x-*` or `apps/posts`)
- **Use**: `admin-x-framework` for API hooks (`useBrowse`, `useEdit`, etc.)
- **Use**: `shade` design system for new components (NOT admin-x-design-system)
- **Translations**: Add to `ghost/i18n/locales/en/ghost.json`

**Public UI**:
- **Edit**: `apps/portal`, `apps/comments-ui`, etc.
- **Translations**: Separate namespaces (`portal.json`, `comments.json`)
- **Build**: UMD bundles for CDN distribution

**Backend**:
- **Core logic**: `ghost/core/core/server/`
- **Database Schema**: `ghost/core/core/server/data/schema/`
- **API routes**: `ghost/core/core/server/api/`
- **Services**: `ghost/core/core/server/services/`
- **Models**: `ghost/core/core/server/models/`
- **Frontend & theme rendering**: `ghost/core/core/frontend/`

## Important Files & Configurations

### Root Directory
- `package.json` - Root workspace config with scripts
- `nx.json` - Nx build configuration
- `yarn.lock` - **NEVER modify manually**
- `.github/workflows/ci.yml` - Main CI workflow
- `.github/scripts/` - Setup, dev, and utility scripts
- `AGENTS.md` - AI agent development guide
- `e2e/AGENTS.md` - E2E testing guide

### Build & Config Files
- `ghost/core/package.json` - Ghost core dependencies and scripts
- `ghost/admin/package.json` - Ember admin dependencies
- `apps/*/package.json` - Individual app dependencies
- `.eslintrc.js` files throughout - ESLint configs (various formats)
- `tsconfig.json` files - TypeScript configs

## Environment Variables

**Development** (`.env` in root, copy from `.env.example`):
```bash
# Docker Compose profiles
COMPOSE_PROFILES=stripe

# Debug level
DEBUG=@tryghost*,ghost:*

# App flags (alternative to --flags)
GHOST_DEV_APP_FLAGS=portal,comments

# Stripe (for webhook forwarding)
STRIPE_SECRET_KEY=sk_test_*******
STRIPE_PUBLISHABLE_KEY=pk_test_*******
STRIPE_ACCOUNT_ID=acct_1*******
```

**Ghost Core Config** (`ghost/core/config.*.json`):
- `config.local.json` - Local overrides (gitignored)
- `config.development.json` - Development defaults
- `config.testing.json` - Test environment

## Performance & Analytics

**Tinybird** (analytics platform):
- Local dev: `yarn docker:dev:analytics` (starts Tinybird + MySQL)
- Config: Add to `ghost/core/config.development.json`
- Scripts: `ghost/core/core/server/data/tinybird/scripts/`
- Datafiles: `ghost/core/core/server/data/tinybird/`

**Boot Performance Testing**:
- CI runs hyperfine benchmarks on boot time
- Results pushed to Ghost-Benchmarks repo

## Key Gotchas & Workarounds

1. **Always use Yarn v1, never npm** - The project uses Yarn workspaces
2. **Node version matters** - Must use Node 22.x (CI uses 22.18.0)
3. **Nx caching** - If builds act weird, run `yarn nx reset`
4. **SQLite binary** - Install script handles this specially (security + performance)
5. **Admin apps require rebuild** - After changing apps/*, run `yarn build` before testing in admin
6. **Database in Docker** - `yarn dev:forward` is recommended for consistent MySQL setup
7. **Tests require builds** - Run `yarn build` before running tests (unit tests run `pretest` script)
8. **Ghost CLI tests need Node 16** - CI temporarily switches to Node 16.14.0 for v4 upgrade tests
9. **Fork PRs and Stripe** - Browser tests fail on fork PRs without secrets; must open from upstream branch
10. **Timezone in tests** - CI tests run in America/New_York, not UTC

## Trust These Instructions

**When working on this codebase**:
1. Follow the command sequences documented here - they are validated and work
2. Only search for additional information if these instructions are incomplete or incorrect
3. If you find an error in these instructions, update them
4. Prefer documented workflows over exploratory commands
5. Check AGENTS.md and e2e/AGENTS.md for additional domain-specific guidance
