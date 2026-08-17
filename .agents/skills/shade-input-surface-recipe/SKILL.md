---
name: Shade inputSurface recipe
description: Use the inputSurface() recipe for form-control chrome (border, background, radius, focus ring, invalid state) — don't roll your own. Trigger when editing form-control-shaped files in Shade.
autoTrigger:
  - fileEdit: "apps/shade/src/components/ui/{input,textarea,input-group,select,combobox,multi-select-combobox,dropzone,calendar,command}.tsx"
---

# Shade — `inputSurface` recipe

Form controls share one visual rule: border, background, radius, transition, focus ring, invalid state. That rule lives in **`inputSurface`** (`apps/shade/src/components/ui/input-surface.ts`) and is used by `Input`, `Textarea`, `InputGroup`, and the `Select` trigger. Don't duplicate the chrome — compose the recipe.

```ts
import {inputSurface, inputSurfaceClasses} from '@/components/ui/input-surface';
import {cn} from '@/lib/utils';
```

## Two common modes

### `inputSurface('self')` — directly on the focusable element

Use on `<input>`, `<textarea>`, or any element that itself receives focus.

```tsx
<input
    className={cn(
        inputSurface('self'),
        'flex h-9 w-full px-3 py-1 text-control placeholder:text-muted-foreground',
        className
    )}
    {...props}
/>
```

Covers: base chrome + `focus-visible:` ring + `aria-[invalid=true]` styling + `disabled:` opacity.

### `inputSurface('within')` — on a wrapper containing a focusable child

Use when the styled element is the wrapper (e.g. `InputGroup`) and focus state should react to **any** focusable descendant via `:has()`.

```tsx
<div className={cn(
    inputSurface('within'),
    'flex h-9 items-center gap-2 px-3',
    className
)}>
    <Icon />
    <input className="bg-transparent outline-hidden focus:outline-hidden" />
</div>
```

Covers: base chrome + `has-[:focus-visible]:` ring + `has-[[aria-invalid=true]]:` styling. (No disabled atom — wrappers don't get a `disabled` HTML attribute.)

## Edge case — only one specific child triggers focus state

When `'within'` is too broad (e.g. a wrapper with multiple focusables but only one should drive chrome), compose atoms manually so Tailwind's JIT can statically detect the class string:

```tsx
import {inputSurfaceClasses} from '@/components/ui/input-surface';

<div className={cn(
    inputSurfaceClasses.base,
    inputSurfaceClasses.invalidWithin,
    // Literal class string — Tailwind needs to see it as text
    'has-[[data-slot=control]:focus-visible]:border-focus-ring',
    'has-[[data-slot=control]:focus-visible]:ring-2',
    'has-[[data-slot=control]:focus-visible]:ring-focus-ring/25'
)} />
```

Available atoms:

- `inputSurfaceClasses.base` — border, background, radius, transition
- `inputSurfaceClasses.focusSelf` — focus chrome for self mode
- `inputSurfaceClasses.focusWithin` — focus chrome for within mode
- `inputSurfaceClasses.invalidSelf` — `aria-[invalid=true]` styling on self
- `inputSurfaceClasses.invalidWithin` — `aria-[invalid=true]` styling on a descendant
- `inputSurfaceClasses.disabledSelf` — disabled styling for self mode

## What the recipe owns vs. what you add

| Recipe owns | You add |
|---|---|
| Border (`border-control-border`) | Height, padding |
| Background (`bg-control-surface`) | Typography (`text-control`, `text-sm`) |
| Radius (`rounded-md`) | Layout (`flex`, `items-center`) |
| Transition (`transition-colors`) | Placeholder styling |
| Focus ring (`focus-visible:ring-focus-ring/25`) | Component-specific tweaks |
| Invalid state (`aria-[invalid=true]:border-destructive`) | Icons / slot positioning |
| Disabled (`disabled:opacity-50`) — self only | — |

## Don't

```tsx
// BAD — rolling your own focus chrome on a form control
<input className="
    rounded-md border border-input bg-background
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
    aria-[invalid=true]:border-red-500
    disabled:opacity-50
" />

// BAD — using inputSurface('within') on a self-focused element (over-broad)
<input className={cn(inputSurface('within'), 'h-9')} />

// BAD — non-literal class concatenation that Tailwind JIT can't see
const dyn = `has-[[data-slot=control]:focus-visible]:${ringColor}`;
```

## Source of truth

`apps/shade/src/components/ui/input-surface.ts` — the JSDoc on `inputSurface` is canonical. Human docs: Storybook → Recipes / inputSurface.
