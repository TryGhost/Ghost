# Feature flags

Ghost uses feature flags, usually called Labs flags, to merge work before it is
ready for everyone, offer beta features, and disable a feature without removing
its code.

A feature flag should be temporary. It controls whether a code path is active;
it is not a replacement for a permanent product setting, configuration
requirement, permission, or host limit.

## Choose the right gate

Use a Labs flag when a feature needs to move through development, beta, or a
controlled rollout before becoming generally available.

Use the underlying condition directly when availability will always depend on
it. For example, a feature which requires configured credentials must still
check for those credentials after its Labs flag is removed. If both conditions
matter during development, check both explicitly.

Do not use a Labs flag as an Admin/server compatibility check. Admin and Ghost
Core deploy independently, so a flag may be visible before the endpoint,
setting, or response field needed by the UI exists. Admin must detect the
backend capability and handle the older-server case separately.

## Flag stages

Flags are camelCase keys registered in
`ghost/core/core/shared/labs.js`:

| List                   | Use                                         | Normal Admin surface                                    |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------- |
| `PRIVATE_FEATURES`     | Development and private experiments         | Private features when developer experiments are enabled |
| `PUBLIC_BETA_FEATURES` | Opt-in public beta                          | Beta features                                           |
| `GA_FEATURES`          | Short transition after general availability | Nobody; the value defaults to `true`                    |

Private and public beta flags are stored together in the site's `labs` setting.
The lists control which keys the settings API will accept. Admin's toggle lists
are maintained separately, so moving a flag between stages also requires an
explicit UI change. GA flags are no longer writable.

The normal lifecycle is:

```text
private or public beta → GA → remove the flag and old branch
```

`GA_FEATURES` makes a flag default to on without immediately changing every
call site. It is a short cleanup step, not a permanent home for released flags.

## Add a flag

1. Add the key to `PRIVATE_FEATURES` or `PUBLIC_BETA_FEATURES` in
   `ghost/core/core/shared/labs.js`.
2. Add the matching toggle to
   `apps/admin/src/settings/advanced/labs/private-features.tsx` or
   `apps/admin/src/settings/advanced/labs/beta-features.tsx`.
3. Gate the server and browser behavior that must ship together.
4. Add tests for both the enabled and disabled behavior.
5. Update and review the Admin config and settings API snapshots.

The key must match everywhere. No database migration is needed because Labs
values live in the existing JSON setting.

## Read a flag

In Ghost Core, use the shared Labs service:

```js
const labs = require('../../../shared/labs');

if (labs.isSet('myFeature')) {
  // flagged behavior
}
```

Use `labs.enabledMiddleware('myFeature')` when an entire API route should return
404 while disabled. Theme helpers can read the computed value from
`@labs.myFeature`; a helper which must report a disabled-feature error can use
`labs.enabledHelper(...)`.

In React Admin, use `useFeatureFlag` from
`@tryghost/admin-x-framework/hooks`. It returns `true` when the server-computed
value in the Admin config response is boolean `true` or the flag is enabled by
an Admin session override. Without an override, it returns `false` while the
response is missing or loading.

In legacy Ember Admin, use the `feature` service. Existing Ember code reads a
flag with `this.feature.get('myFeature')`.

Keep the decision at the boundary that owns the behavior. Hiding a button does
not protect a server endpoint, and rejecting an endpoint does not give Admin a
usable disabled state.

## Admin 7 milestones

Admin 7 milestones use ordinary private Labs flags. Give each milestone a
stable, descriptive key such as `admin7Pill`, and a Labs label that identifies
its milestone and purpose: “Admin 7 · Milestone 2 · Pill controls.” Register it
and add its toggle using the same steps as any other private flag.

Read the flag with the existing `useFeatureFlag` hook where the behavior is
owned. Keep any route restrictions beside that check. If a milestone needs
another flag, combine those values directly at the same boundary.

### Shared appearance

For the pill milestone, the [Admin root](../../apps/admin/src/app-root.tsx)
reads `useFeatureFlag('admin7Pill')` and excludes the editor and Ember-owned
routes. It passes the resulting boolean to the existing Shade provider:

```tsx
<ShadeApp darkMode={darkMode} isAdmin7={isAdmin7}>
  <App />
</ShadeApp>
```

Shared components read `useShade().isAdmin7` from
`@tryghost/shade/app`. Shade owns changes to control appearance, spacing and
strokes; pages use the same value for structural differences such as action
order. Ordinary component calls stay `<Button>` rather than setting a milestone
prop on every control.

Shade previews default to the new appearance. Admin always passes its computed
boolean, so missing or loading configuration stays off unless the existing
session override enables the flag. Standalone ActivityPub explicitly passes
`isAdmin7={false}`; embedded ActivityPub inherits Admin's value. Menus,
tooltips and dialogs carry `data-admin7-pill` through Shade's scope wrapper,
including when rendered in portals.

Shade exposes one `isAdmin7` design switch. Admin maps the current milestone's
Labs flag to it; as milestones progress, update that mapping instead of adding
new milestone props to Shade. Keep permanent permission and backend capability
checks separate from the temporary flag.

### Verify and remove

Keep automated coverage focused on the boundary: missing/off/on flags, excluded
routes and portal isolation. Preserve existing behavioral tests. Styling-only
changes do not need unit, acceptance or CSS assertion suites; review both
appearances visually and use private dogfooding to explore new interactions.

Build the enabled appearance as the intended default. Follow the normal flag
lifecycle below, then remove the Labs key and toggle, the temporary provider
value, disabled branches, scope attribute and tests for the obsolete boundary.
Ordinary component calls should keep working without changes. Retain permanent
route, permission or backend requirements after the flag is gone.

## How values are resolved

For normal Labs flags, later sources in this list override earlier ones:

```text
stored Labs setting → GA default → remote override → config.labs → Admin session override
```

An explicit `config.labs` value wins on the server. An Admin session override
can then force the flag on in the client only; it cannot force it off or change
the server value. The special `members` value is derived from the members
signup setting rather than these flag lists.

Ghost also supports an opt-in remote override source. It is inactive unless an
operator configures it, so normal self-hosted installations continue to use
their local settings and configuration.

The remote manifest is sparse: an absent key has no opinion. A boolean applies
an override to every instance using that manifest, while a `{value, percent}`
entry applies it to a stable approximate percentage. Percentage buckets use
the flag name and site UUID, so increasing a percentage keeps sites already in
the rollout and adds more.

Unknown flag names are accepted deliberately because Admin and Ghost Core may
deploy at different times. Code which reads a new key still has to be deployed;
the manifest only supplies its value. Invalid entries are ignored, and a fetch
or parse failure keeps the last known good overrides.

## Admin session overrides

To preview a flagged Admin feature, add `labs` to the query string inside the
Admin hash route, for example `/ghost/#/posts?labs=postsListReact`. Use
comma-separated names (`?labs=postsListReact,editorReact`) or repeated parameters
(`?labs=postsListReact&labs=editorReact`) to enable multiple flags.

Admin stores the list in `sessionStorage` under `ghost-admin:labs-overrides`.
It persists across navigation and reloads in the same tab for that browser
session. A URL without `labs` reuses the stored list; a URL with `labs` replaces
the whole list rather than adding to it. Visit a route with an empty value,
such as `/ghost/#/posts?labs=`, to clear the overrides. Simply removing the
parameter does not clear them.

These overrides only force flags on. React's `useFeatureFlag` and legacy
Ember's `feature` service honor them even when the server-computed value is
`false`. There is no force-off syntax; clearing an override restores the normal
value, which may still be `true`. If session storage is unavailable, the URL
override still applies to the current React render, but cannot persist or be
shared with Ember.

Session overrides are client-only: they do not update the site's stored Labs
setting or change Ghost Core's flag resolution. They cannot enable a gated
server endpoint, change theme behavior, or supply missing backend support.
Use them for Admin-only previews; features that also depend on server-side
flags still need those flags enabled on the server, and Admin must still
check backend compatibility.

## Test both states

Tests should prove the behavior controlled by the flag, not only that the flag
can be read.

- Stub `labs.isSet` in focused Ghost Core unit tests.
- Pass Labs values to shared Admin fixtures with
  `configResponse({labs: {...}})` or `settingsResponse({labs: {...}})`.
- Use `test.use({labs: {myFeature: true}})` or an explicit `false` in top-level
  Playwright tests.
- Cover the flag-off state and any older-server state in Admin acceptance tests.

### Defaults by test suite

The different test systems do not use the same Labs defaults:

| Tests                                                                               | Default after setup                                                                            |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Ghost Core unit tests                                                               | No flags are forced on; stub the value needed by the test                                      |
| Ghost Core `integration` and `legacy` tests using `testUtils.setup()`               | Every registered private and public beta flag is forced on                                     |
| Ghost Core `e2e`, `e2e-api`, and `e2e-isolated` tests using `fixtureManager.init()` | Every registered private and public beta flag is forced on                                     |
| React Admin unit and acceptance tests using the shared test-data fixtures           | Keys in `labsDefaults` default off; pass a `labs` override for the case under test             |
| Ember Admin tests using Mirage                                                      | Labs defaults to an empty object; use `enableLabsFlag` or `disableLabsFlag`                    |
| Top-level Playwright tests in `e2e/`                                                | Labs uses the new site's values; only flags passed through `test.use({labs: ...})` are changed |

Ghost Core's common fixture initializer adds `labs:enabled` to every fixture
initialization. That operation writes `true` for every key in
`WRITABLE_KEYS_ALLOWLIST`, which includes both `PRIVATE_FEATURES` and
`PUBLIC_BETA_FEATURES`. The Vitest project alone does not enable flags: the
behavior is triggered when a test calls `fixtureManager.init()` or
`testUtils.setup()`.

This ensures flagged code paths are exercised in Ghost Core's database-backed
tests, but it also means adding a flag can change API snapshots even though the
flag defaults off in production. Add explicit flag-off coverage where the old
path matters. Flags in `GA_FEATURES` default to on in every runtime, including
tests, until they are removed or overridden by configuration.

When adding, promoting, or removing a flag, update the affected snapshots from
`ghost/core/`:

```bash
pnpm test:single test/e2e-api/admin/config.test.js -u
pnpm test:single test/e2e-api/admin/settings.test.js -u
```

Review the snapshot changes and confirm they only reflect the intended Labs
keys and values.

## Promote and remove a flag

When a feature is ready for general availability:

1. Move the key from `PRIVATE_FEATURES` or `PUBLIC_BETA_FEATURES` to
   `GA_FEATURES`.
2. Remove its Admin toggle.
3. Verify the feature with the GA value and update the API snapshots.
4. Follow up promptly by deleting the flag, the disabled code path, and tests
   which exist only to exercise that obsolete path.

Before removing the disabled path, confirm that every supported deployment can
run the enabled behavior and that the flag is not masking a permanent
configuration, compatibility, permission, or availability condition.
