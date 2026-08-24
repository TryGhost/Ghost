# Scheduling

Scheduling adapters queue future Admin API callbacks, allowing scheduled work
to wake the process. The contract lives in `@tryghost/adapter-base-scheduling`
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
`rescheduleOnBoot`. Same-key replacements use `bootstrap` unscheduling so the
default adapter does not tombstone the replacement job.

## Consumers

- `services/post-scheduling` — one job per scheduled post or page.
- `services/automations` — a chain-head poll callback; each poll arms the
  next.
- `services/gifts` — two `SignedFlushScheduler` configurations, for delivery
  and reminder flushes.
