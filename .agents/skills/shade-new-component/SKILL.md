---
name: Shade new component
description: Acceptance checklist for adding or editing a Shade component or pattern file — naming, sibling story, className forwarding, cva variants, required states, recipe usage. Trigger when editing files in apps/shade/src/components.
autoTrigger:
  - fileEdit: "apps/shade/src/components/**/*.{ts,tsx}"
---

# Shade — new component / pattern checklist

Before marking a Shade component or pattern done, this checklist must pass.

## Files and naming

- File: **kebab-case** (`dropdown-menu.tsx`) — matches ShadCN CLI output. Don't rename for casing.
- Exported identifier: **PascalCase** (`DropdownMenu`).
- Hooks, functions, variables: camelCase.
- Sibling **`<name>.stories.tsx`** is required (same folder).
- Inside Shade itself, import via the `@/` alias (`@/lib/utils`, `@/components/ui/input-surface`).

## Storybook title prefix

| Layer | Title |
|---|---|
| Primitive | `Primitives / <Name>` |
| Component | `Components / <Name>` |
| Recipe | `Recipes / <Name>` |
| Pattern | `Patterns / <Name>` |
| Posts–Stats interim | `Posts–Stats / <Name>` |
| Token gallery | `Tokens / <Topic>` |

Required on every story file:

- `tags: ['autodocs']`
- `parameters.docs.description.component` — short one-line summary
- Per-story `parameters.docs.description.story` — one-liner explaining when to use that variant
- One story per important variant/state. Many small focused stories > one prose-heavy story.

## Component shape

```tsx
import * as React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';

const thingVariants = cva('base-classes-here', {
    variants: {
        variant: {default: '...', destructive: '...'},
        size: {default: '...', sm: '...'}
    },
    defaultVariants: {variant: 'default', size: 'default'}
});

export interface ThingProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof thingVariants> {}

const Thing = React.forwardRef<HTMLDivElement, ThingProps>(
    ({className, variant, size, ...props}, ref) => (
        <div
            ref={ref}
            className={cn(thingVariants({variant, size, className}))}
            {...props}
        />
    )
);
Thing.displayName = 'Thing';

export {Thing, thingVariants};
```

Hard requirements:

- `className` forwarded and merged via `cn()` — never overwritten, never dropped. Applies to every component that renders DOM.
- Visual/interactive props only (`variant`, `size`, `loading`). **No workflow props** (`isMembersPage`, `layoutMode`) — those mean you actually need a Pattern wrapper.
- Multi-region components expose compound subcomponents (`.Title`, `.Actions`, `.Body`) — not a prop bag.

When applicable:

- **`forwardRef`** — use when the component renders a single DOM element consumers might need a ref to (most UI controls). Skip for: pure provider/context wrappers, Radix root re-exports that don't render DOM themselves, and components whose `ref` semantics are already handled by a child.
- **`cva()`** — use when the component has variants or stateful class branches (`variant`, `size`, `tone`). Skip for simple single-style components where a `cn(...)` call is clearer.
- **Recipes** (`<name>.ts`, no JSX): no `forwardRef`, no `cva()`, no React. They return class strings.

## Required states (all four)

Every interactive component must work in:

- **default**
- **hover**
- **focus-visible** (use `focus-visible:`, never `focus:`)
- **disabled**

Each state visible in the story. Optional states (active, loading, error, empty) only when they apply.

For form controls, drive chrome through the **`inputSurface` recipe** — don't roll your own border/focus ring. See the `shade-input-surface-recipe` skill.

## Tokens

- No hex values. No `bg-gray-200`-style raw palette utilities for UI chrome.
- No `dark:` variants for colour — semantic tokens handle dark mode.

See `shade-tokens-not-hex` and `shade-no-dark-variants`.

## Before marking done

- [ ] Lives in the right layer (`shade-component-decision`)
- [ ] kebab-case filename, PascalCase export, sibling `<name>.stories.tsx`
- [ ] `className` forwarded and merged with `cn()` (always)
- [ ] `forwardRef` if the component renders DOM consumers might ref
- [ ] `cva()` if the component has variants; `defaultVariants` set
- [ ] All four required states work and are visible in the story
- [ ] Semantic tokens only — no hex, no raw greys, no `dark:` colour variants
- [ ] No product-specific props on a generic Component
- [ ] Story has `tags: ['autodocs']`, component description, and one-line per-story descriptions
- [ ] `pnpm lint`, `pnpm test`, and Storybook all clean

## Source of truth

`apps/shade/AGENTS.md`. Human docs: Storybook → Overview / Contributing.
