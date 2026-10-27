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

## View

The menu's **View** list picks what the prototype shows (`view.ts`), live
and remembered in this browser:

- **Planned** (the default): the release-shaped work, the slices in the
  release plan.
- **Exploration 1, 2…**: Planned with some screens swapped for an
  undecided direction (see Explorations below).
- **Patterns**: any `/analytics` screen swapped for the patterns page
  (`patterns/patterns-page.tsx`): every building block the screens are made
  of, on one page, so they can be designed together. Each block is the real
  component, fed sample data from `patterns/fixtures.ts`, so changing a
  component changes this page and the real screens together.
- **Today**: as it ships now, to compare against.

The beaker stays visible on any view but Planned, as a reminder.

There's no URL switch: Admin's dev server only serves Admin at exactly
`/ghost/`, so a query string there sends the page to Ghost instead.

The one swap point is the `analytics` route in `routes.tsx`, which renders
`PatternsSwap` (`patterns/patterns-swap.tsx`) where it used to render
`<Outlet />`.

### The flag stand-in

Every view but Today sets `data-admin7-analytics` on `<html>`, standing in
for the milestone's Labs flag. Planned pieces read that one attribute, so
each change is built the way its PR will be:

- Shared Shade components read it with `useRootFlag('admin7-analytics')`
  (`apps/shade/src/hooks/use-root-flag.ts`), and scoped CSS can select it.
- Style-only changes switch values (fill, curve, gridlines), never structure.
  Structural changes get a whole new component beside the old one, switched
  in one place.
- Lines marked `ANALYTICS PROTOTYPE` are the ones a PR carries over, with
  Admin setting the attribute from `useFeatureFlag('admin7Analytics')`.

Open question for the PR: Admin 7 milestones normally reach Shade through
ShadeApp's `isAdmin7`, but that now stays on for the shipped pill controls,
so it can't gate this milestone.

## Explorations

Undecided directions live in `explorations/`, one folder each
(`exploration-1/`, …), and each shows up as its own View. An exploration is
Planned with some screens swapped for its own versions, by route path; it can
swap one screen or several.

Explorations are loose and scrappy on purpose, and never ship. They can
rearrange the real components freely, copy a screen's data logic, and
override styles with their own CSS file. Their commits say "exploration".
When a direction gets the go-ahead, its ideas are rebuilt in release shape
(Planned), it gets slices in the release plan, and its folder is deleted.

An exploration can also restyle any screen without swapping it: the View
sets `data-shaping-view` on `<html>`, so CSS scoped to
`[data-shaping-view='exploration-<n>']` applies only in that view.
`StatsContent` carries a `data-stats-content` hook for this.

An exploration can build on another (`extends` in its entry): it reuses that
one's screens, and `data-shaping-family` on `<html>` lists both, so the
base's CSS (scoped to `[data-shaping-family~='exploration-<n>']`) applies to
it too. The variant only adds what's different.

To add one: a folder `explorations/exploration-<n>/` and an entry in
`explorations/index.ts` (plus its screen-wide CSS, if any, imported there).

Running:

- **Exploration 1**: open layouts on Overview and Web traffic.
- **Exploration 2**: Exploration 1 on white cards over a warm grey page,
  with a white left nav.
- **Exploration 3**: Exploration 1 with Recent posts on Overview, an
  editorial 50/50 (the latest post as the lead, the next three beside it),
  in place of the latest post and Top posts.

## Data scenarios

The menu's **Data size** chips choose which publisher the analytics
numbers describe: **Empty** (no data yet), **Small**, **Mid** (the default)
or **Large**. Unpicking the chosen chip turns the fakes off, so the screens
show this site's own data. Changing it reloads the page. Both the patterns page and the real screens follow it, so every screen
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
as on, and toggling them there won't stick until no size chip is picked.

## Release plan

The patterns page ends with the **Release plan**: the slices of the update in
shipping order, each with its status, reach, what it depends on and its
prototype commits, then a running **Still to consider** list. It lives in
`patterns/release-plan.ts`; update a slice's status as it moves, and move an
item from Still to consider into the slices once it's decided.

## Adding a pattern

Components that take their data as props can go straight on the page with
sample data. Ones that fetch their own (listed in the page's last section)
need a fake response first, or a small change that lets them take data as
props.
