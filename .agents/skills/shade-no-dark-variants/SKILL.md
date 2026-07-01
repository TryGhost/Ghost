---
name: Shade no dark variants
description: Don't write dark: Tailwind variants for colour in Shade or admin apps — semantic tokens flip in dark mode automatically. Trigger when editing TSX in Shade-consuming apps.
autoTrigger:
  - fileEdit: "apps/{shade,admin,admin-x-settings,admin-x-framework,posts,stats,activitypub}/**/*.tsx"
---

# Shade — don't use `dark:` for colour

Shade's semantic tokens (`bg-background`, `text-foreground`, `border-border-default`, `bg-surface-elevated`, …) already flip between light and dark mode. Writing `dark:bg-...` / `dark:text-...` / `dark:border-...` means the engineer reached for a raw, non-semantic token — fix the token, don't patch with a `dark:` variant.

## Correct

```tsx
<div className="bg-surface-elevated border border-border-default text-foreground">
    <p className="text-muted-foreground">Hint text</p>
</div>
```

## Incorrect

```tsx
// BAD — using dark: to patch a raw palette utility
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">

// BAD — redundant: the semantic token already flips itself, so the dark: variant adds a duplicate rule that does nothing. Reading it suggests dark mode is special-cased here when it isn't.
<div className="bg-surface-elevated dark:bg-surface-elevated">
```

## How to fix a `dark:` smell

1. Identify what the class describes — surface? text? border? hover?
2. Pick the matching **semantic token** (see the `shade-tokens-not-hex` skill for the inventory).
3. Drop both the light and the `dark:` halves; the token handles both modes.

## Exceptions

Assets that are genuinely different in dark mode and can't be expressed as a token:

- Logos and brand marks
- Illustrations / SVG art
- Screenshots or imagery

For these, `dark:` is fine because there's nothing semantic to express.

Some existing Shade components also use `dark:` for ring opacity (e.g. `dark:ring-destructive/40` inside `inputSurface`). When a token doesn't exist for the variant you need and the value is an opacity modifier on an existing token, a narrow `dark:` is acceptable — but first check whether a new token belongs in `theme-variables.css`.

## When debugging dark mode

If something looks wrong only in dark mode, the fix is almost always **wrong token**, not **missing `dark:` variant**. Re-pick from the semantic surface table; check `apps/shade/theme-variables.css` for what each token resolves to.
