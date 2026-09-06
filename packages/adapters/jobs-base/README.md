# @tryghost/adapter-base-jobs

Base class and contract for Ghost jobs backends.

A jobs backend is the swappable transport behind Ghost's class-based jobs
interface. It only ever sees serialised `{type, payload}` envelopes and a single
delivery `processor` callback - it never touches a live job instance. That is
what keeps jobs serialisable end to end and lets a durable backend replace the
in-memory one with no call-site change.

## Contract

A backend extends `JobsBackendBase` and implements four methods:

- `start({processor, queues})` - wire the single delivery callback and begin accepting work. `queues` is the desired state declared by registered handlers (`{name: {concurrency}}`).
- `enqueue(envelope, {queue})` - accept an envelope for delivery. Resolves on **acceptance**, not completion.
- `scheduleRecurring(envelope, {cron}, {queue})` - register the recurring schedule for the envelope's type. The first registration per type wins; a later call for an already-scheduled type is ignored.
- `shutdown({timeoutMs})` - stop accepting work and drain in-flight work within a bounded time.

### Queues

A queue is a routing/QoS lane, and routing metadata only - **delivery always
routes by the envelope's `type`, never by queue**, so a job is processable
whichever queue it arrives on and a deploy can move a type between queues while
older work is still in flight. Renaming or removing a queue is therefore a
parallel change: keep consuming the old name until it has drained, then drop it.

The declared queues are desired state, not a command. A backend enforces a
queue's `concurrency` as strictly as it can - per process for the in-memory
backend, globally where a durable backend supports it. Weaker enforcement is
acceptable; silently ignoring a declaration is not: a backend that cannot
satisfy a declared queue's constraints - whatever that means for its
implementation - must fail loudly at `start()`. An envelope routed to a queue
no handler declared must still be delivered, never dropped. The queue name
`default` names the shared lane for envelopes with no routing and cannot be
declared.

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
