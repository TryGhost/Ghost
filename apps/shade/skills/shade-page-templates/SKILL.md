---
name: shade-page-templates
description: Start a Ghost screen from the Shade page template for its page type. Use when starting a new page, route or screen, or when restructuring a page's chrome.
---

# Shade page templates

A new screen starts with one question: what page type is this? The answer
picks the template, and the template supplies the chrome. The rules live in
[Page types](https://shade.ghost.org/docs/page-types.md).

Docs links use `https://shade.ghost.org`. If the project's `AGENTS.md` says
where Shade's docs are (another address, or a source folder), use that
instead. Fetch web pages with `curl -s`.

## Workflow

1. Name the page type from [Page types](https://shade.ghost.org/docs/page-types.md): list page,
   detail page, or one of the shapes
   [not in the taxonomy](https://shade.ghost.org/docs/page-types.md#not-in-the-taxonomy).
2. Start from that type's template and the
   [Example](https://shade.ghost.org/docs/page-types.md#example). For shapes without a template,
   assemble the page as that section says.
3. Compose it with [Composing a page](https://shade.ghost.org/docs/page-types.md#composing-a-page).
4. Build the header's controls with
   [`shade-page-header`](../shade-page-header/SKILL.md), and lay out the body
   with [`shade-use-primitives`](../shade-use-primitives/SKILL.md).

## Self-check

- You can name the page type, and the template matches it.
- Every rule in [Composing a page](https://shade.ghost.org/docs/page-types.md#composing-a-page)
  holds for your page.
