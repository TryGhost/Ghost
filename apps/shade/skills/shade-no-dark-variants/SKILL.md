---
name: shade-no-dark-variants
description: Make dark mode work through Shade's semantic tokens. Use when writing or reviewing `dark:` classes, or when something looks wrong only in dark mode.
---

# Shade no dark variants

Shade's semantic tokens carry both themes. The rules, the fix and the
exceptions live in
[Tokens: Dark mode](https://shade.ghost.org/docs/tokens.md#dark-mode).

Docs links use `https://shade.ghost.org`. If the project's `AGENTS.md` says
where Shade's docs are (another address, or a source folder), use that
instead. Fetch web pages with `curl -s`.

## Workflow

1. Find every `dark:` class in the code you're writing or reviewing.
2. For each one that sets a colour, follow the three fix steps in
   [Dark mode](https://shade.ghost.org/docs/tokens.md#dark-mode). Pick the replacement token
   with [`shade-tokens-not-hex`](../shade-tokens-not-hex/SKILL.md).
3. Keep a `dark:` class only when it matches an exception that section names.
4. When debugging a dark-mode-only problem, change the token rather than
   adding a variant.

## Self-check

- Each remaining `dark:` class is one of the documented exceptions.
- You viewed the changed screen in both themes.
