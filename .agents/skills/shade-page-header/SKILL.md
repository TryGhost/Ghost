---
name: Shade page header
description: Construct or revise Admin page headers and header controls using the shared PageHeader contract. Use when adding a header, changing its actions, or reviewing ordering, responsive behavior, search, filtering, dropdowns, or tooltips in a header.
---

# Construct a Shade page header

1. Read the canonical [PageHeader design contract](../../../apps/shade/src/components/patterns/page-header.mdx)
   and its [live stories](../../../apps/shade/src/components/patterns/page-header.stories.tsx).
   Identify the screen's labelled secondaries, icon utilities and optional primary;
   decide the frequency order within each group before composing them.
2. Use the existing PageHeader compound controls and slots. Keep permissions,
   routing, queries and shortcut bindings in the feature. For page-template choice,
   use [Shade page templates](../shade-page-templates/SKILL.md).
3. Read the current PageHeader API and nearby header before implementing. Use
   shared defaults for appearance and spacing; preserve the previous
   structure through `useShade().isAdmin7` while compatibility exists.
4. Exercise every state affected by the change using the contract's review
   checklist. Report which routes, widths, themes and compatibility modes were
   verified, and address failures before marking the header complete.

When the shared convention changes, update the component and its attached
Storybook contract together. Keep the design rules in that canonical document.
