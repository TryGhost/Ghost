---
name: Shade use primitives
description: Replace bare divs that only carry flex/grid/gap utilities with Shade primitives (Stack, Inline, Box, Grid, Container, Text). Use semantic gap="md" instead of gap-4. Trigger when editing TSX in Shade-consuming apps.
autoTrigger:
  - fileEdit: "apps/{shade,admin,admin-x-settings,admin-x-framework,posts,stats,activitypub}/**/*.tsx"
---

# Shade — use primitives, not flex divs

A `<div>` whose className is only `flex / grid / gap / items-* / justify-*` utilities is a primitive call site. Use a Shade primitive instead so layouts read by **intent**, not by class string.

```ts
import {Stack, Inline, Box, Grid, Container, Text} from '@tryghost/shade/primitives';
```

## Picking the primitive

| You need | Use | Element |
|---|---|---|
| Column of children | `Stack` | flex-col |
| Row of children | `Inline` | flex-row (with optional `wrap`, `as`) |
| Padding / radius around content | `Box` | div with `padding`, `radius` props |
| Two-dimensional layout | `Grid` | display: grid |
| Width-constrained shell | `Container` | max-width wrapper |
| Text with size/tone/weight | `Text` | `as`, `size`, `tone`, `weight` |

## Use the semantic gap scale, not raw numbers

`gap="md"` reads as intent and resolves to the shared spacing scale. Mapping:

| Step | Tailwind | Use for |
|---|---|---|
| `none` | `gap-0` | flush |
| `xs` | `gap-1` | inline icons-to-text |
| `sm` | `gap-2` | dense lists, badges |
| `md` | `gap-3` | default row/column spacing |
| `lg` | `gap-5` | section spacing |
| `xl` | `gap-6` | between major blocks |
| `2xl` | `gap-8` | page-level rhythm |

The same scale applies to `Box` padding (`padding="md"` → `p-3`).

## Correct

```tsx
<Box padding="lg" radius="md" className="border border-border-default">
    <Inline align="center" gap="md" justify="between">
        <Stack gap="xs">
            <Text weight="semibold">Email notifications</Text>
            <Text size="sm" tone="secondary">Get notified about engagement.</Text>
        </Stack>
        <Switch />
    </Inline>
</Box>
```

## Incorrect

```tsx
// BAD — bare div doing flex layout
<div className="flex flex-col gap-2">
    <div className="font-semibold">Title</div>
    <div className="text-sm text-gray-600">Hint</div>
</div>

// BAD — raw gap-4 instead of gap="md"
<Stack className="gap-4">
```

## When NOT to reach for a primitive

- A pattern already exists for the shape (page header → `PageHeader`, list page → `ListPage`).
- The wrapper is starting to know about Ghost data — that's a Pattern, not a primitive composition.
- You're inside a Shade primitive's own implementation.

## className still works

Primitives forward `className` and merge with `cn()`. Use it for one-offs the prop API doesn't cover (e.g. `className="border border-border-default"`). Don't reach for `className` to set `flex`, `gap`, `align`, or `justify` — that's what the props are for.
