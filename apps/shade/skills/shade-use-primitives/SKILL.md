---
name: shade-use-primitives
description: Lay out Ghost UI with Shade's layout primitives. Use when laying out a screen, section or row, or when spacing, aligning, stacking or wrapping elements.
---

# Shade use primitives

Layout in Ghost UI reads by intent: `Stack`, `Inline`, `Box`, `Grid`,
`Container` and `Text` replace hand-written flex and grid classes. The rules
live in [Primitives](../../docs/primitives-guide.md). Links point into the
`docs/` folder beside this package's `skills/` folder
(`node_modules/@tryghost/shade/docs/` in an app); if it's missing, run the
package's `build:docs` script.

## Workflow

1. Check for a larger shape first. A whole page starts from
   [`shade-page-templates`](../shade-page-templates/SKILL.md); a recurring
   product shape may already be a pattern in
   [Patterns](../../docs/patterns-guide.md).
2. Pick the primitive for each wrapper with
   [Use a primitive when](../../docs/primitives-guide.md#use-a-primitive-when).
3. Set gaps and padding from the
   [Spacing scale](../../docs/primitives-guide.md#spacing-scale).
4. Reserve `className` for what
   [the props don't cover](../../docs/primitives-guide.md#classname).

## Self-check

- No wrapper element in your diff carries only layout classes.
- Spacing on primitives uses the named steps, and direction, gap, alignment
  and justification come from props.
- Nothing in [Don't](../../docs/primitives-guide.md#dont) applies to your
  diff.
