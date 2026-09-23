# Jobs System

Ghost's jobs system runs work in-process through the class-based jobs service
in `ghost/core/core/server/services/jobs-service/`, or through the legacy jobs
service for jobs which have not yet migrated. Jobs can run once or on a
schedule.

Class-based jobs run in-process and share the main process's initialized
services. Keep their work asynchronous so they do not block the event loop.

The legacy service also supports in-process work through its inline jobs,
which cannot be scheduled. Its scheduled and offloaded jobs run in worker
threads through Bree, so they must initialize their own dependencies and
cannot rely on the main Ghost process's memory.

## Adding a job

New jobs use the class-based jobs service. Define a data-only `Job` subclass
with a unique static type and serializable payload, register its handler
through `jobsService.handle(JobClass, handler)` in
`ghost/core/core/server/services/jobs-service/register-job-handlers.ts`, which
boot wires up before starting the service, and inject `JobsService` into the
service that dispatches the job from boot. Handlers should only route the
rehydrated payload to an initialized service method. The queue options below
are part of this API.

Current examples include:

- [Gift reminders](../../ghost/core/core/server/services/gifts/jobs/send-gift-reminders-job.ts),
  dispatched on a recurring schedule.
- [Newsletter sending](../../ghost/core/core/server/services/email-service/jobs/send-email-job.ts),
  dispatched once with an email ID.

Prefer an existing job with similar lifecycle and failure requirements as the
starting point for a new one.

When adding a service which dispatches jobs, give it an explicit `init()` call
from `ghost/core/core/boot.js`. Keep the wrapper's `init()` idempotent, but let
boot own service initialization and dependency injection rather than
initializing on the first request. Wrappers can construct their services
inside `init()`.

## Legacy jobs

The legacy service in `ghost/core/core/server/services/jobs/` wraps
`@tryghost/job-manager` and remains for unmigrated jobs. Do not add new jobs to
it. Existing legacy examples include:

- The site content import (`ghost/core/core/server/data/importer/`), which runs
  as an inline job.
- Email analytics, which uses scheduled worker jobs.

## Queues

Handlers registered through the class-based service can declare a queue and a
concurrency limit together alongside the handler
(`jobsService.handle(Job, handler, {queue: 'webmentions', concurrency: 3})`),
which isolates slow or flood-prone job types from the shared workers; with no
declaration the job type runs on the shared default lane. The queue only
affects which workers run the job and how many run at once - delivery always
routes by job type. Webmention processing runs on its own `webmentions` queue
this way.

Newsletter sends use the dedicated `email` queue with concurrency 2, so they
do not compete with member imports, content CSV imports, and other shared jobs
for queue slots. Each send already runs up to two batch workers. Allowing two
sends keeps one long send or retry from blocking every other newsletter. The
in-memory backend enforces these limits per process.

## Testing

Tests for the legacy jobs wrapper live in
`ghost/core/test/unit/server/services/jobs/`, and tests for the class-based
service in `ghost/core/test/unit/server/services/jobs-service/`. Tests should
cover the job's result and failure behavior.

Awaiting `dispatch()` only waits for the backend's enqueue call. Tests which
need the work to finish should wait for its observable result. Newsletter
tests should follow the [email service testing guidance](../../ghost/core/core/server/services/email-service/README.md#testing);
the legacy job manager's `allSettled` event does not cover class-based jobs.

## Scheduling

The legacy jobs service uses Bree for scheduled work; the class-based service
schedules with cron expressions through its backend. Schedules use the server's
system timezone. Jobs should have unique names, be safe to run more than once,
and receive identifiers rather than large objects where possible.
