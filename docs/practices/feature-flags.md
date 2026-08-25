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
`@tryghost/admin-x-framework/hooks`. It reads the server-computed value from the
Admin config response and returns `false` while the response is missing or
loading.

In legacy Ember Admin, use the `feature` service. Existing Ember code reads a
flag with `this.feature.get('myFeature')`.

Keep the decision at the boundary that owns the behavior. Hiding a button does
not protect a server endpoint, and rejecting an endpoint does not give Admin a
usable disabled state.

## How values are resolved

For normal Labs flags, later sources in this list override earlier ones:

```text
stored Labs setting → GA default → remote override → config.labs
```

This means an explicit `config.labs` value always wins. The special `members`
value is derived from the members signup setting rather than these flag lists.

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
