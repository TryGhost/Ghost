# AGENTS.md — apps/

Guidance for AI Agents working under `apps/`. See the repo root `AGENTS.md` for
monorepo-wide conventions.

## CSS Architecture

### TailwindCSS v4 Setup

Ghost Admin uses **TailwindCSS v4** via the `@tailwindcss/vite` plugin. CSS processing is centralized — only `apps/admin/vite.config.ts` loads the `@tailwindcss/vite` plugin. All embedded React apps (activitypub, admin-x-settings) are scanned from this single entry point.

### Entry Point

`apps/admin/src/index.css` is the main CSS entry point. It contains:
- `@source` directives that scan class usage in shade, activitypub, admin-x-settings, admin-x-framework, and kg-unsplash-selector
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

Apps consumed via `@source` (activitypub, admin-x-settings) must **NOT** import `@tryghost/shade/styles.css` in their own CSS. Doing so causes duplicate Tailwind utilities and cascade conflicts. All Tailwind CSS is generated once via the admin entry point.

### Public Apps

Public-facing apps (`comments-ui`, `signup-form`, `sodo-search`, `portal`, `announcement-bar`) remain on **TailwindCSS v3**. They are built as UMD bundles for CDN distribution and are independent of the admin CSS pipeline.

### Legacy Apps

`admin-x-settings` is consumed via `@source` in admin's centralized v4 pipeline for production, and builds with a CSS-first Tailwind v4 setup.
