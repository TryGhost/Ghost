---
name: shade-no-dark-variants
description: Make dark mode work through Shade's semantic tokens. Use when writing or reviewing `dark:` classes, or when something looks wrong only in dark mode.
---

# Shade no dark variants

Shade's semantic tokens carry both themes. The rules, the fix and the
exceptions live in [Tokens: Dark mode](../../docs/tokens.md#dark-mode). Links
point into the `docs/` folder beside this package's `skills/` folder
(`node_modules/@tryghost/shade/docs/` in an app); if it's missing, run the
package's `build:docs` script.

## Workflow

1. Find every `dark:` class in the code you're writing or reviewing.
2. For each one that sets a colour, follow the three fix steps in
   [Dark mode](../../docs/tokens.md#dark-mode). Pick the replacement token
   with [`shade-tokens-not-hex`](../shade-tokens-not-hex/SKILL.md).
3. Keep a `dark:` class only when it matches an exception that section names.
4. When debugging a dark-mode-only problem, change the token rather than
   adding a variant.

## Self-check

- Each remaining `dark:` class is one of the documented exceptions.
- You viewed the changed screen in both themes.
