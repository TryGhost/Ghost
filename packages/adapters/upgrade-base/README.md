# @tryghost/adapter-base-upgrade

Base class and contract for host-managed Ghost upgrades.

Ghost never upgrades itself. A host that can update a site (for example the
ghost-docker supervisor) provides an `upgrade` adapter, and Ghost's Admin API
uses it to discover available updates, submit an update request and read its
outcome. The host owns release approval, execution, backups, compatibility
checks and recovery.

Ghost ships `HttpUpgradeAdapter`, which talks to a host's upgrade API over a
Unix socket (see Ghost's `core/server/adapters/upgrade/README.md`), and
`NoopUpgradeAdapter` as the default. It reports
`{supported: false, reason: 'not-configured'}`, rejects requests as
`unsupported` and looks every job up as `unknown`.

## Contract

An adapter extends `UpgradeBase` and implements three methods. Construction
must not perform I/O or require the host to be reachable: Ghost boots whether
or not the host is running.

- `getStatus()` reports whether updates are supported and, when they are, the
  host's availability, its backup policy (`backupRequired`, required when
  `ready`) and two lists of updates:
  - `oneClick`: updates the host can perform within its policy. Admin offers
    to run them.
  - `manual`: updates that need steps on the host, with a `reason` and the
    `steps`. Admin shows them as a notice.

  Each entry names its `component` (`ghost`, `stack`, ...) and its
  `fromVersion`/`toVersion`. Availability is `ready`, `busy`, `unavailable`,
  `stale` (the host executor stopped reporting) or `incompatible` (protocol
  mismatch).

- `createRequest({component, toVersion, idempotencyKey})` durably accepts an
  update and resolves the host's job. A call with an `idempotencyKey` the host
  has already accepted must resolve the original job, before checking
  availability or policy, so a client can safely retry after a lost response.
  Reusing a key for a different update rejects with `idempotency-conflict`.
  Job IDs are opaque lowercase tokens of up to 64 characters (`a-z`, `0-9`,
  `-`), such as a UUID or the idempotency key itself.
- `getJob(id)` resolves the job, or `{id, state: 'unknown'}` /
  `{id, state: 'expired'}` for records the host does not have or no longer
  keeps. Throw only for temporary failures.

Expected rejections throw `UpgradeAdapterError` with one of `unsupported`,
`unavailable`, `busy`, `target-unapproved`, `idempotency-conflict` or
`request-expired`, and optionally `diagnostics`. Any other error is logged by
Ghost and reported to the client as temporarily unavailable.

### Job states

| State                                                           | Meaning                                                              |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| `pending`                                                       | Accepted, not yet claimed by the host. There is no queue.            |
| `backing-up`, `pulling`, `restarting`, `verifying`, `restoring` | The host executor's stages.                                          |
| `done`                                                          | Updated.                                                             |
| `restored`                                                      | The update failed and the site was restored from its backup.         |
| `needs-operator`                                                | Automatic recovery was unsafe or failed; diagnostics say what to do. |
| `refused`                                                       | Policy, a held lock, another active job, or a malformed request.     |
| `interrupted`                                                   | The host found the job unfinished on start. It is never resumed.     |

### Diagnostics

Statuses, jobs and rejections can carry `diagnostics`: plain-text findings
with a `source`, a stable `code`, a `severity` (`error`, `warning`, `info`), a
`message` and optional `details` and HTTPS `help` link. Ghost validates every
adapter result against the schemas exported here and strips fields they do not
define, so host internals such as image references and file paths never reach
API clients.

## Develop

This package is on the continuous `alpha` lane while the contract settles: each
change merged to `main` publishes the next `0.1.0-alpha.N` under the `alpha`
dist-tag. Pin an exact alpha version, since any release can break the contract.

```sh
pnpm --filter @tryghost/adapter-base-upgrade build
pnpm --filter @tryghost/adapter-base-upgrade test
pnpm --filter @tryghost/adapter-base-upgrade lint
```
