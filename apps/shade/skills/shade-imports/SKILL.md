---
name: shade-imports
description: Import Shade from its layer subpaths and set up its stylesheet and ShadeApp for the surface. Use when importing from `@tryghost/shade` or adding Shade to an app.
---

# Shade imports

Each Shade layer has its own import subpath, and whether an app loads Shade's
stylesheet and `ShadeApp` depends on who owns its document. The rules live in
[Shade: Imports](../../docs/introduction.md#imports). Links point into the
`docs/` folder beside this package's `skills/` folder
(`node_modules/@tryghost/shade/docs/` in an app); if it's missing, run the
package's `build:docs` script.

## Workflow

1. Take each import from the subpath table in
   [Imports](../../docs/introduction.md#imports).
2. When adding Shade to an app, decide whether it is embedded or standalone
   with
   [Embedded and standalone setup](../../docs/introduction.md#embedded-and-standalone-setup).
3. For a standalone app, follow the package README's
   [standalone setup](../../README.md#usage-in-standalone-surfaces).

## Self-check

- Every Shade import in your diff names a layer subpath from the table.
- A standalone app imports Shade's stylesheet once and renders one `ShadeApp`
  at its root; an embedded Admin app has neither.
