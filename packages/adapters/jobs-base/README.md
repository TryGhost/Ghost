# @tryghost/adapter-base-jobs

Base class and contract for Ghost jobs backends.

A jobs backend is the swappable transport behind Ghost's class-based jobs
interface. It only ever sees serialised `{type, payload}` envelopes and a single
delivery `processor` callback - it never touches a live job instance. That is
what keeps jobs serialisable end to end and lets a durable backend replace the
in-memory one with no call-site change.

## Contract

A backend extends `JobsBackendBase` and implements four methods:

- `start({processor})` - wire the single delivery callback and begin accepting work.
- `enqueue(envelope)` - accept an envelope for delivery. Resolves on **acceptance**, not completion.
- `scheduleRecurring(envelope, {cron})` - register the recurring schedule for the envelope's type. The first registration per type wins; a later call for an already-scheduled type is ignored.
- `shutdown({timeoutMs})` - stop accepting work and drain in-flight work within a bounded time.

### Delivery outcome

The backend delivers an envelope by calling `processor(envelope)` and awaiting the
returned promise. **The processor may reject: a rejected promise means a failed
delivery.** The backend decides what happens next - the in-memory reference
backend logs and drops it (parity with the legacy in-process queue, no
redelivery); a durable backend can redeliver. The processor never throws
synchronously, so a backend only needs to handle the rejected-promise case.

`scheduleRecurring` is idempotent per type - the first schedule wins and
re-registration is a no-op, so a durable backend must not disturb an
already-running schedule. `cron` is a 5-field expression or 6 fields with a
leading seconds field. Delivery is at-most-once in memory but at-least-once on a
durable backend, so handlers must tolerate redelivery.

## Shared contract test suite

The package exports a backend-agnostic test suite so every backend runs the same
acceptance / delivery / drain / bounded-shutdown assertions:

```ts
import {runJobsBackendContractTests} from '@tryghost/adapter-base-jobs/contract-test-suite';

// `describe`/`it` are injected so the suite depends on no specific test runner
runJobsBackendContractTests(() => new MyJobsBackend(), {describe, it});
```
