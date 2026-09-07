# Jobs System

Ghost's jobs system runs work inline, in a worker thread, or in-process through
the class-based jobs service in
`ghost/core/core/server/services/jobs-service/`. Jobs can run once or on a
schedule.

Use inline jobs for short work which does not block the event loop. Inline jobs
cannot be scheduled. Scheduled and offloaded jobs registered through the legacy
Bree-based service run in worker threads, so they must initialize their own
dependencies and cannot rely on the main Ghost process's memory. Jobs migrated
to the class-based service (token cleanup, gift cleanup, update checks) run
in-process and share the main process's initialized services.

## Adding a job

Class-based jobs are registered through
`jobsService.handle(JobClass, handler)` in
`ghost/core/core/server/services/jobs-service/register-job-handlers.ts`, which
boot wires up before starting the service; the queue options below are part of
this API. Legacy jobs are registered through the service in
`ghost/core/core/server/services/jobs/`, a wrapper around
`@tryghost/job-manager` that provides Ghost's logging, configuration, models,
and events.

Existing examples include:

- Gift reminders, which run in a worker on a schedule.
- Imports, which run as inline jobs.
- Email analytics, which uses scheduled worker jobs.

Prefer an existing job with similar lifecycle and failure requirements as the
starting point for a new one.

When adding a service which registers jobs, give it an explicit `init()` call
from `ghost/core/core/boot.js`. Keep the wrapper's `init()` idempotent, but let
boot own service construction and worker setup rather than initializing on the
first request.

## Queues

Handlers registered through the class-based service can declare a queue and a
concurrency limit together alongside the handler
(`jobsService.handle(Job, handler, {queue: 'webmentions', concurrency: 3})`),
which isolates slow or flood-prone job types from the shared workers; with no
declaration the job type runs on the shared default lane. The queue only
affects which workers run the job and how many run at once - delivery always
routes by job type. Webmention processing runs on its own `webmentions` queue
this way.

## Testing

Tests for the legacy jobs wrapper live in
`ghost/core/test/unit/server/services/jobs/`, and tests for the class-based
service in `ghost/core/test/unit/server/services/jobs-service/`. Tests should
cover the job's result and failure behavior.

## Scheduling

The legacy jobs service uses Bree for scheduled work; the class-based service
schedules with cron expressions through its backend. Schedules use the server's
system timezone. Jobs should have unique names, be safe to run more than once,
and receive identifiers rather than large objects where possible.
