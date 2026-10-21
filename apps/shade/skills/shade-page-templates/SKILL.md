---
name: shade-page-templates
description: Start a Ghost screen from the Shade page template for its page type. Use when starting a new page, route or screen, or when restructuring a page's chrome.
---

# Shade page templates

A new screen starts with one question: what page type is this? The answer
picks the template, and the template supplies the chrome. The rules live in
[Page types](../../docs/page-types.md). Links point into the `docs/` folder
beside this package's `skills/` folder (`node_modules/@tryghost/shade/docs/`
in an app); if it's missing, run the package's `build:docs` script.

## Workflow

1. Name the page type from [Page types](../../docs/page-types.md): list page,
   detail page, or one of the shapes
   [not in the taxonomy](../../docs/page-types.md#not-in-the-taxonomy).
2. Start from that type's template and the
   [Example](../../docs/page-types.md#example). For shapes without a template,
   assemble the page as that section says.
3. Compose it with [Composing a page](../../docs/page-types.md#composing-a-page).
4. Build the header's controls with
   [`shade-page-header`](../shade-page-header/SKILL.md), and lay out the body
   with [`shade-use-primitives`](../shade-use-primitives/SKILL.md).

## Self-check

- You can name the page type, and the template matches it.
- Every rule in [Composing a page](../../docs/page-types.md#composing-a-page)
  holds for your page.
