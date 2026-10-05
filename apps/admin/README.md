# Ghost Admin (React)

New React-based Ghost admin interface, gradually replacing the existing Ember admin.

## Architecture

Uses an **Ember Bridge** system for smooth migration:

- Routes ported to React render React components
- Unported routes fall back to the existing Ember admin
- Both share the same UI space seamlessly

The React application uses `admin-x-framework` for API hooks, routing, and the
bridge to Ember. Shade provides its application wrapper and design system.
Embedded React applications are built before Ember Admin; Ember's asset-delivery
addon copies their production output and the Admin assets into
`ghost/core/core/built/admin/` for Ghost Core to serve.

Ember is an Nx implicit dependency of this app so Ember source changes still
invalidate the combined production build and mark Admin as affected. It is not
a package dependency: a filtered `@tryghost/admin...` install contains the React
test dependencies, while development and production builds need the full
workspace install to include Ember's toolchain.

### CSS

`src/index.css` is the single Tailwind CSS entry point for Admin. It imports
Shade's styles and uses `@source` directives to scan Admin, Shade, ActivityPub,
Admin Framework, and the embedded Koenig selector. Only this app loads the
`@tailwindcss/vite` plugin for the embedded Admin CSS lane.

Embedded Admin apps must not import `@tryghost/shade/styles.css` themselves.
Doing so generates duplicate utilities and creates cascade conflicts with
Ember's legacy CSS.

Shade's Tailwind imports are unlayered because Ember's legacy CSS is also
unlayered. This lets source order resolve overlapping utilities. Do not move
Shade's imports into a CSS layer without accounting for the legacy cascade.

### Deploy compatibility

Ghost Admin and Ghost Core can deploy at different times. New Admin UI that
depends on a new setting, endpoint, or configuration value must detect backend
support and hide or safely disable the feature when it is absent. A Labs flag
alone is not a compatibility check because the flag may exist before the
supporting backend version is live.

Add an acceptance test for the older-backend case. The social accounts settings
and membership tiers tests contain current examples of hiding controls until
their supporting settings are present.

### Automation run history

With automation run analytics enabled, selecting a Performance row opens read-only
history by run ID. Closing it restores the mounted editor and its unsaved draft.
List filters, sorting, and pagination do not refresh the selected history. A new
selection or Retry fetches it again; there is no polling or refresh control.

Recorded cards use the action revisions and timestamps returned by the history
endpoint, including saved email subjects and send/delivery evidence. Active runs
also fetch the saved workflow and show the remaining path after the pending step,
with upcoming cards distinct from recorded events. Both requests must succeed;
a failure shows the history error state and Retry reloads both. Upcoming cards
estimate dates from the pending step’s recorded eligibility (or now if overdue),
adding each downstream wait. These estimates are calculated when history loads;
they are not scheduled send times. Deleted members have no projected dates.
Removed pending actions have no downstream path and lead to the end marker.
Inactive automations show recorded history without projected steps.
Completed runs do not get an invented end timestamp.

Email snippets show up to 400 characters of ordinary text from the saved revision,
rendered as plain text. Rich cards (including HTML and Markdown) are skipped;
emails without extractable text show their subject alone. This does not mount or
import the editor.

History mapping tests live in `src/automations/utils/`; the `run-history*`
acceptance tests cover selection, drafts, retries, responsive layouts, and cards.

## Development

```bash
# Start development server (from monorepo root)
pnpm dev
```

Build new Admin features in this React app. Use `admin-x-framework` for API
access and Shade for UI rather than adding new `admin-x-design-system`
components. Product copy belongs in the `ghost` namespace; follow the
[internationalization guide](../../docs/practices/internationalization.md).

`pnpm nx run @tryghost/admin:build:dev` prepares library outputs and Ember's
development assets. Its prerequisites select `ghost-admin:build:dev` once;
they do not also compile Ember's production bundle. The normal `pnpm dev`
watchers are configured separately.

The post editor is the largest area with documentation of its own — start at
[src/editor/README.md](src/editor/README.md) before changing anything under
`src/editor/`.

## Testing

- **Unit tests** (`pnpm test:unit`): Vitest + jsdom, colocated `*.test.ts(x)` files.
- **Acceptance tests** (`pnpm test:acceptance`): the real app in real Chromium against a fake admin API served through MSW — see [test-utils/acceptance/README.md](test-utils/acceptance/README.md).
- **Browser e2e** against a real Ghost instance lives in the top-level [`e2e/`](../../e2e) workspace.

From the monorepo root, use `pnpm nx run @tryghost/admin:test:unit` or
`pnpm nx run @tryghost/admin:test:acceptance` to build the required React
libraries first. These targets do not compile Ember or boot Ghost. Their
`dependsOn` lists, and the React library prerequisites of `build:dev`, explicitly
name the React dependencies with a `build` target; update all three when adding
one. Using `^build` here would also select the implicit Ember dependency.

## Building for Production

```bash
# Build production bundle
pnpm nx run @tryghost/admin:build
```

This outputs to `apps/admin/dist/` and updates the assets in `ghost/core/core/built/admin/`.

The build also writes hidden sourcemaps: `.map` files that no bundle references.
With `IS_SHIPPING` set, as CI does for `main` and release tags, it uploads them
to Sentry under the release Admin's Sentry client reports. Without
`VITE_SENTRY_AUTH_TOKEN` the upload is skipped.

## Automation member search

The initial Performance search matches current member name/email across all time
and statuses. While a search is active, the chart, status cards, and date controls
collapse; clearing or closing search restores the browsing filters. Entered
sorting remains available. Input is debounced for 300 ms.

Search pages can report `scanning` even with no matching rows. The list continues
these requests sequentially, shows a skeleton row while scanning, and reports
no matches only after exhaustion. A failed later page retains loaded rows and
retries that page. Search-scoped charts and date/status controls are a separate
enhancement. Opening search replaces the Performance heading with the input.
Typing slides the chart, status cards, and applied date chip closed over 200 ms;
clearing search expands them again. Reduced-motion preferences disable the transition.
