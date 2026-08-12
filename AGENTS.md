# AGENTS.md

This file provides guidance to AI Agents when working with code in this repository.

Human-readable setup, workflow, testing, shipping, and architecture guidance
lives in the [codebase documentation](docs/README.md). Treat those guides and
nearby package READMEs as the source of truth for facts shared by humans and
agents. This file adds agent-specific execution rules and code constraints.

Start with:

- [Development setup](docs/contributing/development-setup.md)
- [Contribution workflow](docs/contributing/workflow.md)
- [Testing](docs/contributing/testing.md)
- [Shipping](docs/contributing/shipping.md)
- [Monorepo structure](docs/codebase/monorepo-structure.md)

## Package Manager

**Always use `pnpm` for all commands.** This repository uses pnpm workspaces, not npm.

Shared dependency versions are pinned in `pnpm-workspace.yaml` under `catalog:` and referenced as `"pkg": "catalog:"` (or `catalog:<name>` for named catalogs). `catalogMode` is `strict`, so `pnpm add` routes new deps into the catalog automatically — don't inline the version.

## Required Workflow

- Run `pnpm setup` before other commands in a fresh checkout or worktree.
- Use `pnpm check` as the default full validation command. Follow the
  [testing guide](docs/contributing/testing.md) for focused commands and the
  browser E2E and Ember Admin suites that run separately.
- Read the nearest `AGENTS.md`, `CLAUDE.md`, and README files before changing a
  package or subsystem. More specific instructions override this file.

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

**Centralized Translations:**
- Single source: `packages/i18n/locales/{locale}/{namespace}.json`
- Namespaces: `ghost`, `portal`, `signup-form`, `comments`, `search`
- 60+ supported locales
- Context descriptions: `packages/i18n/locales/context.json` — every key must have a non-empty description

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
4. `apps/ember-admin` builds (depends on #3, copies via asset-delivery)
5. `ghost/core` serves admin build

## CSS Architecture

### TailwindCSS v4 Setup

Ghost Admin uses **TailwindCSS v4** via the `@tailwindcss/vite` plugin. CSS processing is centralized — only `apps/admin/vite.config.ts` loads the `@tailwindcss/vite` plugin. Embedded React apps (activitypub) are scanned from this single entry point alongside admin's own source.

### Entry Point

`apps/admin/src/index.css` is the main CSS entry point. It contains:
- `@source` directives that scan class usage in shade, activitypub, admin-x-framework, and kg-unsplash-selector
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

Apps consumed via `@source` (activitypub) must **NOT** import `@tryghost/shade/styles.css` in their own CSS. Doing so causes duplicate Tailwind utilities and cascade conflicts. All Tailwind CSS is generated once via the admin entry point.

### Public Apps

Public-facing apps (`comments-ui`, `signup-form`, `sodo-search`, `portal`, `announcement-bar`) remain on **TailwindCSS v3**. They are built as UMD bundles for CDN distribution and are independent of the admin CSS pipeline.

## Code Guidelines

### Repository Skills

Repository skills live in `.agents/skills/<skill-name>`. When adding a skill,
also add `.claude/skills/<skill-name>` as a symlink to
`../../.agents/skills/<skill-name>` so Claude can discover the same canonical
skill without duplicating it. Run `pnpm lint:agent-skills` to verify every
repository skill is linked correctly; CI runs the same check.

### Commit Messages
When the user asks you to create a commit or draft a commit message, load and follow the `commit` skill from `.agents/skills/commit`.

### ESLint Config
Source of truth: two internal config packages — [`@internal/cfg-eslint`](configs/eslint/index.mjs) (shared rule atoms + the `nodeLibConfig` factory for Node libs) and [`@internal/cfg-eslint-react`](configs/eslint-react/index.mjs) (the `reactAppConfig` factory for every `apps/*` workspace). Both factories are synchronous and have full JSDoc with `@example`s; hover the call site in your editor. Consume them by name — declare the package as a `workspace:*` devDependency.

Minimal example for a new admin React app (`apps/new-feature/eslint.config.js`):

```js
import {reactAppConfig} from '@internal/cfg-eslint-react';
export default reactAppConfig({
    tailwindCssPath: `${import.meta.dirname}/../admin/src/index.css`,
    shadeRestricted: true
});
```

Conventions:
- **Rules are `'error'` or `'off'` — never `'warn'`.** Warnings get ignored and pollute output. Applies to every workspace covered by the factories above + the standalones; `e2e/` has its own setup (see [e2e/CLAUDE.md](e2e/CLAUDE.md)) and currently still uses warn-level Playwright rules — a separate cleanup.
- **Params prefixed `legacy*`** (`legacyTailwindV3ConfigPath`, `legacyJsTsSplit`) are escape hatches for migrations that haven't shipped yet. Intentional and visible — PRs to remove them are scoped.
- **Standalone configs** (`ghost/core`, `apps/ember-admin`, `apps/admin-toolbar`) exist because their rule sets genuinely don't fit a factory — read the file directly. They import shared atoms (`correctnessRules`, `nodeLibRules`, `localFilenamesPlugin`, `strictLinterOptions`) from `@internal/cfg-eslint`.
- **Plugin deps**: a workspace must declare every eslint plugin its config resolves. Two cases:
  - *Factory consumers* only import a factory, which supplies its plugins as objects from the config package — so they need just the config package (`@internal/cfg-eslint` / `@internal/cfg-eslint-react`) as a `workspace:*` devDependency, not the individual plugins.
  - *Hand-rolled configs* (the standalones above, plus the inline configs in `koenig/kg-*` and `e2e/`) `import` plugins directly, so each must list those plugins in its own `devDependencies` — most commonly `eslint-plugin-ghost: catalog:`. Don't rely on the root hoisting a plugin for you; there are no eslint plugins left in the root `package.json` (only `eslint` itself and `globals`, which the root config uses).
  - Exception: Tailwind — a workspace that uses it must list `tailwindcss` as its own (dev)Dependency regardless (the settings-based resolver requires it locally), and the legacy v3 apps pin `eslint-plugin-tailwindcss` via `catalog:tailwind3`.

### When Working on Admin UI
- **New features:** Build in React in `apps/admin` (domain folders under `src/`)
- **Use:** `admin-x-framework` for API hooks (`useBrowse`, `useEdit`, etc.)
- **Use:** `shade` design system for new components (not admin-x-design-system)
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

### Design System Usage
- **New components:** Use `shade` (shadcn/ui-inspired)
- **Legacy:** `admin-x-design-system` (being phased out, avoid for new work)

### Analytics (Tinybird)
- **Local development:** `pnpm dev:analytics` (starts Tinybird + MySQL)
- **Config:** Add Tinybird config to `ghost/core/config.development.json`
- **Scripts:** `ghost/core/core/server/data/tinybird/scripts/`
- **Datafiles:** `ghost/core/core/server/data/tinybird/`
