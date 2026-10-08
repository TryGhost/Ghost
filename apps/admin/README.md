# Ghost Admin (React)

The React Ghost admin interface.

## Architecture

The application uses `admin-x-framework` for API hooks and routing. Shade
provides its application wrapper and design system. After Vite builds Admin,
`pnpm assemble:assets` runs the standalone assembler in `scripts/` to copy
`dist/` into `ghost/core/core/built/admin/`. It ships Koenig’s embed renderer
separately in `ghost/core/core/built/embed-renderer/`.

### Sidebar visibility

Route handles own sidebar visibility. The `hideAdminSidebar` handle hides it
for focused screens such as the editor.

### CSS

`src/index.css` is the single Tailwind CSS entry point for Admin. It imports
Shade's styles and uses `@source` directives to scan Admin, Shade, ActivityPub,
Admin Framework, and the embedded Koenig selector. Only this app loads the
`@tailwindcss/vite` plugin for the embedded Admin CSS lane.

Embedded Admin apps must not import `@tryghost/shade/styles.css` themselves.
Doing so generates duplicate utilities and creates cascade conflicts.

Admin also owns the shared `.koenig-react-editor` width and centering rule.
Koenig loads its own editor stylesheet through `fetchKoenigLexical`.

Shade's Tailwind imports are unlayered, so source order resolves overlapping
utilities. Do not move Shade's imports into a CSS layer without accounting for
the cascade.

### Appearance

The shared ThemeProvider owns the appearance preference and the Admin theme
controller. The controller applies the root dark class, follows system appearance
and suppresses transitions during a switch.

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

React, Admin Framework, Shade and Portal watch for changes.

Development commands do not change Labs settings. To preview a flagged feature
in one browser tab, open `http://localhost:2368/ghost/#/?labs=<flag>`. These
[session overrides](../../docs/practices/feature-flags.md#admin-session-overrides)
survive navigation and reloads in that tab; use `?labs=` to clear them.

Build new Admin features in this React app. Use `admin-x-framework` for API
access and Shade for UI rather than adding new `admin-x-design-system`
components. Product copy belongs in the `ghost` namespace; follow the
[internationalization guide](../../docs/practices/internationalization.md).

`pnpm nx run @tryghost/admin:build:dev` prepares library outputs. The normal
`pnpm dev` command uses this preparation before starting the React watchers.

Vite resolves Admin Framework and Shade through their `source` exports in
development, production and tests. It tracks each package’s source and path aliases
directly, and transforms Shade’s SVG icons with SVGR. The shared CSS lane stays
in this app. Compiled library builds and watchers remain available for other
consumers, and typechecks still use the library declarations.

The post editor is the largest area with documentation of its own — start at
[src/editor/README.md](src/editor/README.md) before changing anything under
`src/editor/`.

## Testing

- **Unit tests** (`pnpm test:unit`): Vitest + jsdom, colocated `*.test.ts(x)` files.
- **Acceptance tests** (`pnpm test:acceptance`): the real app in real Chromium against a fake admin API served through MSW — see [test-utils/acceptance/README.md](test-utils/acceptance/README.md).
- **Typechecks** (`pnpm test:types`): TypeScript checks app code, test code and Vite configuration without bundling Admin.
- **Browser e2e** against a real Ghost instance lives in the top-level [`e2e/`](../../e2e) workspace.

From the monorepo root, use `pnpm nx run @tryghost/admin:test:unit` or
`pnpm nx run @tryghost/admin:test:acceptance`, or
`pnpm nx run @tryghost/admin:test:types` to build the required React
libraries first. These targets do not boot Ghost. Their `dependsOn` lists, and
the React library prerequisites of `build:dev`, explicitly name the React
dependencies with a `build` target; update all four when adding one.

Nx caches unit, acceptance and typecheck results. The global
`reactAdminDependency` input retains every transitive dependency's default
inputs. Test inputs also include Core's aliased card assets, the lockfile and runtime
settings such as Node version, platform, timezone and CI mode. A digest of
local `.env` and `.env.*` files covers Vite's mode-specific configuration without
printing their values. Shard and other
CLI arguments get separate cache keys. Use `--skip-nx-cache` to force a fresh run.

`pnpm test` and `pnpm check` at the root select Admin's aggregate `test` target.
It schedules the same `test:unit` and `test:types` tasks and their prerequisites.
Only those tasks are cached, so an outer cache cannot skip their input checks.

CI changes confined to Admin's `*.test.ts(x)`, `*.screen.ts`, `test-utils/` or
`vitest.acceptance.config.ts` skip the build, packaging and browser E2E lane.
Affected unit, app acceptance, lint and typecheck checks still run. Changes to
runtime code or shared configuration keep the full lane.

## Building for Production

```bash
# Build production bundle
pnpm nx run @tryghost/admin:build
```

The assembler reads the individual build outputs, so it can also be rerun with
`pnpm nx run @tryghost/admin:assemble:assets` after those builds. It does not run
compilers or upload sourcemaps. See
[Admin asset assembly](../../scripts/README.md#admin-asset-assembly) for the input
requirements.

This outputs to `apps/admin/dist/` and updates the assets in `ghost/core/core/built/admin/`.

The build also writes hidden sourcemaps: `.map` files that no bundle references.
With `IS_SHIPPING` set, as CI does for `main` and release tags, it injects Sentry
debug IDs into the bundles. CI then uploads the maps with `sentry-cli` in a
separate step, so a slow or unavailable Sentry can't block the build.

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
