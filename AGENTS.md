# AGENTS.md

This file provides guidance to AI Agents when working with code in this repository.

## Package Manager

**Always use `pnpm` for all commands.** This repository uses pnpm workspaces, not npm.

Shared dependency versions are pinned in `pnpm-workspace.yaml` under `catalog:` and referenced as `"pkg": "catalog:"` (or `catalog:<name>` for named catalogs). `catalogMode` is `strict`, so `pnpm add` routes new deps into the catalog automatically — don't inline the version.

## Monorepo Structure

Ghost is a pnpm + Nx monorepo with three workspace groups:

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

### koenig/* - Ghost editor (Koenig) packages
Merged from the former TryGhost/Koenig repo with full git history:

- **koenig-lexical** - The Lexical-based rich text editor UI. Bundled into
  Ghost Admin at build time (`ghost/admin` copies its UMD build into admin
  assets; `apps/posts` and `apps/admin` import it directly)
- **kg-*** - Editor support packages: server-side renderers and converters
  consumed by `ghost/core` (kg-default-nodes, kg-lexical-html-renderer,
  kg-html-to-lexical, ...) plus frontend helpers (kg-unsplash-selector)

All Koenig packages resolve via `workspace:` — nothing in dev, CI, or the
release archive installs them from npm. They are published to npm for
external consumers only, automatically as part of the Ghost release lane
(see `publish_koenig_packages` in ci.yml).

**Zero-build dev via the `source` export condition.** The `kg-*` libraries
consumed by `ghost/core` (and `ghost/parse-email-address`) declare a `source`
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
this `exports` shape (see `ghost/parse-email-address`) so it works build-free
in dev from day one; keep the `^build` graph for `tsc`/type-checking and prod.

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
cd ghost/admin && pnpm lint    # Lint Ember admin
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
- Context descriptions: `ghost/i18n/locales/context.json` — every key must have a non-empty description

**Translation Workflow:**
```bash
pnpm --filter @tryghost/i18n translate          # Extract keys from source, update all locale files + context.json
pnpm --filter @tryghost/i18n lint:translations   # Validate interpolation variables across locales
```

`translate` is run as part of `pnpm --filter @tryghost/i18n test`. In CI, it fails if translation keys or `context.json` are out of date (`failOnUpdate: process.env.CI`). Always run `pnpm --filter @tryghost/i18n translate` after adding or changing `t()` calls.

**Rules for Translation Keys:**
1. **Never split sentences across multiple `t()` calls.** Translators cannot reorder words across separate keys. Instead, use `@doist/react-interpolate` to embed React elements (links, bold, etc.) within a single translatable string.
2. **Always provide context descriptions.** When adding a new key, add a description in `context.json` explaining where the string appears and what it does. CI will reject empty descriptions.
3. **Use interpolation for dynamic values.** Ghost uses `{variable}` syntax: `t('Welcome back, {name}!', {name: firstname})`
4. **Use `<tag>` syntax for inline elements.** Combined with `@doist/react-interpolate`: `t('Click <a>here</a> to retry')` with `mapping={{ a: <a href="..." /> }}`

**Correct pattern (using Interpolate):**
```jsx
import Interpolate from '@doist/react-interpolate';

<Interpolate
    mapping={{ a: <a href={link} /> }}
    string={t('Could not sign in. <a>Click here to retry</a>')}
/>
```

**Incorrect pattern (split sentences):**
```jsx
// BAD: translators cannot reorder "Click here to retry" relative to the first sentence
{t('Could not sign in.')} <a href={link}>{t('Click here to retry')}</a>
```

See `apps/portal/src/components/pages/email-receiving-faq.js` for a canonical example of correct `Interpolate` usage.

### Build Dependencies (Nx)

Critical build order (Nx handles automatically):
1. `shade` + `admin-x-design-system` build
2. `admin-x-framework` builds (depends on #1)
3. Admin apps build (depend on #2)
4. `ghost/admin` builds (depends on #3, copies via asset-delivery)
5. `ghost/core` serves admin build

## CSS Architecture

### TailwindCSS v4 Setup

Ghost Admin uses **TailwindCSS v4** via the `@tailwindcss/vite` plugin. CSS processing is centralized — only `apps/admin/vite.config.ts` loads the `@tailwindcss/vite` plugin. All embedded React apps (posts, stats, activitypub, admin-x-settings, admin-x-design-system) are scanned from this single entry point.

### Entry Point

`apps/admin/src/index.css` is the main CSS entry point. It contains:
- `@source` directives that scan class usage in shade, posts, stats, activitypub, admin-x-settings, admin-x-design-system, and kg-unsplash-selector
- `@import "@tryghost/shade/styles.css"` which loads the Shade design system styles

### Shade Styles

`apps/shade/styles.css` uses **unlayered** Tailwind imports:
```css
@import "tailwindcss/theme.css";
@import "./preflight.css";
@import "tailwindcss/utilities.css";
@import "tw-animate-css";
@import "./tailwind.theme.css";
```

**Why unlayered:** Ember's legacy CSS (`.flex`, `.hidden`, etc.) is unlayered. If Tailwind utilities were in a `@layer`, they would lose to Ember's unlayered CSS in the cascade. Keeping both unlayered means source order determines specificity.

Theme tokens/variants/animations are defined in CSS (`apps/shade/tailwind.theme.css` + runtime vars in `styles.css`), so there is no JS `@config` bridge in the Admin runtime lane. `tw-animate-css` is the v4 replacement for `tailwindcss-animate`.

### Critical Rule: Embedded Apps Must NOT Import Shade Independently

Apps consumed via `@source` (posts, stats, activitypub) must **NOT** import `@tryghost/shade/styles.css` in their own CSS. Doing so causes duplicate Tailwind utilities and cascade conflicts. All Tailwind CSS is generated once via the admin entry point.

### Public Apps

Public-facing apps (`comments-ui`, `signup-form`, `sodo-search`, `portal`, `announcement-bar`) remain on **TailwindCSS v3**. They are built as UMD bundles for CDN distribution and are independent of the admin CSS pipeline.

### Legacy Apps

`admin-x-design-system` and `admin-x-settings` are consumed via `@source` in admin's centralized v4 pipeline for production, and both packages build with CSS-first Tailwind v4 setup.

## Code Guidelines

### Commit Messages
When the user asks you to create a commit or draft a commit message, load and follow the `commit` skill from `.agents/skills/commit`.

### ESLint Config
Source of truth: [eslint.shared.mjs](eslint.shared.mjs) at the repo root. Two factories cover most workspaces — `reactAppConfig` (every `apps/*` workspace) and `nodeLibConfig` (Node libs in `ghost/`). Each factory has full JSDoc with `@example`s; hover the call site in your editor.

Minimal example for a new admin React app (`apps/new-feature/eslint.config.js`):

```js
import {reactAppConfig} from '../../eslint.shared.mjs';
export default await reactAppConfig({
    tailwindCssPath: `${import.meta.dirname}/../admin/src/index.css`,
    shadeRestricted: true
});
```

Conventions:
- **Rules are `'error'` or `'off'` — never `'warn'`.** Warnings get ignored and pollute output. Applies to every workspace covered by the factories above + the standalones; `e2e/` has its own setup (see [e2e/CLAUDE.md](e2e/CLAUDE.md)) and currently still uses warn-level Playwright rules — a separate cleanup.
- **Params prefixed `legacy*`** (`legacyTailwindV3ConfigPath`, `legacyJsTsSplit`) are escape hatches for migrations that haven't shipped yet. Intentional and visible — PRs to remove them are scoped.
- **Standalone configs** (`ghost/core`, `ghost/admin`, `apps/admin`, `apps/admin-toolbar`) exist because their rule sets genuinely don't fit a factory — read the file directly. They import shared atoms (`correctnessRules`, `nodeLibRules`, `localFilenamesPlugin`, `strictLinterOptions`) where applicable.
- **Plugin deps**: workspaces that use Tailwind must list `tailwindcss` as a (dev)Dependency themselves; other eslint plugins are root devDeps because the factory imports them dynamically.

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
