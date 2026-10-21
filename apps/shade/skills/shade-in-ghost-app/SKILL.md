---
name: shade-in-ghost-app
description: Set up Shade in a Ghost app and build its screens to match Admin. Use when adding Shade to a Ghost app, or starting or checking an app's screen.
---

# Shade in a Ghost app

A Ghost app is a full page framed inside Ghost Admin, so it sets Shade up for
itself. The rules live in
[Using Shade in a Ghost app](../../docs/ghost-apps.md). Links point into the
`docs/` folder beside this package's `skills/` folder
(`node_modules/@tryghost/shade/docs/` in an app).

## Set up

Check each step against the app, and do the ones it's missing:

1. [Install](../../docs/ghost-apps.md#install) Shade with its peers.
2. Set up [Tailwind and the stylesheet](../../docs/ghost-apps.md#tailwind-and-the-stylesheet).
3. Load the [Fonts](../../docs/ghost-apps.md#fonts).
4. [Wrap the app in ShadeApp](../../docs/ghost-apps.md#wrap-the-app-in-shadeapp).
5. Follow Admin's [Light and dark theme](../../docs/ghost-apps.md#light-and-dark-theme).
6. Set the [Page frame and margins](../../docs/ghost-apps.md#page-frame-and-margins).
7. If the app keeps state in the query string, follow
   [App state in the URL](../../docs/ghost-apps.md#app-state-in-the-url).

## Build a screen

1. Start from the page template with
   [`shade-page-templates`](../shade-page-templates/SKILL.md).
2. As the screen needs them, use
   [`shade-page-header`](../shade-page-header/SKILL.md) for the header,
   [`shade-use-primitives`](../shade-use-primitives/SKILL.md) for layout,
   [`shade-tokens-not-hex`](../shade-tokens-not-hex/SKILL.md) for colour,
   [`shade-no-dark-variants`](../shade-no-dark-variants/SKILL.md) for dark
   mode and [`shade-imports`](../shade-imports/SKILL.md) for imports.
3. Read only the [docs that apply to apps](../../docs/ghost-apps.md#docs-that-apply-to-apps).

## Self-check

Before finishing, confirm in Admin:

- The screen looks right in Admin's light and dark theme, and switches with it.
- Inter loads: `document.fonts` lists it at each weight in
  [Fonts](../../docs/ghost-apps.md#fonts).
- The page has no outer padding of its own.
- Nothing is styled by hand where Shade has a component, primitive or token.
- The empty, loading and error states use Shade components.
