---
name: Shade component decision
description: Decide which Shade layer (Token, Primitive, Component, Recipe, Pattern) a new piece of UI belongs in — and whether it should be added to Shade at all. Trigger when creating new files in apps/shade/src/components, or proposing to add a new Shade component.
autoTrigger:
  - fileEdit: "apps/shade/src/components/**/*.{ts,tsx}"
---

# Shade — pick the right layer (and decide whether to add to Shade at all)

Before adding anything to Shade, walk the decision flow and the promotion checklist. The default is **keep code local first** — premature design system additions lock in the wrong API.

## The five layers

| Layer | Lives in | Examples |
|---|---|---|
| **Token** | `theme-variables.css`, `tailwind.theme.css` | `--background`, `--text-base`, `--radius-md` |
| **Primitive** | `src/components/primitives/` | `Stack`, `Inline`, `Box`, `Grid`, `Container`, `Text` |
| **Component** | `src/components/ui/` | `Button`, `Input`, `Dialog`, `Tabs`, `Card` |
| **Recipe** | `src/components/ui/<name>.ts` (no JSX) | `inputSurface` |
| **Pattern** | `src/components/patterns/` | `PageHeader`, `KpiCard`, `Filters`, `GhAreaChart` |

Plus two additional barrels:

- **`page-templates/`** (`@tryghost/shade/page-templates`) — top-level page wrappers (`ListPage` today). Composes Patterns + Components + Primitives. If you're building a new shape that wraps a whole admin page, this is where it goes. See `shade-page-templates`.
- **`posts-stats/`** (`@tryghost/shade/posts-stats`) — transitional layer for components shared between `apps/posts` and `apps/stats` until those merge. Don't add to it unless the file is genuinely posts-or-stats-only and shared between both apps.

## Decision flow (top-to-bottom, stop at first match)

1. **Just a colour, size, radius, duration?** → **Token**. Add to `theme-variables.css` (semantic) or `tailwind.theme.css` (raw `@theme`).
2. **Layout-only (spacing, alignment, structure)?** → **Primitive**. Reuse an existing one; only add a new one if the structural shape is genuinely novel.
3. **Generic, accessible UI control with no Ghost-specific knowledge?** → **Component**. Reuse first; only add if it doesn't exist and the promotion checklist below passes.
4. **The same chrome / focus / density rule shared across ≥ 2 components?** → **Recipe**. A class-string function (no JSX, no React) next to the components in `src/components/ui/`.
5. **Knows about Ghost (KPIs, members, posts, newsletters, analytics)?** → **Pattern**.

**Quick gut check: generic name → Component; Ghost-shaped name → Pattern.** `Button` is web-y; `KpiCard` is Ghost-y.

## Allowed dependencies (one-way)

Each layer can use anything **below** it. The reverse is forbidden.

- A Button can't reach into a Pattern.
- A Primitive can't import a Component.
- A Recipe is pure CSS classes — no React, no JSX.

## Promotion checklist — add to Shade only if ALL are true

1. **Reused at least twice in different surfaces.** Actual second use, not "we might reuse this."
2. **It's generic.** A `<MembersTable>` that's just `<Table>` with three preset columns belongs in the app, not Shade.
3. **The shape has settled.** Slots and composition have been stable across both local copies for at least one iteration.
4. **It has a generic name.** `PageHeader`, `KpiCard`, `PostShareModal` — not `MembersFilterBar` or `PostAnalyticsHero`.
5. **The API is slots, not props.** 3–6 named subcomponents (`.Title`, `.Actions`, `.Body`) — not `<ListPage title="..." onAdd={...} columns={...} />`.
6. **State stays with the consumer.** No `useQuery`, no routing, no app-context reads inside Shade.

**Fail any of these? Keep it local.** Build it again somewhere else first, then promote.

## Common misclassifications

| Tempting | Actually | Why |
|---|---|---|
| Add a `variant="kpi"` to `Card` | New Pattern `KpiCard` | Product-specific shape, generic Component shouldn't know about it |
| Add `<MembersFilterBar>` to patterns | Keep local in `apps/admin-x-settings` | Single-surface name |
| Add a one-off class string as a recipe | Inline it in the one component | Recipes are for shared rules across ≥ 2 components |
| Add a `useQuery`-driven `<MembersList>` to patterns | Keep local — patterns are state-free | Bring-your-own state |
| Wrap a `<div className="flex gap-3">` as a new primitive | Use `Inline gap="md"` | Already covered |

## When you've decided

- New **Component** or **Pattern** → also see the `shade-new-component` skill for the file/story/state checklist.
- New **Recipe** → no JSX, follow the `recipeClasses` + `recipe()` shape (see `apps/shade/src/components/ui/input-surface.ts`).
- New **Token** → add to `apps/shade/theme-variables.css` (semantic + dark-mode override) or `apps/shade/tailwind.theme.css` (raw `@theme`). Never an ad-hoc CSS variable in a component file.

## Source of truth

Full rules: `apps/shade/AGENTS.md`. Human-facing: Storybook → Overview / Layers.
