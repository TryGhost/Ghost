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

Admin 7 milestones use the existing private Labs flags and session overrides.
Each milestone has a descriptive `admin7` key, such as `admin7Pill`, and a Labs
label that identifies its milestone and purpose: “Admin 7 · Milestone 2 · Pill
controls.” Keep the key stable as the implementation evolves.

The [Admin 7 registry](../../apps/admin/src/admin7/features.ts) records each
milestone's Labs key, title, description, supported surfaces, route exclusions
and explicit `requires` dependencies. The Admin root calls
[`useResolvedAdmin7`](../../apps/admin/src/admin7/use-resolved-admin7.ts), which
resolves that registry against effective Labs values and the current route,
then passes the complete result to Shade. An enabled Labs flag is a request to preview a
milestone; the resolved value means that milestone is allowed on this screen.

### Resolve once, consume by milestone

Use `useAdmin7().pill` from `@tryghost/shade/app` for the pill milestone. A single `isAdmin7Design` boolean
would conflate independent milestones as the redesign grows. Pages and shared
controls consume the resolved milestone values rather than reading raw Labs
flags or repeating route checks.

Resolution preserves Admin's existing session overrides. Missing flags and
loading configuration resolve to off unless a session override enables them.
Overrides still obey surface restrictions and dependencies. Permanent permission
checks and backend capability checks remain separate from milestone rollout;
removing a flag must not remove those checks.

Milestones are independent unless the registry explicitly declares a dependency.
A dependent milestone requires its own flag and every prerequisite to be enabled
and supported on the current screen. Invalid or cyclic dependencies resolve to
off. Enabling a milestone never silently enables other toggles. Describe actual
prerequisites in its Labs description so a disabled dependency is understandable.

### Keep presentation in Shade

The host supplies all resolved values at the shared application boundary:

```tsx
<ShadeApp darkMode={darkMode} admin7={admin7}>
  <App />
</ShadeApp>
```

Shade knows the resolved features, not Labs storage or Admin routes. Shared
components and recipes own appearance; ordinary callers keep using `<Button>`
without a per-button milestone prop. Pages may use `useAdmin7()` for structural
or interaction differences that belong to that page. Keep flag checks at those
shared boundaries rather than distributing identical classes across consumers.

Isolated Shade previews default milestone values to true. Those values affect
appearance when shared controls adopt the milestone. Admin always supplies the
complete resolved object, so a missing production flag cannot inherit the
preview default. Standalone hosts must explicitly choose their supported
milestones. Shade propagates the same values into portaled menus, tooltips and
dialogs through its scope wrapper; global attributes on `document.body` would
allow one host to change another's design.

### Pill milestone

`admin7Pill` resolves to `pill`. Its scope is shared pill geometry, control and
header styling, and the accompanying header interactions. Registering and
resolving the flag does not itself change appearance; each adoption uses the
resolved value to gate those changes. It has no milestone
prerequisites. It applies to React Admin routes, excluding the editor; Ember-owned
routes and the standalone ActivityPub preview resolve to `pill: false`. The
embedded ActivityPub routes inherit Admin's resolved values.

The CSS boundary is `data-admin7-pill`. Changes to colors, spacing, strokes and
pressed states belong in Shade's scoped tokens, recipes or shared controls.
Page-level differences such as action order use the same resolved `pill` value.

### Review and remove a milestone

For each milestone, record its scope, restrictions, dependencies and removal steps
alongside its registry entry or focused design documentation. Keep automated
checks concentrated on the rollout boundary: absent/off/on flags, supported
surfaces, exclusions, real dependencies and portal isolation. Preserve existing
behavioral coverage. Styling-only changes do not need unit, acceptance or CSS
assertion suites. Review both designs visually; private dogfooding can exercise
experimental interactions before they become a permanent contract.

Follow the normal promotion lifecycle below. As controls adopt the pill
milestone, make their enabled behavior the intended default. When removing the
flag, keep those branches, remove any previous token scope and fallback props,
and delete `pill` from the registry and Shade's temporary feature contract. Remove its Labs toggle, raw key, scope attribute and boundary-only tests.
Ordinary component calls should then use the intended defaults. Resolve dependent
milestones before deleting a prerequisite, and retain any permanent route,
permission or backend requirements that still apply after rollout.

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
