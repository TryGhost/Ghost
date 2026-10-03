# Upgrade adapter contract

`@tryghost/adapter-base-upgrade` defines host-managed Ghost updates. Ghost
validates public results; the host owns approved versions, compatibility checks,
checkpointing, execution and recovery. Transport details such as Docker images,
heartbeats and file protocol versions belong inside the host's adapter.

## Implementation

Extend the named `UpgradeBase` export and implement these async methods:

| Method                                           | Result                                            |
| ------------------------------------------------ | ------------------------------------------------- |
| `getStatus()`                                    | Capability, availability and approved targets     |
| `createRequest({targetVersion, idempotencyKey})` | The accepted job for this intent                  |
| `getJob(id)`                                     | A job, an `unknown` record or an `expired` record |

The adapter manager supplies optional constructor configuration. Constructors
must not perform I/O; Ghost must boot without a running update service.

An unconfigured or unsupported host returns `supported: false` and reason
`not-configured` or `not-supported`. A configured host returns `supported: true`
and availability `ready`, `busy`, `unavailable` or `blocked`. Ready status requires
`currentVersion`, approved `targets` containing only `{version}`, and
`backupRequired: true`. Other availability states may omit version discovery.
`activeJobId`, `pollAfterMs` (1000–60000) and diagnostics are optional.

Versions are opaque, non-empty release identifiers of at most 128 characters.
Stable versions, prereleases, nightly versions and host-specific build labels
are allowed. Ghost preserves the selected identifier without normalizing,
comparing or resolving it. The host must approve each target, resolve it to the
intended release, and retain that resolution for execution and idempotent replay.
A label such as `nightly` is usable only if the host approves and resolves it.
Major-update compatibility checks and channel policy belong to the host; these
types do not implement them. An individual adapter may support only stable
same-major updates.

The adapter contract uses camelCase keys. Ghost maps request and response keys
to snake_case at the [Admin API boundary](../../../ghost/core/core/server/services/upgrades/README.md).

## Durable acceptance

Ghost scopes the client's request key to the authenticated staff identity and
passes an opaque 64-character hexadecimal `idempotencyKey`. The adapter must
atomically and durably associate that key with one target and a host-generated
lowercase UUID v4 job ID. Replay this association **before** checking current
availability or the target list: retrying after a lost acknowledgement, a restart,
or completion must return the original job. Concurrent calls with the same key
must converge on the same job. A reused key with another target must reject with
`idempotency-conflict`.

An accepted result requires `targetVersion`, `createdAt`, `updatedAt` and a known
job state. Keep tombstones for expired intents and never execute them again;
return `request-expired`. The host must recover interrupted acceptance between
persisting an intent and queueing it. Reject temporary lookup failures rather
than returning `unknown`. Keep deduplication records durably across restarts and
for at least the lifetime of the key. Host concurrency control remains required
for different keys and operations initiated outside Ghost.

## Public diagnostics

Status, job results and `UpgradeAdapterError` can carry a generic `diagnostics`
array. Each diagnostic has `source`, `code`, `severity` (`error`, `warning` or
`info`), and a plain-text `message`. Optional `details`, an HTTPS `help` URL and
relative `locations` with file, line and column support actionable explanations.
For example:

```js
const diagnostics = [
  {source: 'gscan', code: 'removed-helper', severity: 'error',
    message: 'The theme uses a removed helper.',
    details: 'Replace the helper before updating.',
    locations: [{file: 'post.hbs', line: 12}]},
  {source: 'backup', code: 'low-space', severity: 'warning',
    message: 'Available disk space is close to the backup requirement.'}
];
```

These are deliberately authored public explanations, never serialized exceptions,
subprocess output or stacks. Hosts must remove secrets and private paths from
text; schemas cannot infer whether prose contains private data. Consumers must
render text as text. Unknown fields are stripped, absolute/traversing file paths
and non-HTTPS help links are rejected, and counts and text lengths are bounded.

Job states include `checking` and `blocked` as well as execution and recovery
states. Severity describes an individual finding; job state and availability
describe whether the host can proceed. Warnings do not automatically block an
update, and this contract does not define warning acknowledgement or override.

Throw `UpgradeAdapterError` for expected rejection codes: `unsupported`,
`unavailable`, `busy`, `target-unapproved`, `idempotency-conflict`,
`request-expired` or `checks-failed`. Other failures are logged locally by Ghost
and returned as temporary unavailability. Ghost exposes validated diagnostics
through the [Admin API](../../../ghost/core/core/server/services/upgrades/README.md),
without exposing raw exception messages.

## Production loading

The standard ESM build supports CommonJS on Ghost's supported Node versions:

```js
const {UpgradeBase, UpgradeAdapterError} = require('@tryghost/adapter-base-upgrade');
```

Production uses `build/` rather than the development `source` condition. Ghost
ships this package as a direct dependency so adapters under `content/adapters`
can resolve it from the installation's `node_modules`. Use Ghost's installed
copy so inheritance and typed errors share the registry's class identity.

Run `pnpm build`, `pnpm test`, and `pnpm lint` in this package. Build before testing
to verify the compiled CommonJS import as well as source schemas.
