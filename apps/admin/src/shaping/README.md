# Analytics shaping prototype

**Prototype branch only (`zach-analytics-proto`). Never merge this folder, or
the lines marked `SHAPING PROTOTYPE ONLY` in `main.tsx` and `routes.tsx`, to
`main`.**

This branch is the rough, holistic pass for the Admin 7 Analytics UI update
(Linear project P-DES-385). It edits the real Analytics components; the pieces
that work get rebuilt on `main` as small PRs behind a private flag.

## Prototype menu

Hover the bottom-right corner for the beaker (`menu.tsx`). It's its own React
root, mounted by `mount-menu.tsx`, so the screens never know it's there.

## View patterns

The menu's **View patterns** switch swaps any `/analytics` screen for the
patterns page (`patterns/patterns-page.tsx`): every building block the Analytics
screens are made of, on one page, so they can be designed together.

Each block is the real component the screens render, fed sample data from
`patterns/fixtures.ts` instead of a query. So changing a component changes this
page and the real screens together. Nothing here needs Tinybird.

The switch is remembered in this browser (`patterns-view.ts`) and applies live,
without a reload. There's no URL switch: Admin's dev server only serves Admin
at exactly `/ghost/`, so a query string there sends the page to Ghost instead.

The one swap point is the `analytics` route in `routes.tsx`, which renders
`PatternsSwap` (`patterns/patterns-swap.tsx`) where it used to render
`<Outlet />`.

## Adding a pattern

Components that take their data as props can go straight on the page with
sample data. Ones that fetch their own (listed in the page's last section)
need a fake response first, or a small change that lets them take data as
props.
