# Phase 4: Secondary App Migration (stats, activitypub, posts)

## Context

Phases 0–3 of the TailwindCSS v3→v4 migration are complete on branch `DES-1301-twcss4-migration-cld`. The build infrastructure (`@tailwindcss/vite`), Shade design system, and admin hub are fully migrated. The secondary apps (stats, activitypub, posts) still contain v3-specific utility patterns in their TSX source files that need updating.

These apps don't have their own CSS builds — they're consumed via `@source` directives in `apps/admin/src/index.css` and processed by the admin hub's centralized `@tailwindcss/vite` plugin. Their individual `tailwind.config.cjs` files are only used for eslint/storybook and should NOT be modified.

## What Changes

Two categories of changes across all three apps:

### 1. Important modifier syntax: `!prefix` → `suffix!` (~65 instances total)

TailwindCSS v4 deprecates the `!` prefix form. Every instance like `!size-6`, `sm:!visible`, `hover:!bg-red/5`, `[&_svg]:!size-16` must become `size-6!`, `sm:visible!`, `hover:bg-red/5!`, `[&_svg]:size-16!`.

**Stats** (~25 instances across 10 files):
- `apps/stats/src/views/Stats/Overview/components/top-posts.tsx` — `first:!border-border`, `sm:!visible`, `sm:!block`, `sm:!flex`
- `apps/stats/src/views/Stats/Overview/components/overview-kpis.tsx` — `hover:!cursor-pointer`
- `apps/stats/src/views/Stats/Overview/components/latest-post.tsx` — `md:!visible`, `md:!block`
- `apps/stats/src/views/Stats/layout/stats-header.tsx` — `sm:!visible`, `sm:!flex`
- `apps/stats/src/views/Stats/Newsletters/components/newsletters-kpis.tsx` — `md:!visible`, `md:!grid`, `!cursor-pointer`
- `apps/stats/src/views/Stats/Newsletters/newsletters.tsx` — `group-hover:!visible`, `group-hover:!block`, `group-hover:!bg-transparent`
- `apps/stats/src/views/Stats/Web/components/web-kpis.tsx` — `md:!visible`, `md:!grid`
- `apps/stats/src/views/Stats/Growth/growth.tsx` — `group-hover:!bg-transparent`
- `apps/stats/src/views/Stats/Growth/components/growth-kpis.tsx` — `lg:!visible`, `lg:!grid`
- `apps/stats/src/views/Stats/Growth/components/paid-subscription-change-chart.tsx` — `!min-w-[120px]`
- `apps/stats/src/views/Stats/Growth/components/growth-sources.tsx` — `group-hover:!bg-transparent`, `hover:!bg-transparent`

**Activitypub** (~25 instances across 12 files):
- `apps/activitypub/src/views/feed/components/suggested-profiles.tsx` — `!size-6`
- `apps/activitypub/src/components/feed/table-of-contents.tsx` — `!visible`, `lg:!block`
- `apps/activitypub/src/components/global/ap-avatar.tsx` — `!size-3`, `!stroke-[2.4]`, `!size-[14px]`, `!stroke-2`
- `apps/activitypub/src/views/inbox/components/inbox-list.tsx` — `!animate-none`
- `apps/activitypub/src/views/notifications/notifications.tsx` — `!bg-[#F3F3F3]`, `!bg-[#EDEEF0]`
- `apps/activitypub/src/components/modals/new-note-modal.tsx` — `!min-w-0`
- `apps/activitypub/src/components/layout/header/header.tsx` — `!size-5`
- `apps/activitypub/src/views/inbox/components/customizer.tsx` — `!size-[18px]`
- `apps/activitypub/src/views/preferences/components/profile.tsx` — `[&>div]:!size-16`, `[&_img]:!size-16`
- `apps/activitypub/src/views/inbox/components/reader.tsx` — `!visible`, `lg:!flex`
- `apps/activitypub/src/components/layout/onboarding/step-1.tsx` — `dark:!visible`, `dark:!block`
- `apps/activitypub/src/components/layout/onboarding/step-2.tsx` — `dark:!visible`, `dark:!block`
- `apps/activitypub/src/views/preferences/components/bluesky-sharing.tsx` — `hover:!bg-red/5`, `group-hover:!visible`, `group-hover:!inline`
- `apps/activitypub/src/views/preferences/components/moderation.tsx` — `hover:!bg-red/5`
- `apps/activitypub/src/views/preferences/components/edit-profile.tsx` — `!border-none`, `!shadow-none`, `!outline-none`
- `apps/activitypub/src/components/global/image-lightbox.tsx` — `!size-6`, `!size-5`

**Posts** (~15 instances across 5 files):
- `apps/posts/src/components/member-avatar.tsx` — `!size-3`, `md:!size-4`
- `apps/posts/src/views/Tags/components/tags-list.tsx` — `lg:!visible`, `lg:!table-header-group`
- `apps/posts/src/views/PostAnalytics/components/kpi-card.tsx` — `md:!visible`, `md:!block`
- `apps/posts/src/views/PostAnalytics/Web/components/kpis.tsx` — `md:!visible`, `md:!grid`
- `apps/posts/src/views/PostAnalytics/Newsletter/components/feedback.tsx` — `sm:!visible`, `sm:!inline`, `xl:!visible`, `xl:!block`
- `apps/posts/src/views/PostAnalytics/Newsletter/newsletter.tsx` — `md:!visible`, `md:!flex`, `!text-sm`

### 2. `outline-none` → `outline-hidden` (4 instances, activitypub only)

In v4, `outline-none` sets `outline-style: none` (removes outline entirely). The replacement `outline-hidden` preserves the v3 behavior of `outline: 2px solid transparent`.

- `apps/activitypub/src/views/inbox/components/inbox-list.tsx` — `focus:outline-none` → `focus:outline-hidden`
- `apps/activitypub/src/views/preferences/components/edit-profile.tsx` — `focus-within:outline-none` → `focus-within:outline-hidden`, `!outline-none` → `outline-hidden!`
- `apps/activitypub/src/components/global/profile-preview-hover-card.tsx` — `outline-none` → `outline-hidden`

## What Does NOT Change

- **Shadow/rounded utility names** — Shade defines custom `boxShadow` and `borderRadius` scales in its config. The `@config` bridge preserves v3 key→value mapping, so `shadow-sm`, `shadow-xs`, `rounded-sm` already map to the correct custom values. NO renaming.
- **App-specific `tailwind.config.cjs` files** — Used for eslint/storybook only; the admin hub handles CSS compilation.
- **Custom CSS in app style files** — Plain CSS, not affected by v4 utility renames.
- **Bare `border` without explicit color** — Shade's global reset (`* { @apply border-border; }`) provides default border color.
- No `[--var]`, `hsl(var())`, `flex-shrink-*`, or `flex-grow-*` patterns found in these apps.

## Execution Order

Work one app at a time per the migration plan: **stats → activitypub → posts**.

For each app:
1. Convert all `!prefix` important modifiers to `suffix!` form
2. Convert `outline-none` → `outline-hidden` (activitypub only)
3. Verify with `yarn dev` that the app renders correctly in Ghost Admin

## Verification

After all three apps are done:
1. `yarn dev` boots without errors
2. Navigate to `/ghost/#/dashboard` (stats widgets), `/ghost/#/activitypub`, `/ghost/#/posts` — all render correctly
3. No CSS-related console errors
4. Spot-check responsive breakpoints (the `sm:visible!` / `md:block!` patterns are responsive show/hide logic)
5. Check that charts/graphs in stats still render (they use custom tooltip components)
