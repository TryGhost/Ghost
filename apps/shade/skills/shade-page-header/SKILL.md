---
name: shade-page-header
description: Build or revise a page header with Shade's PageHeader contract. Use when adding a page header, changing its actions, or reviewing action order, search, filtering, dropdowns, tooltips or responsive behaviour in a header.
---

# Shade page header

The rules live in the
[PageHeader design contract](../../docs/components/patterns/page-header.md).
Links point into the `docs/` folder beside this package's `skills/` folder
(`node_modules/@tryghost/shade/docs/` in an app); if it's missing, run the
package's `build:docs` script.

## Workflow

1. Read the contract. Sort the screen's actions into icon-only utilities,
   labelled secondaries and an optional primary, and decide the order within
   each group, following
   [Order and hierarchy](../../docs/components/patterns/page-header.md#order-and-hierarchy).
2. Compose the header from its
   [Slots](../../docs/components/patterns/page-header.md#slots) and the
   controls in
   [Constructing controls](../../docs/components/patterns/page-header.md#constructing-controls).
   For the page around it, use
   [`shade-page-templates`](../shade-page-templates/SKILL.md).
3. Read PageHeader's current type declarations and any nearby header before
   implementing. Take appearance and spacing from the shared defaults.
4. Exercise every state the change affects with
   [Review a header](../../docs/components/patterns/page-header.md#review-a-header).

## Self-check

- Every state in the review list that your change touches has been exercised.
- Report which routes, widths and themes you verified, and fix failures before
  marking the header complete.
