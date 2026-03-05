# Phase 5: Legacy React Apps — TailwindCSS v4 Utility Migration

## Context

This is Phase 5 of the TailwindCSS v3 → v4 migration (Phases 0–4 complete). The targets are `admin-x-design-system` and `admin-x-settings` — legacy React apps being phased out in favor of Shade. Both are consumed via `@source` directives in the admin's centralized v4 pipeline, so their **component TSX files** need v4-compatible utility syntax, but their **own build infrastructure** (PostCSS config, tailwind.config.cjs, styles.css, Storybook) stays on v3 intentionally.

This is a lightweight, mechanical phase — same patterns as Phase 4 (stats/activitypub/posts) but applied to the legacy apps.

---

## Changes

### 1. Convert `!prefix` important modifiers to `suffix!` (~85 instances)

Same pattern as Phase 4. `!utility` → `utility!`, `variant:!utility` → `variant:utility!`

**admin-x-design-system** (~20 instances across 12 files):
- `src/global/modal/modal.tsx` — `!pb-4`, `max-[800px]:!pb-20`, `md:!invisible`, `md:!hidden`
- `src/global/modal/preview-modal.tsx` — `md:!block`, `md:!visible`, `[@media(min-width:801px)]:!visible`, `[@media(min-width:801px)]:!flex`
- `src/global/table-head.tsx` — `!py-2`, `!pl-0`, `!pr-6`
- `src/global/table-cell.tsx` — `!py-3`, `!pl-0`, `!pr-6`
- `src/global/button-group.tsx` — `!gap-0`, `!px-0`
- `src/global/button.tsx` — `hover:!bg-grey-300`, `dark:hover:!bg-grey-800`, `hover:!border-black`, `dark:hover:!border-white`
- `src/global/sort-menu.tsx` — `!w-3`, `!h-3`, `!mr-0`
- `src/global/form/code-editor-view.tsx` — `!text-grey-700`, `peer-focus:!text-black`
- `src/global/form/image-upload.tsx` — `group-hover:!visible`
- `src/global/form/koenig-editor-base.tsx` — `[&_*]:!font-inherit`, `[&_*]:!text-inherit`
- `src/settings/setting-group-header.tsx` — `group-[.is-not-editing]/setting-group:!visible`, `group-[.is-not-editing]/setting-group:!block`, `md:!visible`, `md:!block`
- `src/global/layout/page.stories.tsx` — `tablet:!flex`

**admin-x-settings** (~65 instances across ~29 files):
- Highest-density files: `global-settings.tsx` (~15), `theme-preview.tsx` (6), `migration-tools-export.tsx` (6), `tier-detail-preview.tsx` (6), `sidebar.tsx` (5), `newsletters-list.tsx` (5)
- Many files with 1-4 instances each

### 2. Convert `outline-none` → `outline-hidden` (6 instances)

Preserves v3 behavior (`outline: 2px solid transparent`) vs v4's `outline-none` which sets `outline-style: none`.

**admin-x-design-system** (5):
- `src/global/form/select.tsx` — `outline-none`
- `src/global/form/checkbox.tsx` — `outline-none`
- `src/global/form/multi-select.tsx` — `outline-none`
- `src/global/form/radio.tsx` — `focus:outline-none`
- `src/global/popover.tsx` — `focus:outline-none`

**admin-x-settings** (1):
- `src/components/settings/membership/member-emails.tsx` — `focus-visible:outline-none`

### 3. Convert `flex-grow` → `grow` (1 instance)

- `apps/admin-x-settings/src/components/settings/advanced/integrations/slack-modal.tsx:79`

### 4. Fix `accent` color mismatch (2 instances)

In the design system's config, `accent` mapped to `var(--accent-color, #ff0095)` (Ghost site accent). In Shade's config (which now compiles these classes), `accent` maps to `var(--accent)` — a different Shade semantic token. Shade has `ghostaccent` for the Ghost site accent color.

- `apps/admin-x-settings/src/components/settings/membership/tiers/tier-detail-preview.tsx:25` — `bg-accent` → `bg-ghostaccent`
- `apps/admin-x-settings/src/components/settings/membership/tiers/tier-detail-preview.tsx:99` — `text-accent` → `text-ghostaccent`

---

## What does NOT change

- **Build infrastructure stays on v3**: `styles.css`, `postcss.config.cjs`, `tailwind.config.cjs`, `preflight.css`, Storybook config — all untouched
- **Shadow utility names**: Shade's custom scale via `@config` preserves existing mappings
- **No `[--var]` shorthand issues**: None found in either package
- **No `hsl(var())` issues**: None found

## Execution order

1. admin-x-design-system files first (settings imports from design system)
2. admin-x-settings files second
3. Run visual regression suite — compare against Phase 0 baselines, fix any regressions

## Verification

Automated verification via the Playwright visual regression suite set up in Phase 0. The baselines in `e2e/visual-regression/baselines/` represent the correct pre-migration state — do NOT update them. All comparisons should be against these Phase 0 originals.

```bash
# Prerequisite: yarn dev must be running

# Compare current state against Phase 0 baselines (< 0.1% pixel diff threshold)
npx playwright test -c e2e/visual-regression

# If failures: view report for visual diff
npx playwright show-report e2e/visual-regression/playwright-report
```

The suite covers 9 screens including Settings. If any tests fail, inspect the diff report, fix the regressions, and re-run until all screens pass against the Phase 0 ground truth.
