---
name: Shade tokens, not hex
description: Use Shade semantic tokens (bg-background, text-foreground, border-border-default, bg-surface-elevated) — never hex, hsl(), or bg-gray-200-style raw palette utilities for UI chrome. Trigger when editing TSX/CSS in Shade-consuming apps.
autoTrigger:
  - fileEdit: "apps/{shade,admin,admin-x-settings,admin-x-framework,posts,stats,activitypub}/**/*.{tsx,css}"
---

# Shade tokens, not hex

Drive every UI colour/border/surface through **semantic tokens**. They flip in dark mode automatically. Hardcoded hex, `hsl(...)`, or raw palette utilities (`bg-gray-200`, `text-zinc-500`) break dark mode and theming.

## Use these instead

| Concern | Semantic token (Tailwind) | CSS var |
|---|---|---|
| Page canvas | `bg-background` | `--background` |
| One step above page | `bg-surface-elevated` | `--surface-elevated` |
| Floating menu on top of elevated | `bg-surface-elevated-2` | `--surface-elevated-2` |
| Primary text | `text-foreground` / `text-primary` | `--text-primary` |
| Secondary / muted text | `text-muted-foreground` | `--text-secondary` |
| Default border (cards, banners, dividers — opaque) | `border-border-default` | `--border-default` |
| Compositing border for floating surfaces (popover, dropdown, select — translucent in dark mode, usually with an opacity modifier like `/60` or `/30`) | `border-border` | `--border` |
| Form-control border (inputs, selects, outline buttons) | `border-control-border` | `--control-border` |
| Hover (generic) | `bg-interactive-hover` | `--interactive-hover` |
| Outline button hover | `bg-button-hover` | `--button-hover` |
| Tabs / page menu hover/active | `bg-tab-hover`, `bg-tab-active` | `--tab-hover`, `--tab-active` |
| Table row hover | `bg-table-row-hover` | `--table-row-hover` |
| Destructive | `bg-destructive`, `text-destructive` | `--destructive` |
| Focus ring | `ring-focus-ring`, `border-focus-ring` | `--focus-ring` |

Full inventory: `apps/shade/theme-variables.css` — this is where the CSS custom property **values** live, including the `.dark { ... }` overrides. The companion file `apps/shade/tailwind.theme.css` is the Tailwind v4 `@theme` block that **maps** Tailwind utility names (`bg-foreground`, `text-muted-foreground`, etc.) to the variables defined in `theme-variables.css`, plus the raw `--color-*` scale. Edit `theme-variables.css` to change a token's value; edit `tailwind.theme.css` to wire a new utility name or add a raw colour.

## Surface elevation — pick by what's behind it

1. `--background` → body, app shell, editor.
2. `--surface-elevated` → sidebars, cards, top bars, sticky headers.
3. `--surface-elevated-2` → floating menus (DropdownMenu, Select, Popover) and the sidebar user menu.

In light mode these all flatten to near-white; borders/shadows carry the elevation. In dark mode they're three distinct colours.

## Interactive surfaces — use the dedicated tokens

Hover, active, and selected states are their own tokens — don't reach for raw greys or apply `/30` opacity modifiers ad-hoc.

| Token | Use for |
|---|---|
| `--interactive-hover` | Generic hover: dropdown items, menu items, list rows, filter options |
| `--button-hover` | Outline / dropdown `Button` hover (aliased to `--interactive-hover`; separate so it can diverge) |
| `--tab-hover` / `--tab-active` | Tabs (button, button-sm, pill, kpis), PageMenu, sidebar menu items, active Toggle (dark) |
| `--table-row-hover` | Shade Table row hover. Also visually-table-like lists (analytics top posts, comments list, members sticky cell). Opaque, unlike the other hover tokens |

## Form-control border

Inputs, textareas, outline `Button`s, dropdown triggers, and the `inputSurface` recipe use `--control-border`, **not** `--border-default`. In dark mode it lifts a step above the page border so form controls keep contrast against the page surface. Borders inside cards or popovers can keep using `--border-default`.

## Correct

```tsx
<div className="bg-surface-elevated border border-border-default rounded-md p-4">
    <p className="text-foreground">Primary copy</p>
    <p className="text-sm text-muted-foreground">Secondary copy</p>
</div>
```

## Incorrect

```tsx
// BAD — raw palette utilities
<div className="bg-gray-50 dark:bg-gray-900 border border-gray-200">

// BAD — hex values
<div style={{ backgroundColor: '#f9fafb', color: '#111' }}>

// BAD — wrapping a token in hsl() (it already contains hsl())
<div style={{ background: 'hsl(var(--background))' }}>

// BAD — opacity-modifier-on-raw-grey instead of the hover token
<div className="hover:bg-gray-900/30">
```

## Inside CSS

```css
/* Correct — variable already contains hsl(...) */
.thing { background: var(--surface-elevated); }

/* Incorrect — double-wraps */
.thing { background: hsl(var(--surface-elevated)); }
```

## When no semantic token fits

Use a **raw token** from `apps/shade/tailwind.theme.css` (chart series, brand assets, illustrations) — never a literal hex. If you need a new colour, add it to `theme-variables.css` (semantic) or `tailwind.theme.css` (raw `@theme`). Don't introduce ad-hoc CSS variables in component files.
