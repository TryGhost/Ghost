# CodeRabbit Comment Triage (PR #26648)

Date: 2026-03-05
PR: https://github.com/TryGhost/Ghost/pull/26648
Reviewer: `coderabbitai[bot]`

## Scope
- Evaluated all inline CodeRabbit review comments on the PR.
- Did **not** apply fixes.
- Goal: classify each comment for relevance and practical fixability.

## Actionable (Relevant + Fixable)

| Comment | File | Summary | Relevance | Fixability | Notes |
|---|---|---|---|---|---|
| [#2874268137](https://github.com/TryGhost/Ghost/pull/26648#discussion_r2874268137) | `apps/shade/src/components/features/post-share-modal/post-share-modal.tsx` | Add `aria-label` to icon-only share links | High | Easy | Current links are icon-only with no accessible name. |
| [#2874268141](https://github.com/TryGhost/Ghost/pull/26648#discussion_r2874268141) | `apps/shade/src/components/features/post-share-modal/post-share-modal.tsx` | Use `https://` for LinkedIn share URL | Medium | Easy | Current URL still uses `http://www.linkedin.com/...`. |
| [#2874268155](https://github.com/TryGhost/Ghost/pull/26648#discussion_r2874268155) | `apps/shade/src/components/ui/chart.tsx` | Replace undefined `var(--gray-500)` | Medium | Easy | `--gray-500` is not defined in Shade variables; usage still present at line 372. |
| [#2874320502](https://github.com/TryGhost/Ghost/pull/26648#discussion_r2874320502) | `apps/posts/src/views/PostAnalytics/Newsletter/newsletter.tsx` | Remove no-op `text-sm!` / `lg:text-base` from 9px indicator dots | Low | Easy | Classes appear on non-text dot elements; no visible effect. |
| [#2874320508](https://github.com/TryGhost/Ghost/pull/26648#discussion_r2874320508) | `apps/stats/src/views/Stats/Newsletters/newsletters.tsx` | Replace hardcoded `colSpan={5}` with dynamic `colSpan` | Medium | Easy | Dynamic `colSpan` variable exists; empty state still hardcoded to 5. |
| [#2874342584](https://github.com/TryGhost/Ghost/pull/26648#discussion_r2874342584) | `apps/shade/tailwind.config.cjs` | Guard `rounded-xs` against negative radii | Low | Easy | `calc(var(--radius) - 6px)` can become invalid for small radius values. |

## Not Actionable / Not Currently Relevant

| Comment | File | Summary | Triage | Reason |
|---|---|---|---|---|
| [#2874268123](https://github.com/TryGhost/Ghost/pull/26648#discussion_r2874268123) | `apps/admin/src/index.css` | Stylelint config needed for `@source` | Not currently relevant | Repo currently has no active stylelint config path for this file, and CI lint is passing. Recommendation appears based on assumptions not matching current setup. |
| [#2874268132](https://github.com/TryGhost/Ghost/pull/26648#discussion_r2874268132) | `apps/shade/preflight.css` | Quote multi-word `font-family` names | Low-priority / optional | Technically fine at runtime; only relevant if a strict `font-family-name-quotes` stylelint rule is enforced for this file path. |
| [#2874342581](https://github.com/TryGhost/Ghost/pull/26648#discussion_r2874342581) | `apps/shade/tailwind.config.cjs` | “Scoping behavior is correctly preserved...” | Informational | This is mostly a validation comment, not a defect report. Its only actionable part duplicates #2874342584. |
| [#2874342594](https://github.com/TryGhost/Ghost/pull/26648#discussion_r2874342594) | `apps/shade/tailwind.config.cjs` | Restore `tailwindcss-animate` plugin | Outdated / superseded | Shade now imports `tw-animate-css` in `apps/shade/styles.css` and comment itself notes it was addressed in later commits. |

## Suggested Next Pass (when you want fixes)
1. Tackle the six actionable items above in a single cleanup commit.
2. Leave the non-actionable/outdated set untouched unless project policy changes (e.g., stricter CSS linting rules are introduced).
