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

### Visual rollout scopes

Admin owns visual rollout decisions in its layout, not in Shade or Ember.
`useAdminPageChromeClass` explicitly maps `admin7PageChrome` to
`.admin7-page-chrome` on the existing React-owned `SidebarProvider` wrapper.
Do not derive selectors from arbitrary Labs keys or place milestone classes on
`body`. Add scoped styles through `src/index.css`, the existing CSS lane.

This scope requires a server-computed enabled flag, loaded theme preferences,
resolved light mode, desktop width (801px or wider, using Shade's `useIsMobile`),
and navigation permitted by both the current route and the user's role.
Contributors are excluded. Missing/loading config keeps the scope off. There
are no visual overrides yet; the class is the boundary for subsequent changes.

Route availability comes from `useAdminSidebarVisibility` (React route handles
and Ember's visibility bridge). Keep this separate from the saved
`navigation.menu.visible` preference: collapsing a sidebar must not disable the
scope. The page/post editor is also excluded directly by URL so the scope is
removed before Ember emits its fullscreen visibility change.

The current ownership inventory is defined in `src/routes.tsx`:

| Surface                                                           | Owner                                         | Navigation scope                                                |
| ----------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| Members list/import/detail, Tags list, Comments, Automations list | React                                         | Eligible when navigation is available                           |
| Analytics and post analytics                                      | React                                         | Eligible when navigation is available                           |
| Network                                                           | Embedded ActivityPub React app                | Eligible; inner navigation is unchanged                         |
| Tag details                                                       | React with `tagDetailsReact`; Ember otherwise | Eligible under either owner                                     |
| Posts, Pages, View site, members activity                         | Ember                                         | Follow existing Ember navigation visibility                     |
| Settings and automation editor                                    | React                                         | Excluded by `hideAdminSidebar`                                  |
| Post/page editor                                                  | Ember                                         | Excluded immediately by URL and existing Ember fullscreen rules |
| Authentication, setup, migration and hosted upgrade views         | Ember (onboarding is React)                   | Follow existing Ember navigation visibility                     |

The visual flag never changes route ownership. Recheck this table against the
route definitions and Ember navigation rules when integrating another surface.

The flag is temporary: follow the [feature flag lifecycle](../../docs/practices/feature-flags.md)
when promoting it to GA and removing the old presentation. Keep eligibility
conditions that still define supported behavior after the rollout flag is gone.

## Development

```bash
# Start development server (from monorepo root)
pnpm dev
```

Build new Admin features in this React app. Use `admin-x-framework` for API
access and Shade for UI rather than adding new `admin-x-design-system`
components. Product copy belongs in the `ghost` namespace; follow the
[internationalization guide](../../docs/practices/internationalization.md).

## Testing

- **Unit tests** (`pnpm test:unit`): Vitest + jsdom, colocated `*.test.ts(x)` files.
- **Acceptance tests** (`pnpm test:acceptance`): the real app in real Chromium against a fake admin API served through MSW — see [test-utils/acceptance/README.md](test-utils/acceptance/README.md).
- **Browser e2e** against a real Ghost instance lives in the top-level [`e2e/`](../../e2e) workspace.

## Building for Production

```bash
# Build production bundle
pnpm nx run @tryghost/admin:build
```

This outputs to `apps/admin/dist/` and updates the assets in `ghost/core/core/built/admin/`.
