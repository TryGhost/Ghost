# TailwindCSS v4 Migration Patterns For Syncing `main`

This document captures the concrete migration patterns already applied on branch `DES-1301-twcss4-migration-cld`, so incoming `main` changes (still authored against TailwindCSS v3 conventions) can be adapted quickly while this PR is under review.

Source of truth: branch-only commits vs `origin/main`, especially:
- `ebec6be7f1` (Phase 1 infrastructure)
- `4fa1c3e7d1` (Phase 2 syntax/theme migration)
- `ec5bea060c` (Phase 3 regression fixes)
- `f0b040d2e2` (Phase 3.5 important strategy)
- `05e33e14cb` (Phase 4 utility migration in posts/stats/activitypub)
- `696f901e0d` (Phase 5 utility migration in admin-x-settings/admin-x-design-system)
- `58bb4e4987` (Unsplash/TW3 cascade conflict fix)
- `5727cf7ee7`, `14a17a95a4`, `ca02368a5c` (follow-up token/theme fixes)

## 1. Build + CSS pipeline patterns

1. TailwindCSS compiles once via admin Vite.
- Add/use `@tailwindcss/vite` in [`apps/admin/vite.config.ts`](/Users/peterzimon/Code/Ghost-DES-1301-twcss4/apps/admin/vite.config.ts).
- Keep `tailwindcss() as PluginOption` first in plugin list.

2. Scan embedded apps from admin entry CSS.
- Use `@source` in [`apps/admin/src/index.css`](/Users/peterzimon/Code/Ghost-DES-1301-twcss4/apps/admin/src/index.css) for:
  `shade`, `posts`, `stats`, `activitypub`, `admin-x-settings`, `admin-x-design-system`, and `kg-unsplash-selector/dist/**/*.js`.

3. Do not import Shade CSS inside embedded app CSS.
- Removed duplicate imports from `apps/activitypub/src/styles/index.css`, `apps/posts/src/styles/index.css`, `apps/stats/src/styles/index.css`.
- Pattern: keep `@import "@tryghost/shade/styles.css";` only in admin entry CSS.

4. TW4 Shade stylesheet structure is unlayered.
- In [`apps/shade/styles.css`](/Users/peterzimon/Code/Ghost-DES-1301-twcss4/apps/shade/styles.css):
  - font `@import url(...)` first
  - `@import "tailwindcss/theme.css";`
  - `@import "./preflight.css";`
  - `@import "tailwindcss/utilities.css";`
  - `@import "tw-animate-css";`
  - `@config "./tailwind.config.cjs";`
- Keep `:root` and `.dark` variables outside `@layer`.

5. PostCSS config expectations changed.
- Deleted per-app PostCSS configs (`apps/admin`, `apps/posts`, `apps/stats`, `apps/activitypub`).
- Shade PostCSS switched to `@tailwindcss/postcss` (storybook/dev tooling).

6. Unsplash selector TW3 CSS import must stay removed.
- Removed direct import in [`apps/admin-x-settings/src/components/selectors/unsplash-selector.tsx`](/Users/peterzimon/Code/Ghost-DES-1301-twcss4/apps/admin-x-settings/src/components/selectors/unsplash-selector.tsx).
- Rely on `@source` scanning instead (fixes TW3 `.fixed` overriding TW4 responsive classes).

## 2. Utility/class migration patterns (most frequent)

1. Important modifier moved from prefix to suffix.
- `!h-9` -> `h-9!`
- `md:!block` -> `md:block!`
- `group-hover:!underline` -> `group-hover:underline!`
- `[&_*]:!font-inherit` -> `[&_*]:font-inherit!`

2. `outline-none` became `outline-hidden` for equivalent behavior.
- Includes variant forms:
  - `focus:outline-none` -> `focus:outline-hidden`
  - `focus-visible:outline-none` -> `focus-visible:outline-hidden`

3. CSS variable arbitrary values moved from `[...]` to `(...)` in many utilities.
- `w-[--sidebar-width]` -> `w-(--sidebar-width)`
- `max-h-[--radix-select-content-available-height]` -> `max-h-(--radix-select-content-available-height)`
- `origin-[--radix-popover-content-transform-origin]` -> `origin-(--radix-popover-content-transform-origin)`
- `border-[--color-border]` -> `border-(--color-border)`

4. Color variable wrapping updated to avoid double-wrapping.
- `hsl(var(--chart-blue))` -> `var(--chart-blue)`
- Also applied in inline style props, SVG fills/strokes, and arbitrary-value utilities.

5. Radius usage in Shade shifted toward `rounded-xs` for small controls.
- `rounded-sm` -> `rounded-xs` in menu/list/form controls.
- Required token in config:
  - `xs: 'max(calc(var(--radius) - 6px), 0px)'`

## 3. Theme/token follow-up patterns discovered during migration

1. Keep `important: false` in [`apps/shade/tailwind.config.cjs`](/Users/peterzimon/Code/Ghost-DES-1301-twcss4/apps/shade/tailwind.config.cjs).
- `important: '.shade'` is not supported by v4 `@config` bridge.
- `important: true` caused override regressions and was removed.

2. Preserve default line-height keys in `theme.extend.lineHeight`.
- Added: `none`, `snug`, `normal`, `relaxed`, `loose`.
- This mitigates TW4 default `--text-{size}--line-height` bleed-through.

3. Use `ghostaccent` where the semantic intent is Ghost brand accent color.
- Example in tier preview:
  - `bg-accent` -> `bg-ghostaccent`
  - `text-accent` -> `text-ghostaccent`

## 4. Practical checklist when pulling latest `main`

For each batch of incoming commits, run these checks and patch the diff before pushing:

1. Preflight gate: check Tailwind classname ordering before making any migration edits.
```bash
NX_DAEMON=false yarn nx run @tryghost/posts:lint
NX_DAEMON=false yarn nx run @tryghost/admin:lint
```
- If lint fails with `tailwindcss/classnames-order`, run eslint `--fix` on touched files first, then continue with the migration updates.

2. Find old important prefix usage:
```bash
rg -n "(^|\\s)![a-zA-Z\\[]" apps/admin apps/shade apps/posts apps/stats apps/activitypub apps/admin-x-settings apps/admin-x-design-system
```

3. Find outdated outline utility:
```bash
rg -n "outline-none" apps/admin apps/shade apps/posts apps/stats apps/activitypub apps/admin-x-settings apps/admin-x-design-system
```

4. Find old CSS var bracket syntax:
```bash
rg -n "[a-z-]+-\\[--[^\\]]+\\]" apps/shade apps/posts apps/stats apps/activitypub apps/admin-x-settings apps/admin-x-design-system
```

5. Find potentially double-wrapped color vars:
```bash
rg -n "hsl\\(var\\(--" apps/shade apps/posts apps/stats apps/activitypub apps/admin-x-settings apps/admin-x-design-system
```

6. Prevent duplicate Shade CSS imports in embedded apps:
```bash
rg -n "@import \"@tryghost/shade/styles.css\"" apps/activitypub/src/styles apps/posts/src/styles apps/stats/src/styles
```

7. Ensure admin entry keeps complete `@source` coverage:
```bash
rg -n "^@source " apps/admin/src/index.css
```

8. Post-update gate: rerun lint before pushing to catch ordering regressions introduced by class rewrites.
```bash
NX_DAEMON=false yarn nx run @tryghost/posts:lint
NX_DAEMON=false yarn nx run @tryghost/admin:lint
```

## 5. Notes

- This branch should continue merging/rebasing from `origin/main` only; do not merge this branch into `main` until review sign-off.
- As of this snapshot, the high-signal TW3->TW4 changes are mostly mechanical and safe to apply in follow-up sync commits.
