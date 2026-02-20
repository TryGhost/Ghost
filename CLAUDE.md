# CLAUDE.md — Ghost Monorepo

## Overview

Ghost is an open-source professional publishing platform built with Node.js. This is a Yarn workspaces + NX monorepo containing ~97 packages across two top-level directories: `ghost/` (backend services, core, admin) and `apps/` (modern frontend applications).

## Repository Structure

```
Ghost/
├── ghost/                    # Backend packages and legacy admin
│   ├── core/                 # Main Ghost application (Express.js server)
│   │   ├── core/
│   │   │   ├── server/       # Backend: API, models, services, data, web routing
│   │   │   ├── frontend/     # Theme rendering (Handlebars), helpers, routing
│   │   │   └── shared/       # Shared utilities (config, URL utils, i18n)
│   │   └── test/             # All core tests (unit, integration, e2e, regression)
│   ├── admin/                # Ember.js admin client
│   ├── ghost/                # New TypeScript application layer (NestJS-based)
│   └── <package>/            # 80+ internal @tryghost/* packages (services, middleware, etc.)
├── apps/                     # Modern frontend applications
│   ├── admin-x-settings/     # React admin settings panel (Vite + Tailwind)
│   ├── admin-x-activitypub/  # ActivityPub integration
│   ├── admin-x-design-system/# Shared React component library
│   ├── admin-x-framework/    # Framework utilities for admin-x apps
│   ├── comments-ui/          # Embedded comments widget (React)
│   ├── portal/               # Member portal widget (React)
│   ├── signup-form/          # Signup form widget
│   ├── posts/                # Posts management
│   ├── shade/                # Styling utilities
│   ├── announcement-bar/     # Announcement bar widget
│   └── sodo-search/          # Search widget
├── nx.json                   # NX build orchestration config
├── package.json              # Root workspace config
└── yarn.lock
```

### Key Package Categories in `ghost/`

- **Middleware** (`mw-*`): Express middleware — cache-control, error-handler, version-match, vhost, etc.
- **Email** (`email-*`): Email service, analytics, content generation, suppression lists
- **Members** (`members-*`, `member-*`): Members API, CSV import, SSR, events, attribution
- **Domain services**: `posts-service`, `recommendations`, `offers`, `tiers`, `stripe`, `donations`
- **Data layer**: `bookshelf-repository`, `in-memory-repository`, `domain-events`
- **Infrastructure**: `job-manager`, `prometheus-metrics`, `api-framework`, `constants`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend runtime | Node.js (^18.12.1 or ^20.11.1) |
| Backend framework | Express.js |
| ORM | Bookshelf.js + Knex.js |
| Database | SQLite (dev), MySQL 8 (production/CI) |
| Legacy admin | Ember.js |
| Modern admin (admin-x) | React 18 + TypeScript + Vite + Tailwind CSS |
| Embedded widgets | React (UMD bundles) |
| New backend layer | TypeScript + NestJS (`ghost/ghost/`) |
| Package manager | Yarn (v1 workspaces) |
| Build orchestration | NX 19 |
| Template engine | Handlebars (themes) |

## Common Commands

### Setup & Development

```bash
yarn setup                    # Full setup: install, submodules, build TS, init DB
yarn dev                      # Start Ghost + Admin dev servers concurrently
yarn dev:ghost                # Start only Ghost backend (with --watch)
yarn dev:admin                # Start only Admin dev server
```

### Building

```bash
yarn build                    # Build all packages (nx run-many -t build)
yarn build:clean              # Clean NX cache and all build artifacts
nx run-many -t build:ts       # Build only TypeScript packages
```

### Testing — Ghost Core (`ghost/core/`)

```bash
# From repo root, run all tests for core:
yarn workspace ghost test:unit          # Unit tests (mocha + c8 coverage)
yarn workspace ghost test:integration   # Integration tests (needs DB)
yarn workspace ghost test:e2e           # E2E API tests (needs DB)
yarn workspace ghost test:regression    # Regression tests

# Run a single test file:
yarn workspace ghost test:single path/to/file.test.js

# Browser tests (Playwright):
yarn workspace ghost test:browser              # All browser tests
yarn workspace ghost test:browser:admin        # Admin browser tests
yarn workspace ghost test:browser:portal       # Portal browser tests

# From ghost/core/ directory:
yarn test:unit
yarn test:integration
yarn test:e2e
```

### Testing — Apps & Packages

```bash
# Admin-x settings:
yarn nx run @tryghost/admin-x-settings:test:unit         # Vitest
yarn nx run @tryghost/admin-x-settings:test:acceptance   # Playwright

# Comments UI:
yarn nx run @tryghost/comments-ui:test

# Run all tests across monorepo:
yarn test                     # nx run-many -t test
yarn test:unit                # nx run-many -t test:unit
```

### Linting

```bash
yarn lint                     # Lint all packages (nx run-many -t lint)

# Core-specific linting:
yarn workspace ghost lint:server
yarn workspace ghost lint:test
```

### Database

```bash
yarn knex-migrator init       # Initialize database with migrations
yarn knex-migrator migrate    # Run pending migrations
yarn reset:data               # Generate sample data (100k members, 500 posts)
yarn reset:data:empty         # Clear database with no sample data
```

## Architecture

### Core Backend (`ghost/core/core/server/`)

The backend follows a **service-oriented architecture**:

- **`api/endpoints/`** — 63 REST API endpoint controllers. Each exports a controller object with CRUD methods (`browse`, `read`, `add`, `edit`, `destroy`) containing options, validation, permissions, and query definitions.
- **`models/`** — Bookshelf.js models (40+) for all database entities. Base model in `models/base/bookshelf.js`. Models have rich lifecycle hooks (`onSaving`, `onSaved`, `onUpdated`, `onDestroyed`) for validation, slug generation, event emission, and cascading updates.
- **`services/`** — 55+ domain service modules organized by feature (auth, email, members, posts, payments, etc.).
- **`data/schema/`** — Database schema definitions, validators, and fixtures.
- **`data/migrations/versions/`** — Timestamped migration files (format: `YYYY-MM-DD-HH-mm-ss-description.js`).
- **`web/`** — Express routing: `web/api/` (REST API), `web/admin/` (admin SPA), `web/members/` (member routes), `web/parent/` (main app).

### New TypeScript Layer (`ghost/ghost/`)

A newer TypeScript-based architecture using NestJS patterns, gated behind the `NestPlayground` labs flag and `GHOST_ENABLE_NEST_FRAMEWORK` env var. Express falls through to NestJS for matched routes when enabled.

- `src/core/` — Core domain logic
- `src/db/` — Database repositories
- `src/http/` — HTTP controllers with decorators (`@Roles`, `@UseGuards`)
- `src/listeners/` — Domain event listeners
- `src/nestjs/` — NestJS modules, guards (`PermissionsGuard`, `AdminAPIAuthentication`), filters, interceptors
- `src/common/` — Shared decorators, types, base entity class

Routes are prefixed under `ghost/api/admin` and use role-based access control (Owner, Admin, Editor, Author, Contributor).

### Frontend Theme Rendering (`ghost/core/core/frontend/`)

Handlebars-based theme rendering system:
- `helpers/` — Template helpers
- `services/` — Frontend services (routing, themes, URL)
- `web/` — Frontend Express routes

### Shared Layer (`ghost/core/core/shared/`)

Accessible to both server and frontend:
- `config/` — nconf-based configuration loader
- `settings-cache/` — In-memory cache for database settings
- `url-utils.js` — URL manipulation (URLs stored with `__GHOST_URL__` placeholder for portability)
- `labs.js` — Feature flags system
- `sentry.js` — Error tracking integration

### Configuration

Ghost uses `nconf` for hierarchical configuration:
- Environment variables (highest priority)
- `config.<environment>.json` files in `ghost/core/`
- Default values (lowest priority)

Access via `config.get('key')`. Environment variable format uses double underscores for nesting: `database__connection__host`.

### Key Architectural Patterns

- **Event-driven**: Domain events (`post.published`, `member.added`, etc.) drive side effects across services
- **URL transform-ready**: All URLs stored with `__GHOST_URL__` placeholder, transformed to absolute URLs on read
- **Feature flags**: `labs.isSet('featureName')` gates experimental functionality
- **Lazy service initialization**: Services initialize on demand, configuration passed through provider objects
- **Transaction support**: Database transactions via `options.transacting` threaded through service/model calls
- **Role-based access**: Permissions checked per-endpoint (Owner > Admin > Editor > Author > Contributor)

## Testing Patterns

### Core Tests (`ghost/core/test/`)

```
test/
├── unit/           # Fast, isolated unit tests (2s timeout)
├── integration/    # Tests with DB access (10s timeout)
├── e2e-api/        # API endpoint tests (15s timeout)
├── e2e-frontend/   # Frontend rendering tests
├── e2e-server/     # Server behavior tests
├── e2e-webhooks/   # Webhook tests
├── e2e-browser/    # Playwright browser tests (admin + portal)
├── regression/     # Regression tests (60s timeout)
└── utils/          # Test utilities, fixtures, overrides
```

- **Framework**: Mocha with `dot` reporter, `--exit`, `--trace-warnings`
- **Assertions**: `should.js`, `sinon` for mocking, `supertest` for HTTP
- **Coverage**: c8 (Istanbul-based)
- **Test file extension**: `*.test.js`
- **Overrides**: `test/utils/overrides.js` required before all tests
- **Database tests**: Run against both SQLite and MySQL 8 in CI

### App Tests

- **Admin-x apps**: Vitest for unit tests, Playwright for acceptance tests
- **Ember admin**: `ember exam` (parallel test runner)
- **Comments/Portal**: Vitest + Playwright

## Code Conventions

### JavaScript (Core)

- ESLint with `eslint-plugin-ghost` (extends `plugin:ghost/node`)
- `no-var`, `one-var: never`, `no-shadow: error`
- No Prettier — ESLint only
- CommonJS `require()` in core server code
- lint-staged runs ESLint on `*.js` via Husky

### TypeScript (New Packages)

- Strict mode enabled, ES2022 target, CommonJS module output
- Packages in `ghost/` use `ghost/tsconfig.json` as base
- Build output to `build/` directory

### React Apps (admin-x, widgets)

- TypeScript + React 18
- Vite for bundling
- Tailwind CSS for styling
- ESLint with React, React Hooks, and Tailwind plugins

### Migrations

Strict ESLint rules enforced in `core/server/data/migrations/versions/`:
- **No loops** (for, for-of, for-in, while, forEach, _.each) — they perform badly in migrations
- **No multiple joins** in a single knex block
- **No return in loops**
- **File naming**: `YYYY-MM-DD-HH-mm-ss-descriptive-name.js`

### Import Boundaries

ESLint enforces module boundaries:
- `core/shared/` cannot import from `core/server/` or `core/frontend/`
- `core/frontend/` should not import from `core/server/` (linted as warn)
- `core/server/` should not import from `core/frontend/` (linted as warn)

### Commit Messages

Format (from CONTRIBUTING.md):
```
<emoji if user-facing> Max 80 char summary in past tense

refs/fixes <issue link> | no issue
Context: why this change was made
```

Emojis for user-facing changes:
- ✨ Feature
- 🎨 Improvement/change
- 🐛 Bug fix
- 🌐 i18n
- 💡 Other user-facing

### Package Scope

All internal packages use the `@tryghost/` npm scope. Internal packages use `"version": "0.0.0"` (not published individually — they're part of the monorepo).

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):

1. **Setup**: Install deps, build TS packages, cache node_modules and builds
2. **Lint**: `nx affected -t lint` (only changed packages)
3. **Unit tests**: Run on Node 18 and 20 against affected packages
4. **Database tests**: E2E + integration tests on SQLite and MySQL 8, Node 18 and 20
5. **Regression tests**: On SQLite and MySQL 8
6. **Admin tests**: Ember test suite (Chrome)
7. **Browser tests**: Playwright (requires `browser-tests` label on PRs)
8. **App tests**: Admin-x settings, comments-ui, signup-form (Playwright)

CI uses `nx affected` to only run tests for changed packages. Node version: 20.11.1.

## Key Files

| File | Purpose |
|------|---------|
| `ghost/core/core/server/api/endpoints/*.js` | REST API controllers |
| `ghost/core/core/server/models/*.js` | Bookshelf database models |
| `ghost/core/core/server/services/` | Backend domain services |
| `ghost/core/core/server/data/schema/schema.js` | Database schema definition |
| `ghost/core/core/server/data/migrations/versions/` | Database migrations |
| `ghost/core/core/server/web/` | Express routing |
| `ghost/core/core/frontend/helpers/` | Handlebars template helpers |
| `ghost/core/core/shared/config/` | Configuration loader (nconf) |
| `ghost/admin/app/` | Ember.js admin application |
| `apps/admin-x-settings/src/` | React admin settings |
| `ghost/core/test/` | All core test suites |
