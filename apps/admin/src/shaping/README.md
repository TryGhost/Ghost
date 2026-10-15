# Shaping mocks

**Prototype branch only. Never merge this folder or the `main.tsx` hook to `main`.**

Design work is shaped before the backend exists. This folder lets the real
Admin screens run against a fake backend for the parts that don't exist yet,
so a prototype is the actual build plus changes rather than a parallel copy.

## How it works

`install.ts` wraps the page's `fetch` before Admin renders. Each request is
offered to the MSW handlers in `handlers.ts`; a request no handler claims goes
to the real Ghost as usual. So posts, members, settings and tiers are real, and
only what's listed in `handlers.ts` is faked.

Faked today: the whole automations API (browse, read, add, edit, status,
performance stats, runs, run history, email links, email preview and test
send), plus `config.stats` so the Performance tab shows without Tinybird.

Site conditions, switched in the prototype menu: **Stripe connected** fakes a
Stripe Connect connection by adding made-up keys to the settings Admin reads.
Saves from Settings have those keys stripped, so they never reach the real
database.

The fake data lives in the browser (`localStorage`, see `db.ts`), so edits
survive reloads. `seed.ts` builds the starting data set, using the site's real
paid tiers.

## Turning it on and off

On by default on this branch. Use the prototype menu (`menu.tsx`): hover the
bottom-right corner for the beaker, then use its panel to turn mock data on or
off, or reset it from the ⋯ menu. The choice is remembered in this browser
(`mode.ts`), and each change reloads the page.

There are no `?mock=` URL switches: Admin's dev server only serves Admin at
exactly `/ghost/`, so a query string there sends the page to Ghost instead.

## Adding to it

When a design needs something the backend can't do yet (a new trigger type, a
new stat), add or extend a handler and its data. Write the response the screens
would want: that shape is a starting point for eng's API scoping. When the real
endpoint ships, delete the handler.
