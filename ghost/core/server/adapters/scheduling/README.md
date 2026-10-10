# Scheduling

Scheduling adapters queue and trigger future Admin API callbacks. The contract
lives in `@tryghost/adapter-base-scheduling`
(`packages/adapters/scheduling-base`): adapters implement `run`, `schedule`,
and `unschedule`, and inherit a registry of reschedulers from
`SchedulingBase`.

## Modules

- `scheduling-default.ts` — the in-process default adapter. Its queue dies
  with the process, so it sets `rescheduleOnBoot = true` and consumers rebuild
  their jobs at boot. External adapters with a persistent queue opt out.
- `error-capture.ts` — `withErrorCapture(adapter)` decorates the resolved
  adapter so `schedule`/`unschedule` failures are reported (Sentry and logs)
  instead of propagated; no caller awaits these calls. Boot and post
  scheduling both wrap the adapter from `adapter-manager` with it.
- `utils.ts` — `getSignedAdminToken`, which signs a short-lived admin JWT for
  a job's fire time.
- `build-signed-job.ts` — builds an adapter job whose callback URL carries
  that signed token, from an Admin API path and fire time.
- `get-scheduler-idempotency-key.ts` — `getSchedulerIdempotencyKey`, which
  derives the idempotency key a job carries from its consumer namespace, fire
  time, and final callback URL, so a persistent queue can recognise a
  re-registration of a job it already holds.
- `signed-flush-scheduler.ts` — `SignedFlushScheduler`, a flush-queue
  primitive on top of the two above: arms one job per fire time (deduplicated
  in memory), skips already-due times in favour of the caller's own recovery
  pass, and rebuilds its queue at boot and on key rotation.

## Queue rebuilds

Consumers `register()` themselves so the adapter can rebuild every queue after
the internal scheduler key rotates. `services/auth/reset-authentication.ts`
starts this rebuild with the previous key. Post scheduling and
`SignedFlushScheduler` replace jobs signed under that key; automations starts a
fresh poll chain and lets the old callback fail authentication.

Boot rebuilds are consumer-specific and only run when the adapter sets
`rescheduleOnBoot`. On boot the queued job and the reissued job share a
callback URL, so post scheduling handles them according to what the adapter
declares:

- By default it unschedules each job with `bootstrap`, then schedules it. The
  unschedule keeps a persistent queue from gaining a duplicate on every boot,
  and `bootstrap` tells the default adapter not to tombstone the replacement.
- When the adapter sets `dedupesByIdempotencyKey = true`, it only schedules.
  Each job's idempotency key is derived from its fire time and callback URL,
  so the adapter recognises the job it already holds and creates nothing. This
  is the safer path for a persistent queue: an unschedule sent alongside the
  schedule is not ordered against it on the wire, and one that lands second
  removes the job that was just registered.

An adapter should only set `dedupesByIdempotencyKey` once every job in its
queue carries a key. A job queued without one is invisible to the dedupe, so
the first boot would add a keyed twin beside it.

`SignedFlushScheduler` uses `bootstrap` unscheduling for its same-key
replacements regardless of the flag.

## Consumers

- `services/post-scheduling` — one job per scheduled post or page.
- `services/automations` — a chain-head poll callback; each poll arms the
  next.
- `services/gifts` — two `SignedFlushScheduler` configurations, for delivery
  and reminder flushes.
