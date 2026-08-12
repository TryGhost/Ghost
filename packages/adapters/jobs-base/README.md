# @tryghost/adapter-base-jobs

Base class for Ghost background jobs adapters. A jobs adapter is the backend
of Ghost's class-based jobs service: it accepts serialised job envelopes
(`{type, payload}`), stores or queues them however it likes, and delivers them
back to the service's processor, which rehydrates the payload and runs the one
registered handler for the type.

The in-memory adapter that ships with Ghost
(`ghost/core/core/server/adapters/jobs/InMemoryJobsBackend.ts`) is the
reference implementation of this contract.

See the [Ghost adapters documentation](https://docs.ghost.org/config#adapters)
for how adapters are configured and loaded.

## Usage

Extend `JobsBackendBase` and implement every method listed in `requiredFns`:
`start`, `enqueue`, `scheduleRecurring`, and `shutdown`.

```js
const {JobsBackendBase} = require('@tryghost/adapter-base-jobs');

class MyJobsBackend extends JobsBackendBase {
    async start({processor}) {
        // remember `processor`; call (and await) it once per delivered job
    }

    async enqueue(envelope) {
        // accept {type, payload} for delivery; resolve on acceptance
    }

    async scheduleRecurring(envelope, {cron}) {
        // deliver `envelope` on the given cron cadence; re-scheduling a
        // type replaces its previous schedule
    }

    async shutdown({timeoutMs} = {}) {
        // stop the tick, stop accepting, drain in-flight work within timeoutMs
    }
}
```

## The contract

* `enqueue` resolves when the job is **accepted**, not when it has run — a
  durable backend cannot promise completion to the caller, and no completion
  signal crosses this interface.
* The processor never rejects: handler lookup, payload rehydration and error
  reporting are owned by Ghost's jobs service. Backends must still `await`
  it so in-flight work is visible to `shutdown`'s drain, and must survive a
  rejected processor call without crashing their delivery loop.
* Delivery is at-most-once in memory but at-least-once on a durable backend;
  handlers are written to tolerate redelivery.
* `type` strings are stable public names — they will eventually persist in
  database rows. Never rename one.
* How recurring schedules are stored and what fires the tick is a backend
  decision, not part of the shared interface's semantics.
* `shutdown` drains in-flight jobs within a bounded time; a stuck handler
  must not hang the process.

## Testing a backend (including future durable ones)

The contract has an executable form: the shared behaviour suite in
`ghost/core/test/unit/server/adapters/jobs/jobs-backend-contract.ts`
(`itBehavesLikeAJobsBackend`). It asserts the semantics documented above —
acceptance vs. completion, ordering, drain/shutdown, stuck-handler timeout —
against the public adapter surface only, never implementation details. The
in-memory backend runs it today.

A durable backend (e.g. DB- or queue-backed) should be verified in three
layers, none of which require changes to the interface or any call site:

1. **Contract suite** — run `itBehavesLikeAJobsBackend` against the new
   adapter, providing a `settle()` barrier appropriate to the backend (e.g.
   poll the store until empty). Where the in-memory backend is exercised with
   fake timers, a durable backend's recurring tick can be driven by invoking
   its tick entry point directly.
2. **Adapter seam** — select the new adapter via `adapters:jobs` config in a
   test and assert the jobs service works against it unchanged (see
   `ghost/core/test/unit/server/services/adapter-manager/jobs-wiring.test.ts`
   for the resolution test, and the "adapter seam" cases in the jobs service
   unit tests for the substitution test). `bin/validate-adapters.ts` checks
   the class implements `requiredFns` at build time.
3. **Migrated-job behaviour tests** — the behaviour tests for migrated jobs
   (e.g. `test/integration/services/members/clean-tokens.test.js`) are
   written against the jobs service interface, not the backend, so the same
   suite runs against any configured backend. Durable-only semantics —
   redelivery after a crash, at-least-once duplication, persistence across
   restarts — get backend-specific integration tests alongside the service
   they live in, following the Redis/MinIO pattern of probing for the
   backing service and auto-skipping when it is down (always on in CI).
