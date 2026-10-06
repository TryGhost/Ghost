# Permissions

The permission catalog, known role names and role grants live in
[`definitions.ts`](definitions.ts). Literal types and `satisfies` reject role
typos and actions used with the wrong object. Boot validates these definitions
with Zod and publishes an immutable role policy before requests can call
`canThis(context).action.resource()`. `all` expands
against that finite catalog; it does not grant arbitrary future actions.

Database fixture seeding injects fresh copies of the same catalog and grants into
the configured fixture templates. The JSON files retain permission placeholders
and other seed data, including persistent role records and their metadata.
Custom fixture permission entries do not override the typed policy. The fixture
integrity check hashes the composed production seeds, so the existing data-change
guard also covers edits to the TypeScript definitions.

## Authorization contract

Providers read users, their status and current role assignments, or API keys and
their current role. They return typed plain permission objects from memory.
Suspension, demotion and key deletion take effect on the next check. Owner's
bypass, staff-token precedence and resource-specific `permissible()` methods
remain in the existing dispatcher and models.

Measured provider SQL falls from four to two queries for a user and three to two
for a key; staff tokens invoke both, falling from seven to four. Authentication
and resource-specific queries are additional to these counts.

TypeScript definitions are authoritative. Direct grants in `permissions_users`, customized
role grants in `permissions_roles` and DB-only action definitions do not affect
authorization. Unknown role names receive no grants. Permission API relation
includes, fixture seeding, historical migrations and backups still use the
existing tables, so their contents can differ from the effective policy.

## Boot audit and rollout

Each initialization awaits a diagnostic comparison with the database. It reports
grants that memory adds or removes, catalog drift, unknown roles and the count of
direct user grants. Owner grant differences affect API keys assigned that role;
Owner users retain their existing bypass. Logs contain a deterministic
`policyVersion` fingerprint and one of these codes:

- `PERMISSIONS_PARITY_MATCH`: the audit ran and found no drift.
- `PERMISSIONS_PARITY_MISMATCH`: review the structured `errorDetails` report.
- `PERMISSIONS_PARITY_CHECK_FAILED`: the audit could not run; this is not evidence
  of a match. The failure is logged without disabling the fixture policy.

Malformed policy definitions abort initialization. Audit results never select a fallback
or modify the immutable policy. This branch implements the cutover candidate;
before production rollout, collect audit evidence while the DB implementation
is still serving requests, or run an equivalent fleet-wide SQL audit. Cover all
sites in the rollout cohort, review every grant change, resolve direct grants and
active assignments to unknown roles, and decide how self-hosted customizations
are handled. Passing tests does not establish fleet parity.

Each container builds the policy shipped in its release. Policy changes require
deploying the release to every container. The fingerprint detects differing
policies; it does not synchronize instances during a rolling deployment.

Tables remain maintained for a code-revert rollback. Keep permission migrations
and definition changes synchronized until the persistence dependencies are removed.
Retiring the tables requires deciding the API include contract, removing the
fixture bridge, model relations and backup dependencies, and
shipping a release with no table reads. Drop the tables only after every
container runs that release. Role definitions and assignments remain persistent.

## Validation

From `ghost/core`, run:

```sh
pnpm test:single test/unit/server/services/permissions
pnpm test:single test/integration/services/permissions.test.ts
pnpm test:types
```

Unit tests validate schemas, typed and semantic grant references, immutability,
lifecycle and audit diagnostics. The compiler is compared with the legacy fixture
matcher for both composed fixture templates, and the fixture bridge is checked
for independent copies. Integration tests use actual boot wiring,
independently load legacy database grants for every built-in role, compare grants
and tag decisions, measure provider SQL, and characterize both live principal
changes and the intentional treatment of DB overrides. These comparisons run in
tests; requests execute the memory policy once. See the
[testing guide](../../../../../../docs/contributing/testing.md).
