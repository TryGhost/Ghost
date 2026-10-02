# Host-managed upgrades

Ghost delegates updates to the configured `upgrade` adapter. The default
`NoopUpgradeAdapter` reports `supported: false` with reason `not-configured`;
request creation is unavailable and job lookup returns `unknown`. Adapter
construction and Ghost boot do not require an external supervisor.

The adapter contract lives in
[`@tryghost/adapter-base-upgrade`](../../../../../../packages/adapters/upgrade-base/README.md).
Hosts configure `adapters.upgrade.active` and options under the selected adapter's
name, using the normal adapter manager. These are server configuration, rather
than publication settings, so configuration import/export does not include them.
Ghost does not select images, run host commands, or own checkpoints and recovery.

## Admin API

Only Owner and Administrator staff can use these authenticated endpoints.
Integration credentials cannot use them.

| Request                              | Result                            |
| ------------------------------------ | --------------------------------- |
| `GET /ghost/api/admin/upgrades/`     | `{upgrades: [status]}`            |
| `POST /ghost/api/admin/upgrades/`    | HTTP 202 with `{upgrades: [job]}` |
| `GET /ghost/api/admin/upgrades/:id/` | `{upgrades: [job]}`               |

POST accepts exactly `{upgrades: [{targetVersion: "7.0.0", idempotencyKey:
"f76543a0-c052-45e8-b020-03c86a809b93"}]}`. Generate a UUID v4 key for each
intent and reuse it for retries after a lost response. Do not generate another
key until the original request's outcome is known. Ghost scopes this key to the
authenticated staff user before passing it to the adapter; it is separate from
the host-generated job ID. Accepted results include the target and timestamps.
Versions are opaque, non-empty release identifiers of at most 128 characters,
including prereleases, nightly versions and host-specific build labels. Ghost
preserves them exactly. Target approval, release resolution, channel policy and
major-update compatibility checks belong to the host. All other body keys are
rejected.

A database-backed IP limiter runs before authentication on all three endpoints.
It allows 180 attempts per minute, shared across status polling, job polling
and request creation. This limits authentication work while allowing
normal polling. Hosts can tune it with `spam.upgrade_api_block`.

The separate shared database-backed limiter allows three POST attempts per staff user
before a one-minute block, across IPs and Ghost instances. Denied lower-role
users cannot consume an owner's request budget. Hosts must independently enforce
concurrency and atomically deduplicate requests. Ghost deliberately does not
preflight status before creation, so replay can work while a host is busy or
restarting or after its target list changes.

The controller parses request inputs once during API validation. The service
accepts those typed inputs and validates results from the external adapter.

Status distinguishes unsupported hosts from busy, blocked and temporarily
unavailable services. Lookup returns explicit `unknown` and `expired` records;
temporary I/O or invalid adapter results return `UPGRADE_UNAVAILABLE` instead.
Unexpected adapter failures are logged with their original errors locally and
returned with a fixed public message.

Expected host rejections map to `UPGRADE_UNSUPPORTED` (403),
`UPGRADE_UNAVAILABLE` (503), `UPGRADE_BUSY` (409),
`UPGRADE_TARGET_UNAPPROVED` (422), `UPGRADE_IDEMPOTENCY_CONFLICT` (409),
`UPGRADE_REQUEST_EXPIRED` (409) or `UPGRADE_CHECKS_FAILED` (422).
Validated public diagnostics appear in status/job `diagnostics` and in rejection
`errors[].details.diagnostics`. Findings have a source, stable code, severity,
plain-text message and optional explanatory details, help link and relative
file locations. Gscan, backup, database and host findings share this format.
Errors and warnings retain their descriptions independently of job state.
Images, unknown fields and raw exception text are excluded from public output.

## Verification

From the repository root:

```sh
pnpm --filter @tryghost/adapter-base-upgrade build
pnpm --filter @tryghost/adapter-base-upgrade test
pnpm --filter @tryghost/adapter-base-upgrade lint
pnpm --filter ghost test:types
pnpm --filter ghost test:single test/unit/server/services/upgrades
pnpm --filter ghost test:single test/unit/server/services/adapter-manager
pnpm --filter ghost test:single test/e2e-api/admin/upgrades.test.js
```

The API suite needs the normal MySQL test service. Adapter manager tests verify
the default and a CommonJS adapter under a temporary content directory. Package
tests verify production `require()` resolution from the compiled package.
