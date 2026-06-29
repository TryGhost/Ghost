---
name: Shade ShadCN install
description: Guardrails for running `pnpm dlx shadcn@latest add` in Shade — never overwrite existing components, fresh branch first, swap raw colours for semantic tokens after integrating. Trigger when the user proposes a shadcn add, or when a fresh ShadCN-shaped file lands in apps/shade/src/components/ui.
autoTrigger:
  - fileEdit: "apps/shade/src/components/ui/**/*.tsx"
---

# Shade — ShadCN install guardrails

Most new Shade components start from a ShadCN install. The CLI is destructive by default — follow these guardrails.

## Command

```bash
pnpm dlx shadcn@latest add <component-name>
```

(Use `pnpm`, not `npx` / `yarn` / `bunx`. Ghost is pnpm.)

## Before running

1. **Be on a fresh branch.** The CLI's diff is mixed in with your branch's changes otherwise.
2. **Check if the component already exists in `apps/shade/src/components/ui/`.** If it does, **do not run the CLI against the repo** — generate into a scratch repo and manually port the parts you want. The CLI will offer to overwrite, and you'd lose Shade customisations.

## During the prompts

- If asked to overwrite an existing file: **choose No.** Always.
- If asked about path aliases: keep `@/`.

## After the file lands — required cleanup

Raw ShadCN output is not Shade-quality yet. Do all of these:

1. **Swap raw colours for semantic tokens.** ShadCN ships things like `bg-white`, `border-gray-200`, `text-zinc-500`. Replace with `bg-surface-elevated`, `border-border-default`, `text-muted-foreground`, etc. See the `shade-tokens-not-hex` skill for the inventory.
2. **Remove any `dark:` colour variants.** Semantic tokens flip automatically. See `shade-no-dark-variants`.
3. **Use the `@/` alias** for internal imports (`@/lib/utils`, `@/components/ui/...`) — not relative paths.
4. **Ensure all four required states** work: default, hover, focus-visible, disabled. (`focus-visible:` only — never `focus:`.)
5. **Trim props that hint at a specific surface.** If a prop name reads like product workflow (`isMembersPage`, `layoutMode`), it doesn't belong on a generic Component — extract a Pattern instead.
6. **For form controls**, drive border/background/focus through the `inputSurface` recipe instead of duplicating the chrome. See `shade-input-surface-recipe`.
7. **Add a sibling `<name>.stories.tsx`** if one isn't already there. Copy useful examples from `https://ui.shadcn.com/docs/components/<name>` into stories. See `shade-new-component`.
8. **forwardRef + className merge via `cn()`** — both are required.

## What ShadCN gets wrong that Shade fixes

| ShadCN default | Shade convention |
|---|---|
| `bg-background dark:bg-background` | `bg-background` (token already flips) |
| `bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50` | `bg-surface-elevated text-foreground` |
| `border border-input` | `border border-control-border` (form controls) or `border-border-default` (other chrome) |
| Direct `focus-visible:ring-2 focus-visible:ring-ring` chrome on every input | `inputSurface('self')` recipe |
| Relative imports `import {cn} from "../../lib/utils"` | `@/` alias: `import {cn} from '@/lib/utils'` |

## When NOT to use the CLI

- The component already exists in Shade — port from a scratch repo instead.
- You're building a Pattern (something Ghost-shaped like `KpiCard`, `PageHeader`). ShadCN doesn't ship Patterns — write it from primitives + components.
- It's a Recipe (pure class-string function). ShadCN doesn't ship Recipes.

## Source of truth

`apps/shade/AGENTS.md`, Storybook → Overview / Contributing.
