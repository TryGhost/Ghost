---
name: shade-tokens-not-hex
description: Colour Ghost UI with Shade's semantic tokens. Use when choosing colours or styling UI, including surfaces, text, borders and hover states.
---

# Shade tokens, not hex

Every colour on a Ghost screen comes from a Shade token. The rules live in
[Tokens](https://shade.ghost.org/docs/tokens.md).

Docs links use `https://shade.ghost.org`. If the app's `AGENTS.md` names
another `Shade docs:` address, use that instead. Fetch pages with `curl -s`.

## Workflow

1. Name the job of each colour you're about to write: canvas, surface,
   floating menu, text, border, form control, hover, destructive or focus.
2. Look the job up in
   [Common semantic tokens](https://shade.ghost.org/docs/tokens.md#common-semantic-tokens).
   Choose between close candidates with
   [Surface elevation](https://shade.ghost.org/docs/tokens.md#surface-elevation),
   [Interactive surfaces](https://shade.ghost.org/docs/tokens.md#interactive-surfaces) and
   [Form control borders](https://shade.ghost.org/docs/tokens.md#form-control-borders).
3. Write it the way
   [Rules of consumption](https://shade.ghost.org/docs/tokens.md#rules-of-consumption) shows,
   in classes and in stylesheets.
4. When no semantic token fits, [Two flavours](https://shade.ghost.org/docs/tokens.md#two-flavours)
   and [Source files](https://shade.ghost.org/docs/tokens.md#source-files) say what to use
   instead.

## Self-check

- Every colour, border and hover in your diff is a semantic token, or a raw
  token for a case the docs allow.
- The screen looks right in both light and dark mode. For any `dark:` class,
  run [`shade-no-dark-variants`](../shade-no-dark-variants/SKILL.md).
