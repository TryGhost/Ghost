# Phase 6: Cleanup & Final Verification

## Context

Phases 0–5 of the TailwindCSS v3→v4 migration are complete. The codebase is in a working hybrid state:
- **Shade + admin + posts + stats + activitypub** — running on TW v4 via centralized `@tailwindcss/vite` in admin
- **admin-x-design-system + admin-x-settings** — source files consumed via `@source` in admin's v4 pipeline, but their own Storybook/ESLint still uses TW v3 deps
- **Public apps** (comments-ui, signup-form, sodo-search) — remain on TW v3 (out of scope)
- **`@config` bridge** — Shade uses `@config "./tailwind.config.cjs"` rather than `@theme inline` (deferred)

Phase 6 focuses on cleaning up migration artifacts, verifying nothing is broken, and updating documentation to reflect the new architecture.

---

## Steps

### 6.1 — Verify `yarn dev` boots cleanly

Run `yarn dev` and confirm:
- Ghost Admin loads at `localhost:2368/ghost/`
- No CSS-related console errors
- Navigate through: Dashboard, Posts, Members, Settings, Stats, ActivityPub

### 6.2 — Verify `yarn build` completes

Run `yarn build` from the root. Confirm zero build errors.

### 6.3 — Run unit tests

Run `yarn test:unit` from the root to catch any broken imports or references.

### 6.4 — Run E2E tests

Run `yarn test:e2e` to verify browser-level functionality.

### 6.5 — Update CLAUDE.md with CSS architecture section

Add a new **CSS Architecture** section to `CLAUDE.md` documenting:

1. **TW v4 setup**: Only `apps/admin/vite.config.ts` has `@tailwindcss/vite` — centralized CSS processing for all embedded React apps
2. **Entry point**: `apps/admin/src/index.css` has `@source` directives scanning shade, posts, stats, activitypub, admin-x-settings, admin-x-design-system, and kg-unsplash-selector
3. **Shade styles**: `apps/shade/styles.css` uses unlayered imports (`tailwindcss/theme.css`, `tailwindcss/utilities.css`) with `@config "./tailwind.config.cjs"` bridge
4. **Why unlayered**: Avoids cascade layer conflicts with Ember's unlayered CSS (`.flex`, `.hidden`, etc.)
5. **Embedded apps rule**: Apps consumed via `@source` (posts, stats, activitypub) must NOT import `@tryghost/shade/styles.css` independently — causes duplicate utilities and cascade conflicts
6. **Public apps**: comments-ui, signup-form, sodo-search remain on TW v3 (UMD bundles for CDN)
7. **Legacy apps**: admin-x-design-system and admin-x-settings keep TW v3 deps for their own Storybook; source files consumed via `@source` in admin's v4 pipeline
8. **`tw-animate-css`**: v4 replacement for `tailwindcss-animate`, imported in `shade/styles.css`

### 6.6 — Update memory notes

Update MEMORY.md to mark Phase 6 as complete and clean up migration-specific notes that are now captured in CLAUDE.md.

---

## What is NOT being cleaned up (and why)

| Item | Reason to keep |
|---|---|
| `apps/shade/tailwind.config.cjs` | Actively used via `@config` bridge in `shade/styles.css` |
| `apps/admin/tailwind.config.js` | Auto-detected by `@tailwindcss/vite` plugin, defines content paths and ActivityPub animations |
| `apps/posts/tailwind.config.cjs` | Used by ESLint plugin and IDE Tailwind extension for DX |
| `apps/stats/tailwind.config.cjs` | Same — ESLint/IDE support |
| `apps/activitypub/tailwind.config.cjs` | Same — ESLint/IDE support |
| `apps/admin-x-settings/tailwind.config.cjs` | Storybook and ESLint |
| `apps/admin-x-design-system/tailwind.config.cjs` | Storybook and ESLint — still uses TW v3 |
| `apps/admin-x-design-system/postcss.config.cjs` | Needed for admin-x-design-system's own Storybook (TW v3) |
| `apps/admin-x-settings/postcss.config.cjs` | Re-exports admin-x-design-system's config for Storybook |
| `apps/shade/postcss.config.cjs` | Needed for Shade's own Storybook (TW v4 via `@tailwindcss/postcss`) |
| `tw-animate-css` in Shade | Active v4 replacement for `tailwindcss-animate` |
| `ghost/admin/` `autoprefixer` + `postcss-import` | Part of Ember build pipeline, unrelated to TW migration |
| Public app TW v3 deps | Out of scope — remain on v3 intentionally |
| Migration plan files in repo root | User will clean up manually |

---

## Verification

After all steps:
- `yarn dev` boots with zero CSS console errors
- `yarn build` completes without errors
- `yarn test:unit` passes
- `yarn test:e2e` passes
- CLAUDE.md contains accurate CSS architecture documentation
