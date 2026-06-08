# Shade — Agent guide

Canonical, rule-shaped reference for AI-assisted work on Shade and any admin app that consumes it. Storybook docs at `apps/shade/src/docs/` are the human-facing surface (visual, designer-focused). **This file is the source of truth for decisions.**

## Core assumptions

- **Shade is the default source for Ghost Admin UI.** Reach for it first. If a usable primitive, component, recipe, or pattern exists, use it.
- **Shade is admin-only.** Don't generate install instructions, stylesheet imports, or `ShadeApp` setup snippets — every admin app is already wired up.
- **Imports come from layer-specific subpaths**, never the root barrel:
  ```ts
  import {Stack, Inline, Box, Grid, Container, Text} from '@tryghost/shade/primitives';
  import {Button, Input, Dialog} from '@tryghost/shade/components';
  import {PageHeader, ListPage, KpiCard} from '@tryghost/shade/patterns';
  import {PostShareModal} from '@tryghost/shade/posts-stats';
  import {cn} from '@tryghost/shade/utils';
  import {ShadeApp} from '@tryghost/shade/app';
  ```
- Inside Shade itself, use the `@/` alias for cross-file imports.

## The five layers

| Layer | Path | Use when | Examples |
|---|---|---|---|
| **Tokens** | `theme-variables.css`, `tailwind.theme.css` | You need a colour, size, duration, radius | `--background`, `--text-base`, `--radius-md` |
| **Primitives** | `src/components/primitives/` | You need layout structure | `Stack`, `Inline`, `Box`, `Grid`, `Container`, `Text` |
| **Components** | `src/components/ui/` | You need a generic, accessible UI control | `Button`, `Input`, `Dialog`, `Tabs`, `Card`, `DropdownMenu` |
| **Recipes** | `src/components/ui/<name>.ts` | Several components share the same visual rule (chrome, focus, density) | `inputSurface` |
| **Patterns** | `src/components/patterns/` | The shape is product-specific and recurs across Admin | `PageHeader`, `ListPage`, `Filters`, `KpiCard`, `GhAreaChart` |

Plus one transitional layer: **`posts-stats/`** for components shared between `apps/posts` and `apps/stats` until those merge. Don't generalise it.

## Decision flow: where does new code go?

When building a new UI shape, walk this top-to-bottom and stop at the first match.

1. **Is it just a colour, size, radius, duration?** → **Token**. Add to `theme-variables.css` (semantic) or `tailwind.theme.css` (`@theme` raw).
2. **Is it layout-only (spacing, alignment, structure)?** → **Primitive**. Use an existing one (`Stack`, `Inline`, `Box`, `Grid`, `Container`, `Text`); only add a new one if the structural shape is genuinely novel.
3. **Is it a generic, accessible UI control with no Ghost-specific knowledge?** → **Component**. Reuse an existing one in `src/components/ui/`. Only add a new component if it doesn't exist and the rules below pass.
4. **Is it the same chrome / focus / density rule shared across ≥ 2 components?** → **Recipe**. A class-string function next to the components in `src/components/ui/`.
5. **Does it know about Ghost (KPIs, members, posts, newsletters, analytics)?** → **Pattern**.

Quick gut check: **generic name → Component; Ghost-shaped name → Pattern.** `Button` is web-y; `KpiCard` is Ghost-y.

## When to ADD to Shade vs keep local

The default is to **keep code local first**. Premature design system additions lock in the wrong API and every consumer pays when you change it.

Promote to Shade only when **all** are true:

1. **Reused at least twice in different surfaces.** Not "we might reuse this" — actual second use.
2. **It's generic.** A `<MembersTable>` that's just `<Table>` with three pre-set columns is not a Shade thing; it belongs in the app.
3. **The shape has settled.** Slots and composition have been stable across both local copies for at least one iteration cycle.
4. **It has a generic name.** `PageHeader`, `KpiCard`, `PostShareModal`. Not `MembersFilterBar` or `PostAnalyticsHero` — those name a single surface and will date.
5. **The API is slots, not props.** 3–6 named subcomponents (`.Title`, `.Actions`, `.Body`), not a `<ListPage title="..." onAdd={...} columns={...} />` prop bag.
6. **State stays with the consumer.** No `useQuery`, no routing, no app-context reads inside Shade.

Fail any of these? Keep it local. Build it again somewhere else first, then promote.

## Conventions

### File names

- Files: kebab-case (`dropdown-menu.tsx`) — matches ShadCN CLI output.
- Components: PascalCase exports (`DropdownMenu`).
- Hooks, functions, variables: camelCase.

### Component file structure

- One `<name>.tsx` per component (or compound family).
- Sibling `<name>.stories.tsx` is required.
- Use `cn()` to merge classes (`@tryghost/shade/utils` for consumers, `@/lib/utils` inside Shade).
- Use `cva()` for variants. Forward and merge `className` so consumers can extend without wrapping.
- For multi-region components, expose compound subcomponents (`.Title`, `.Actions`, …) — not a prop bag.

### Storybook titles

| Layer | Title prefix |
|---|---|
| Primitive | `Primitives / <Name>` |
| Component | `Components / <Name>` |
| Recipe | `Recipes / <Name>` |
| Pattern | `Patterns / <Name>` |
| Posts–Stats interim | `Posts–Stats / <Name>` |
| Token gallery | `Tokens / <Topic>` |

Use `tags: ['autodocs']`. Add a short `parameters.docs.description.component`. Per-story `parameters.docs.description.story` is a one-liner explaining when to use that variant.

### Tokens & dark mode

- Use **semantic tokens** (`bg-background`, `text-foreground`, `border-border-default`, `var(--surface-elevated)`) — these flip in dark mode automatically.
- Never hard-code hex or `hsl()` values, even temporarily.
- Don't write `dark:` Tailwind variants for colour. The tokens do that. (Exceptions: assets like logos/illustrations.)
- Inside stylesheets, use `var(--token)` directly. Don't wrap in `hsl()` — the variables already contain `hsl(…)`.
- New tokens go in `apps/shade/theme-variables.css` (semantic + dark-mode overrides) or `apps/shade/tailwind.theme.css` (raw `@theme`).

### Required states for components

Every interactive component must work in **default, hover, focus-visible, disabled** before anything else. Optional states (active, loading, error, empty) are documented when they apply. Each state should be visible in the story.

For form controls, drive chrome through the `inputSurface` recipe — don't roll your own focus ring.

## ShadCN guardrails

Most new components start from a ShadCN install:

```bash
pnpm dlx shadcn@latest add <component-name>
```

- **Never overwrite an existing Shade component** when the CLI prompts. Choose "No".
- Run on a fresh branch before installing.
- If the component already exists, generate into a scratch repo and manually port the parts you want.
- After integrating: swap raw colours for semantic tokens, ensure the four required states work, trim any props that hint at a specific surface, copy useful examples from `https://ui.shadcn.com/docs/components/<name>` into the story.
- Use the `@` alias for internal imports (e.g. `@/lib/utils`).

## Build, test, dev

| Command | Purpose |
|---|---|
| `pnpm storybook` | Run Storybook locally (visual verification) |
| `pnpm build` | Type declarations + Vite library build to `es/` |
| `pnpm build-storybook` | Static Storybook export |
| `pnpm test` | Type-check + Vitest with coverage |
| `pnpm test:unit` | Unit tests only |
| `pnpm test:types` | TS type-check only |
| `pnpm lint` | ESLint (src + tests, `tailwindcss/*` rules enabled) |

Always run `pnpm lint` before committing.

## Testing expectations

Formal testing strategy is TBD. Interim rules:

- Vitest + Testing Library + jsdom.
- Location: `test/unit/**/*.test.(ts|tsx|js)`.
- Use `test/unit/utils/test-utils.tsx`'s `render` helper when a wrapper is needed.
- For new UI components, prioritise comprehensive Storybook stories; add focused unit tests where they pay off (hooks, utils, logic-heavy parts).
- No strict coverage threshold yet — just run `pnpm test` locally and keep it green.

## Anti-patterns (don't do these)

- **Don't import `@tryghost/shade/styles.css` separately from an embedded admin app.** The admin entry point is the single CSS lane; importing twice causes duplicate utilities and cascade conflicts.
- **Don't import from the root `@tryghost/shade` barrel.** Use layer-specific subpaths.
- **Don't add `dark:` variants for colour.** Use semantic tokens.
- **Don't add product-specific props to a generic Component.** Extract a Pattern wrapper.
- **Don't put `useQuery` or app-context reads inside a Pattern.** Patterns are layout/composition contracts. Bring-your-own state.
- **Don't rename ShadCN-generated files** purely for casing.
- **Don't generalise `posts-stats/`.** It's named for one specific historical situation and goes away on its own.
- **Don't create new top-level CSS files.** Tokens live in `theme-variables.css` and `tailwind.theme.css`.
- **Don't add migration / setup / install instructions to component docs.** Shade is admin-only and already wired up.

## Commit & PR conventions

Commit messages are the release notes.

```
Added Avatar component

ref https://linear.app/ghost/issue/DES-1234/avatar

Builds on Radix Avatar with a size variant scale and a fallback initials slot.
```

- **Line 1**: ≤ 80 chars, past tense. Starts with one of: `Fixed`, `Changed`, `Updated`, `Improved`, `Added`, `Removed`, `Reverted`, `Moved`, `Released`, `Bumped`, `Cleaned`.
- **Line 2**: blank.
- **Line 3**: magic word (`ref`, `closes`, `fixes`) + space + **full Linear URL**. Not `ref:` (no colon).
- **Line 4+**: explain the **why**, not the what.
- Dependency bumps: focus the message on user-visible changes.

PRs: describe the change, link the Linear issue, include screenshots or GIFs for any UI change, update or add stories.

## Acceptance checklist (component)

Before marking a component done:

- [ ] Lives in the right layer (re-read **Decision flow** above)
- [ ] `className` forwarded and merged with `cn()`
- [ ] Default, hover, focus-visible, disabled all work and are visible in the story
- [ ] No hex values, no `bg-gray-200`-style raw palette utilities for UI chrome — semantic tokens only
- [ ] No product-specific props on a generic Component
- [ ] Story covers variants + states with one-line "when to use" descriptions
- [ ] `pnpm lint`, `pnpm test`, and Storybook all clean

## Repo layout

```
apps/shade/
├── theme-variables.css            Runtime semantic tokens + dark mode
├── tailwind.theme.css             Tailwind @theme raw catalogue
├── .storybook/                    Storybook config (preview.tsx controls sort order)
└── src/
    ├── components/
    │   ├── primitives/            Layout primitives
    │   ├── ui/                    Generic controls + recipes
    │   ├── patterns/              Product compositions
    │   └── posts-stats/           Interim Posts ↔ Stats shared
    ├── docs/                      MDX + token showcase stories
    │   ├── showcase/              Internal-only token display components
    │   └── tokens/                Token visual stories
    ├── hooks/                     Generic React hooks
    ├── lib/                       Utilities (cn, formatters, chart helpers)
    └── providers/                 Context providers
```

Entrypoint barrels (`components.ts`, `primitives.ts`, `patterns.ts`) re-export from the matching folder.

## Human docs

The MDX in `src/docs/` and the per-component stories are the **human-facing** surface. They're short, visual, example-driven. If a human-facing rule conflicts with this file, **this file wins** — and that's a sign the MDX needs updating.
