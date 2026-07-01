---
name: Shade dropdown surface contract
description: DropdownMenu, Select, and Popover share one visual recipe (bg-surface-elevated-2 + border-border/60 dark:border-border/30 + shadow-md). Change them together. Trigger when editing any of those three Shade files.
autoTrigger:
  - fileEdit: "apps/shade/src/components/ui/{dropdown-menu,select,popover}.tsx"
---

# Shade — dropdown surface contract

`DropdownMenu`, `Select`, and `Popover` are the three Radix-backed floating menus that `Filters` and the rest of admin use. They share **one visual recipe**:

```text
bg-surface-elevated-2
border border-border/60 dark:border-border/30
shadow-md
```

Treat them as one component for any surface decision. **If you change the surface for one, change all three.**

## Why this exists

Floating menus open ON TOP of an already-elevated surface (sidebars, cards, top bars). They need to read as floating above their trigger. `--surface-elevated-2` is reserved for exactly this — popovers, dropdown content, and the sidebar user menu.

In light mode the three surface tokens (`background` / `surface-elevated` / `surface-elevated-2`) flatten to near-white; the border + `shadow-md` carry elevation. In dark mode they're three distinct colours so layered surfaces stay legible without relying on borders alone.

## The contract

| Concern | Class |
|---|---|
| Background | `bg-surface-elevated-2` |
| Border | `border border-border/60 dark:border-border/30` |
| Shadow | `shadow-md` baseline. **`DropdownMenuContent` is the exception — it uses `shadow-lg`.** `DropdownMenuSubContent`, `SelectContent`, and `PopoverContent` all use `shadow-md`. |
| Radius | `rounded-md` (component default) |
| Animation | Standard Radix `data-[state=open]:` enter/exit set |

The shadow split is intentional: the top-level `DropdownMenuContent` opens straight out of an unelevated trigger (a button on the page canvas) and needs the stronger drop. `DropdownMenuSubContent` already pops from inside a floating menu, so it uses the lighter `shadow-md` to avoid double-stacking elevation. `Select` and `Popover` also open from low-elevation triggers but their content sits closer to the trigger surface, so `shadow-md` is enough.

The `dark:border-border/30` is a legitimate exception to the no-`dark:`-for-colour rule — it's an opacity modifier on an existing semantic token. See `shade-no-dark-variants`.

## Changing the surface

If a design change touches the floating-menu surface (background, border, shadow, elevation), edit **all three** files:

- `apps/shade/src/components/ui/dropdown-menu.tsx` (`DropdownMenuContent` and `DropdownMenuSubContent`)
- `apps/shade/src/components/ui/select.tsx` (`SelectContent`)
- `apps/shade/src/components/ui/popover.tsx` (`PopoverContent`)

If a fourth Radix-backed surface needs the same recipe, extract it as a `floatingSurface` recipe under `apps/shade/src/components/ui/`. Two consumers is too thin to justify a Recipe; three is the current count and just covered by mirroring.

## Items inside the menu

Hover state on menu items uses `--interactive-hover` (`bg-interactive-hover`) — the generic hover token. **Don't** use raw greys or apply ad-hoc opacity modifiers (`hover:bg-gray-900/30`). The interactive tokens already handle dark-mode translucency so they composite over the floating surface correctly.

## Don't

```tsx
// BAD — changing dropdown surface but not Select / Popover
// In dropdown-menu.tsx:
'bg-surface-elevated border border-border/40 shadow-xl'  // <-- drifted from contract

// BAD — raw greys for hover instead of the interactive token
'hover:bg-gray-100 dark:hover:bg-gray-800'

// BAD — surface-elevated (not -2) on a floating menu
// loses the visual elevation above already-elevated triggers
'bg-surface-elevated'
```

## Related skill

Hover/active/selected state tokens (`--interactive-hover`, `--button-hover`, `--tab-hover`, `--table-row-hover`): see `shade-tokens-not-hex`.

## Source of truth

`apps/shade/AGENTS.md` (Tokens & dark mode → Dropdown surface contract). Storybook → Tokens / Tokens Guide.
