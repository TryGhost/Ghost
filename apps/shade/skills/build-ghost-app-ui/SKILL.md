---
name: build-ghost-app-ui
description: Build a Ghost app's screens with Shade, Ghost's design system, and find its docs and skills. Use when building or changing a Ghost app's UI, or adding Shade to an app.
---

# Build a Ghost app's UI

A Ghost app's screens use Shade (`@tryghost/shade`), the design system Ghost
Admin is built with. This skill sets Shade up and routes to the Shade skills
installed beside it; the rules live in Shade's docs. The app's manifest,
`connect()` and install belong to the `build-ghost-app` skill.

## The docs

Docs links use `https://shade.ghost.org`. If the project's `AGENTS.md` says
where Shade's docs are (another address, or a source folder), use that
instead. At an address, start from `<address>/llms.txt` and fetch web pages
with `curl -s <address>/docs/<page>.md`, so the text arrives exact: a web
fetch tool summarises it and refuses `localhost`.

When sources disagree, trust them in this order:

1. The installed `@tryghost/shade` package (its code and type definitions; it
   ships no docs) decides what exists: components, props and imports. Its
   types match the install.
2. The docs at the address above decide how to use it.
3. Ghost's source, if it's on disk, is reference only. Never import from it,
   and skip its Admin-only rules.

## Set up

Check each step against the app, and do the ones it's missing:

1. Install `@tryghost/shade@alpha` and its peers from npm; `latest` is older.
   `npm create vite` scaffolds React 19, which npm refuses beside Shade, so
   move the React packages and types first, as
   [Install](https://shade.ghost.org/docs/ghost-apps.md#install) shows.
2. Set up [Tailwind and the stylesheet](https://shade.ghost.org/docs/ghost-apps.md#tailwind-and-the-stylesheet).
3. Load the [Fonts](https://shade.ghost.org/docs/ghost-apps.md#fonts).
4. [Wrap the app in ShadeApp](https://shade.ghost.org/docs/ghost-apps.md#wrap-the-app-in-shadeapp).
5. Follow Admin's [Light and dark theme](https://shade.ghost.org/docs/ghost-apps.md#light-and-dark-theme).
6. Set the [Page frame and margins](https://shade.ghost.org/docs/ghost-apps.md#page-frame-and-margins).
7. If the app keeps state in the query string, follow
   [App state in the URL](https://shade.ghost.org/docs/ghost-apps.md#app-state-in-the-url).
8. Add this section to the app's `AGENTS.md`, creating the file if needed.
   Keep any line already there that says where Shade's docs are.

   ```markdown
   ## Shade

   Before building or changing a screen, use the `build-ghost-app-ui` skill.
   Shade docs: https://shade.ghost.org
   ```

## Build a screen

1. Start from the page template with
   [`shade-page-templates`](../shade-page-templates/SKILL.md).
2. As the screen needs them, use
   [`shade-page-header`](../shade-page-header/SKILL.md) for the header,
   [`shade-use-primitives`](../shade-use-primitives/SKILL.md) for layout,
   [`shade-tokens-not-hex`](../shade-tokens-not-hex/SKILL.md) for colour,
   [`shade-no-dark-variants`](../shade-no-dark-variants/SKILL.md) for dark
   mode and [`shade-imports`](../shade-imports/SKILL.md) for imports.
3. Read only the [docs that apply to apps](https://shade.ghost.org/docs/ghost-apps.md#docs-that-apply-to-apps).

## Self-check

Before finishing, confirm in Admin:

- The screen looks right in Admin's light and dark theme, and switches with it.
- Inter loads: `document.fonts` lists it at each weight in
  [Fonts](https://shade.ghost.org/docs/ghost-apps.md#fonts).
- The page has no outer padding of its own.
- Nothing is styled by hand where Shade has a component, primitive or token.
- Every state (empty, loading, error) is reachable with the sample data, and
  uses Shade components.
- The app's `AGENTS.md` has the Shade section.
