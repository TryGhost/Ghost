# Plan: Comprehensive Visual Regression Testing — TW v4 Migration

## Context

All 6 phases of the TailwindCSS v3→v4 migration are complete on branch `DES-1301-twcss4-migration-cld`. The existing visual regression suite covers only 9 screens — not enough to catch all regressions, especially in Settings (a long scrollable page with 30+ sections) and Ember-rendered pages (highest risk due to CSS class name collisions like `.flex`, `.hidden`, `.block`). The user reports visible regressions in Settings and Ember pages. This plan captures comprehensive before/after screenshots and identifies all regressions.

## Approach

**Expand the Playwright spec** from 9 → ~35 screens (including settings sections via scrolling), then run the automated comparison pipeline: generate baselines on the Phase 0 commit, run comparison on HEAD. Playwright auto-generates diff images for every failing screen. Use Playwright MCP interactively to investigate specific regressions.

## Step 1: Expand the Playwright Visual Regression Spec

**File:** `e2e/visual-regression/capture-baselines.spec.ts`

Add these screens to the `SCREENS` array:

**Ember pages (HIGH risk — CSS class collisions):**
- `tags-new` → `/ghost/#/tags/new` (Ember form)
- `members-activity` → `/ghost/#/members-activity` (Ember activity table)

**Analytics/Stats pages (React):**
- `analytics-overview` → `/ghost/#/analytics` (replaces old `dashboard`)
- `analytics-web` → `/ghost/#/analytics/web`
- `analytics-growth` → `/ghost/#/analytics/growth`
- `analytics-newsletters` → `/ghost/#/analytics/newsletters`

**ActivityPub pages (React):**
- `activitypub-reader` → `/ghost/#/activitypub/reader`
- `activitypub-notes` → `/ghost/#/activitypub/notes`
- `activitypub-profile` → `/ghost/#/activitypub/profile`
- `activitypub-notifications` → `/ghost/#/activitypub/notifications`
- `activitypub-explore` → `/ghost/#/activitypub/explore`

**Settings sections** — Add a separate test group that navigates to `/ghost/#/settings`, then scrolls to each section using `evaluate()` on `#admin-x-settings-scroller` and takes viewport screenshots (not fullPage):
- `settings-general`, `settings-staff`, `settings-metadata`, `settings-social`
- `settings-design`, `settings-theme`, `settings-navigation`
- `settings-access`, `settings-tiers`, `settings-portal`, `settings-newsletters`
- `settings-recommendations`, `settings-integrations`
- `settings-code-injection`, `settings-labs`, `settings-history`

Also extend `HIDE_DYNAMIC_CONTENT` CSS to mask:
- Chart SVGs (`.recharts-surface`, canvas elements)
- Scrollbars (`::-webkit-scrollbar`)
- Editor carets

## Step 2: Capture "Before" Baselines (Phase 0 Commit)

```
1. git stash push -u -m "vr-expanded-spec"    # stash everything including untracked plan files
2. git checkout ad89afeeb9                      # Phase 0 commit (VR setup, no migration)
3. git stash pop                                # restore expanded spec on Phase 0 code
4. yarn                                         # install Phase 0 dependencies
5. yarn dev                                     # start Ghost (TW v3 state)
6. Wait for server at http://localhost:2368
7. yarn reset:data                              # seed deterministic data (--seed 123)
8. npx playwright test -c e2e/visual-regression --update-snapshots
   → Captures golden baselines into e2e/visual-regression/baselines/
9. Stop dev server
```

## Step 3: Capture "After" and Compare (Current HEAD)

```
1. git stash push -m "vr-baselines"            # stash the generated baseline PNGs
2. git checkout DES-1301-twcss4-migration-cld  # return to migration branch HEAD
3. git stash pop                                # restore baselines + expanded spec
4. yarn                                         # install HEAD dependencies (TW v4)
5. yarn dev                                     # start Ghost (TW v4 state)
6. Wait for server at http://localhost:2368
7. yarn reset:data                              # same seed for identical content
8. npx playwright test -c e2e/visual-regression
   → Compares HEAD against Phase 0 baselines
   → Generates diff images in e2e/test-results/ for every failing screen
   → HTML report at e2e/playwright-report/
9. Review HTML report + diff images
```

## Step 4: Investigate Regressions with Playwright MCP

For each failing screen from Step 3:
1. Navigate to the page with `browser_navigate`
2. Take a screenshot with `browser_take_screenshot` to view the current state
3. Use `browser_snapshot` to inspect the DOM accessibility tree
4. Use `browser_evaluate` to check computed styles on specific elements (e.g., which CSS rule wins for `.flex`, `.hidden`)
5. Categorize the regression:
   - **Layout** (elements mispositioned/invisible) → likely cascade/specificity issue
   - **Color** (wrong border/ring/text color) → likely v4 default changes (border→currentColor, ring→currentColor)
   - **Spacing** (padding/margin/shadow differs) → likely missed utility rename (shadow→shadow-sm, rounded→rounded-sm)
   - **Missing elements** → tree-shaking or `hidden` attribute priority change

## Step 5: Fix Regressions

For each identified regression, apply targeted fixes:
- **Ember CSS conflicts:** Adjust import order in `apps/shade/styles.css` or add specificity boosters
- **Missing utility renames:** Find-and-replace in affected `.tsx`/`.hbs` files
- **Default color changes:** Add explicit `border-gray-200`, `ring-blue-500` where bare `border`/`ring` was used
- **Settings layout issues:** Debug the lazy-loading CSS cascade in admin-x-settings

After each fix, re-run `npx playwright test -c e2e/visual-regression` to verify.

## Key Files

| File | Role |
|------|------|
| `e2e/visual-regression/capture-baselines.spec.ts` | Test spec — expand with new screens |
| `e2e/visual-regression/playwright.config.ts` | Config — may need settings for viewport-only screenshots |
| `apps/shade/styles.css` | CSS entry — unlayered TW imports, import order matters |
| `apps/admin/src/index.css` | Admin CSS entry — `@source` directives |
| `apps/admin-x-settings/src/components/settings.tsx` | Settings layout — scroll container `#admin-x-settings-scroller` |
| `ghost/admin/app/styles/patterns/global.css` | Ember's `.flex`, `.hidden` — conflict source |

## Verification

1. `npx playwright test -c e2e/visual-regression` passes all screens within 0.1% pixel threshold
2. HTML report at `e2e/playwright-report/` shows no unexpected diffs
3. Settings page sections all render correctly when scrolled
4. Ember pages (posts, pages, tags, members, editor) match pre-migration appearance
5. `yarn dev` boots cleanly with no CSS console errors
