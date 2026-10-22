---
name: shade-imports
description: Import Shade from its layer subpaths and set up its stylesheet and ShadeApp for the surface. Use when importing from `@tryghost/shade` or adding Shade to an app.
---

# Shade imports

Each Shade layer has its own import subpath, and whether an app loads Shade's
stylesheet and `ShadeApp` depends on who owns its document. The rules live in
[Shade: Imports](https://shade.ghost.org/docs/introduction.md#imports).

Docs links use `https://shade.ghost.org`. If the app's `AGENTS.md` names
another `Shade docs:` address, use that instead. Fetch pages with `curl -s`.

## Workflow

1. Take each import from the subpath table in
   [Imports](https://shade.ghost.org/docs/introduction.md#imports).
2. When adding Shade to an app, decide whether it is embedded or standalone
   with
   [Embedded and standalone setup](https://shade.ghost.org/docs/introduction.md#embedded-and-standalone-setup).
3. For a standalone app, such as a Ghost app, follow
   [`build-ghost-app-ui`](../build-ghost-app-ui/SKILL.md).

## Self-check

- Every Shade import in your diff names a layer subpath from the table.
- A standalone app imports Shade's stylesheet once and renders one `ShadeApp`
  at its root; an embedded Admin app has neither.
