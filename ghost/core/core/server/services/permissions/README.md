# Permissions

Ghost's authorization service combines current principals with built-in policy
and resource-specific model checks. Boot initializes the service before requests
can call `canThis(context).action.resource()`.

## Policy and persistence

The permission definitions and role grants in the configured `paths.fixtures`
are the source of the immutable in-memory policy. `policy.ts` compiles `all`
against the finite permission catalog; it does not authorize arbitrary actions.
Owner privileges and resource-specific `permissible()` checks remain in the
existing authorization dispatcher and models.

During boot, the service compares each stored role's complete grant set with its
fixture policy. Matching roles use the in-memory grants. Unknown roles, changed
role IDs or names, and roles with extra, missing or object-specific grants use
live database relations. This fallback preserves custom and restricted policies
without unioning them with built-in grants.

Providers continue reading user status, role assignments, API-key identity and
direct user grants on each call. They do not cache principals or authorization
decisions across requests. User suspension, demotion and key deletion therefore
take effect on the next check. Existing permission tables, API relation includes,
fixtures and migrations remain available for compatibility and backups.

## Multiple instances and policy changes

Each container compiles its own policy from the fixtures shipped with its Ghost
release. There is no shared mutable permission cache and no distributed cache
invalidation. Built-in policy changes ship with code and migrations; deploy the
new release to every instance. During a rolling deployment, an old instance keeps
its previous release's policy until it restarts.

The compatibility check is a boot-time gate, not a watcher for database changes.
Restart all instances after database restoration or manual maintenance of
built-in role grants. Ghost has no supported API for editing those grants live.
Any future live policy-editing feature must invalidate the compatibility gate
across instances or route affected roles through the live database path.

## Validation

Run the focused unit tests from `ghost/core`:

```sh
pnpm exec vitest run test/unit/server/services/permissions
```

The database-backed permission tests and Admin API suites cover current identity
state, direct grants, compatibility fallback, model restrictions and relation
includes. See the [testing guide](../../../../../../docs/contributing/testing.md).
