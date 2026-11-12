# Jobs System

Ghost's jobs system runs work in-process through the jobs service in
`ghost/core/server/services/jobs-service/`. Jobs can run once or on a
schedule.

Jobs run in-process and share the main process's initialized services. Keep
their work asynchronous so they do not block the event loop.

## Adding a job

New jobs use the jobs service. Define a data-only `Job` subclass
with a unique static type and serializable payload, register its handler
through `jobsService.handle(JobClass, handler)` in
`ghost/core/server/services/jobs-service/register-job-handlers.ts`, which
boot wires up before starting the service, and inject `JobsService` into the
service that dispatches the job. Boot, or that service's root in its
[`create` callback](../../ghost/core/server/services/README.md#initialization),
passes in `JobsService` or a dispatch function. Handlers should only route the
rehydrated payload to an initialized service method. The queue options below
are part of this API.

Current examples include:

- [Gift reminders](../../ghost/core/server/services/gifts/jobs/send-gift-reminders-job.ts),
  dispatched on a recurring schedule.
- [Site content imports](../../ghost/core/server/data/importer/jobs/content-import-job.ts),
  dispatched once in the shared default lane with the key of the stored upload
  and the name it was uploaded with. Import failures resolve after reporting by
  email; completion-email failures reject. Testing environments and explicit
  direct calls still run inline.
- [Newsletter sending](../../ghost/core/server/services/email-service/jobs/send-email-job.ts),
  dispatched once with an email ID.
- [Email analytics](../../ghost/core/server/services/email-analytics/jobs/email-analytics-job-scheduler.ts),
  which schedules one recurring job per pipeline (newsletters, automations,
  gifts), each in its own queue. Overlapping ticks are skipped by the analytics
  wrapper's own per-process fetch guard rather than queued. A tick is awaited
  as one handler run, continuation passes included, so a shutdown during a
  long fetch drains it up to `server:shutdownTimeout`.

For recurring work, copy the gift reminders job above, scheduled in
[`gifts/jobs/index.js`](../../ghost/core/server/services/gifts/jobs/index.js).
For a job dispatched once, copy the
[external media inliner job](../../ghost/core/server/services/media-inliner/external-media-inliner-job.ts),
dispatched by `startInlining` in
[`external-media-inliner.js`](../../ghost/core/server/services/media-inliner/external-media-inliner.js).
Then check that:

- The job class lives in a `*-job.ts` file. A test in
  `register-job-handlers.test.ts` finds job classes by that name and fails if
  one has no handler.
- Its payload is small JSON, such as IDs or storage keys, not local file
  paths. The content CSV import still passes a file path; don't copy that.
- Import `jobs-service/index.ts` only from boot or a service root. API
  endpoints and a service's other files get the jobs service, or a dispatch
  function, passed in.
- Its handler gets its service from boot through `registerJobHandlers`, not
  from an import.
- It has no `NODE_ENV` checks. Boot starts no schedules under test. A schedule
  started later needs a `backgroundJobs` config key, set to `true` in
  `ghost/core/shared/config/defaults.json` and to `false` in both testing
  configs in `ghost/core/shared/config/env/`, as email analytics does.
- It uses the shared default lane unless it can flood the shared workers, must
  not wait behind other jobs, or must run one at a time. See [Queues](#queues).
- Its handler is safe to run more than once. See [Scheduling](#scheduling) and
  the jobs backend's
  [delivery outcome](../../packages/adapters/jobs-base/README.md#delivery-outcome).
- It has a unit test that rebuilds the job from its JSON, a handler case in
  `register-job-handlers.test.ts`, and an integration test that dispatches it
  and waits for its observable result. See [Testing](#testing).

When adding a service which dispatches jobs, give it an explicit `init()` call
from `ghost/core/boot.js`. Keep the wrapper's `init()` idempotent, but let
boot own service initialization and dependency injection rather than
initializing on the first request. Wrappers can construct their services
inside `init()`.

## Queues

Handlers registered through the jobs service can declare a queue and a
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

Tests for the jobs service live in
`ghost/test/unit/server/services/jobs-service/`. Tests should cover the
job's result and failure behavior.

Awaiting `dispatch()` only waits for the backend's enqueue call. Tests which
need the work to finish should wait for its observable result. Newsletter
tests should follow the [email service testing guidance](../../ghost/core/server/services/email-service/README.md#testing).
Site import tests wait for the completion email, which is sent after the stored
upload has been deleted. The importer's `site_content_import.completed` event
records successful imports; generic job completion only records that the handler
settled, which it also does for an import failure it reported. There are no
automatic retries and no collection of uploads orphaned by a shutdown between
dispatch and execution. The exception is a site with
`services:jobs:outbox:keepUntilSettled` on: its outbox keeps each row until the
job settles, so a job that a restart or crash cut short runs again, from the
start, at the next boot. A job type with its own recovery opts out with
`static replayAfterRestart = false`, and its rows are dropped at boot instead.
Newsletter sends do this, because the newsletter boot scan recovers them.

## Scheduling

The jobs service schedules with cron expressions through its backend.
Schedules use the server's system timezone. Jobs should have unique names, be safe to run more than once,
and receive identifiers rather than large objects where possible.
