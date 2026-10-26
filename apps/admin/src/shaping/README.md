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

## Data scenarios

The menu's **Data** picker chooses which publisher the analytics numbers
describe: **No data yet**, **Small**, **Mid-sized** (the default) or **Large
publisher**, or **Site data** to turn the fakes off. Changing it reloads the
page. Both the patterns page and the real screens follow it, so every screen
can be checked at every scale without Tinybird or seeded data.

- `data/profiles.ts`: each scenario's numbers (today's totals and rates).
  Tweak these to tune a scenario.
- `data/generate.ts`: turns a profile into daily series, posts, sends,
  sources and locations for any date range. Seeded, so a day's numbers match
  everywhere.
- `data/handlers.ts`: answers the Analytics screens' requests in the real
  API's shapes: Ghost's stats endpoints, the latest post and the made-up
  posts the screens link to, and Tinybird (`config.stats`, its token and each
  pipe). Anything else reaches the real Ghost.
- `data/install.ts`: wraps `fetch` before Admin renders (called from
  `main.tsx`).

While faking, the settings Analytics checks (web analytics, paid members,
member sources, email open and click tracking) read as on, and are stripped
from settings saves so they never reach the database. So Settings shows them
as on, and toggling them there won't stick until **Site data** is picked.

## Changes log

The patterns page ends with a **Changes** section: a high-level log of the
design changes made on this branch, newest first. Add an entry to
`patterns/changes.ts` with each change worth reviewing.

## Adding a pattern

Components that take their data as props can go straight on the page with
sample data. Ones that fetch their own (listed in the page's last section)
need a fake response first, or a small change that lets them take data as
props.
