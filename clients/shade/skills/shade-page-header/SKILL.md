---
name: shade-page-header
description: Build or revise a page header with Shade's PageHeader contract. Use when adding a page header, changing its actions, or reviewing action order, search, filtering, dropdowns, tooltips or responsive behaviour in a header.
---

# Shade page header

The rules live in the
[PageHeader design contract](https://shade.ghost.org/docs/components/patterns/page-header.md).

Docs links use `https://shade.ghost.org`. If the project's `AGENTS.md` says
where Shade's docs are (another address, or a source folder), use that
instead. Fetch web pages with `curl -s`.

## Workflow

1. Read the contract. Sort the screen's actions into icon-only utilities,
   labelled secondaries and an optional primary, and decide the order within
   each group, following
   [Order and hierarchy](https://shade.ghost.org/docs/components/patterns/page-header.md#order-and-hierarchy).
2. Compose the header from its
   [Slots](https://shade.ghost.org/docs/components/patterns/page-header.md#slots) and the
   controls in
   [Constructing controls](https://shade.ghost.org/docs/components/patterns/page-header.md#constructing-controls).
   For the page around it, use
   [`shade-page-templates`](../shade-page-templates/SKILL.md).
3. Read PageHeader's current type declarations and any nearby header before
   implementing. Take appearance and spacing from the shared defaults.
4. Exercise every state the change affects with
   [Review a header](https://shade.ghost.org/docs/components/patterns/page-header.md#review-a-header).

## Self-check

- Every state in the review list that your change touches has been exercised.
- Report which routes, widths and themes you verified, and fix failures before
  marking the header complete.
