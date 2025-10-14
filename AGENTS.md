# AGENTS.md

This file provides guidance to AI Agents when working with code in this repository.

## Package Manager

**Always use `yarn` (v1) for all commands.** This repository uses yarn workspaces, not npm.

## Monorepo Structure

Ghost is a Yarn v1 + Nx monorepo with three workspace groups:

### ghost/* - Core Ghost packages
- **ghost/core** - Main Ghost application (Node.js/Express backend)
  - Core server: `ghost/core/core/server/`
  - Frontend rendering: `ghost/core/core/frontend/`
- **ghost/admin** - Ember.js admin client (legacy, being migrated to React)
- **ghost/i18n** - Centralized internationalization for all apps

### apps/* - React-based UI applications
Two categories of apps:

**Admin Apps** (embedded in Ghost Admin):
- `admin-x-settings`, `admin-x-activitypub` - Settings and integrations
- `posts`, `stats` - Post analytics and site-wide analytics
- Built with Vite + React + `@tanstack/react-query`

**Public Apps** (served to site visitors):
- `portal`, `comments-ui`, `signup-form`, `sodo-search`, `announcement-bar`
- Built as UMD bundles, loaded via CDN in site themes

**Foundation Libraries**:
- `admin-x-framework` - Shared API hooks, routing, utilities
- `admin-x-design-system` - Legacy design system (being phased out)
- `shade` - New design system (shadcn/ui + Radix UI + react-hook-form + zod)

### e2e/ - End-to-end tests
- Playwright-based E2E tests with Docker container isolation
- See `e2e/CLAUDE.md` for detailed testing guidance

## Common Commands

### Development
```bash
yarn                           # Install dependencies
yarn setup                     # First-time setup (installs deps + submodules)
yarn dev                       # Run Ghost + Admin in parallel
yarn dev:admin                 # Run only Ember admin + React apps (watch mode)
yarn dev:ghost                 # Run only Ghost backend
yarn dev:debug                 # Run with DEBUG=@tryghost*,ghost:* enabled
```

### Building
```bash
yarn build                     # Build all packages (Nx handles dependencies)
yarn build:clean               # Clean build artifacts and rebuild
```

### Testing
```bash
# Unit tests (from root)
yarn test:unit                 # Run all unit tests in all packages

# Ghost core tests (from ghost/core/)
cd ghost/core
yarn test:unit                 # Unit tests only
yarn test:integration          # Integration tests
yarn test:e2e                  # E2E API tests (not browser)
yarn test:browser              # Playwright browser tests for core
yarn test:all                  # All test types

# E2E browser tests (from root)
yarn test:e2e                  # Run e2e/ Playwright tests

# Running a single test
cd ghost/core
yarn test:single test/unit/path/to/test.test.js
```

### Linting
```bash
yarn lint                      # Lint all packages
cd ghost/core && yarn lint     # Lint Ghost core (server, shared, frontend, tests)
cd ghost/admin && yarn lint    # Lint Ember admin
```

### Database
```bash
yarn knex-migrator migrate     # Run database migrations
yarn reset:data                # Reset database with test data (1000 members, 100 posts)
yarn reset:data:empty          # Reset database with no data
```

### Docker
```bash
yarn docker:build              # Build Docker images and delete ephemeral volumes
yarn docker:dev                # Start Ghost in Docker with hot reload
yarn docker:shell              # Open shell in Ghost container
yarn docker:mysql              # Open MySQL CLI
yarn docker:test:unit          # Run unit tests in Docker
yarn docker:reset              # Reset all Docker volumes (including database) and restart
```

## Architecture Patterns

### Admin Apps Integration (Micro-Frontend)

**Build Process:**
1. Admin-x React apps build to `apps/*/dist` using Vite
2. `ghost/admin/lib/asset-delivery` copies them to `ghost/core/core/built/admin/assets/*`
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

**Centralized Translations:**
- Single source: `ghost/i18n/locales/{locale}/{namespace}.json`
- Namespaces: `ghost`, `portal`, `signup-form`, `comments`, `search`
- 60+ supported locales

### Build Dependencies (Nx)

Critical build order (Nx handles automatically):
1. `shade` + `admin-x-design-system` build
2. `admin-x-framework` builds (depends on #1)
3. Admin apps build (depend on #2)
4. `ghost/admin` builds (depends on #3, copies via asset-delivery)
5. `ghost/core` serves admin build

## Code Guidelines

### Commit Messages
Follow the project's commit message format:
- **1st line:** Max 80 chars, past tense, with emoji if user-facing
- **2nd line:** [blank]
- **3rd line:** `ref`, `fixes`, or `closes` with issue link
- **4th line:** Context (why this change, why now)

**Emojis for user-facing changes:**
- ✨ Feature
- 🎨 Improvement/change
- 🐛 Bug fix
- 🌐 i18n/translation
- 💡 Other user-facing changes

Example:
```
✨ Added dark mode toggle to admin settings

fixes https://github.com/TryGhost/Ghost/issues/12345
Users requested ability to switch themes for better accessibility
```

### When Working on Admin UI
- **New features:** Build in React (`apps/admin-x-*` or `apps/posts`)
- **Use:** `admin-x-framework` for API hooks (`useBrowse`, `useEdit`, etc.)
- **Use:** `shade` design system for new components (not admin-x-design-system)
- **Translations:** Add to `ghost/i18n/locales/en/ghost.json`

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

### Design System Usage
- **New components:** Use `shade` (shadcn/ui-inspired)
- **Legacy:** `admin-x-design-system` (being phased out, avoid for new work)

### Analytics (Tinybird)
- **Local development:** `yarn docker:dev:analytics` (starts Tinybird + MySQL)
- **Config:** Add Tinybird config to `ghost/core/config.development.json`
- **Scripts:** `ghost/core/core/server/data/tinybird/scripts/`
- **Datafiles:** `ghost/core/core/server/data/tinybird/`

## Troubleshooting

### Build Issues
```bash
yarn fix                       # Clean cache + node_modules + reinstall
yarn build:clean               # Clean build artifacts
yarn nx reset                  # Reset Nx cache
```

### Test Issues
- **E2E failures:** Check `e2e/CLAUDE.md` for debugging tips
- **Docker issues:** `yarn docker:clean && yarn docker:build`
