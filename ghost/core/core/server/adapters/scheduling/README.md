# Scheduling

The scheduling adapter arms HTTP callbacks that hit the Admin API at a future
time, so scheduled work fires even if no request wakes the process. The
contract lives in `@tryghost/adapter-base-scheduling`
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

Consumers `register()` themselves with the adapter. The adapter calls
`rescheduleAll({previousKey})` on every registered consumer when the queue
must be rebuilt — today from `services/auth/reset-authentication.ts` after the
internal scheduler key rotates, and (without a `previousKey`) from boot when
the adapter sets `rescheduleOnBoot`. During rotation, consumers unschedule the
job signed under the previous key and schedule a replacement under the current
one; on boot there is no distinct stale URL, so unschedules are flagged
`bootstrap` and the adapter skips writing a tombstone.

## Consumers

- `services/post-scheduling` — one job per scheduled post or page.
- `services/automations` — a chain-head poll callback; each poll arms the
  next.
- `services/gifts` — two `SignedFlushScheduler` configurations, for delivery
  and reminder flushes.
