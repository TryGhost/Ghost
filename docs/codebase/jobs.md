# Jobs System

Ghost's jobs system runs work inline or in a worker thread. Jobs can run once or
on a schedule.

Use inline jobs for short work which does not block the event loop. Inline jobs
cannot be scheduled. Scheduled and offloaded jobs run in worker threads, so
they must initialize their own dependencies and cannot rely on the main Ghost
process's memory.

## Adding a job

Jobs are registered through the service in
`ghost/core/core/server/services/jobs/`. The service is a wrapper around
`@tryghost/job-manager` and provides Ghost's logging, configuration, models, and
events.

Existing examples include:

- Imports, which run as inline jobs.
- Email analytics, which uses scheduled worker jobs.

Prefer an existing job with similar lifecycle and failure requirements as the
starting point for a new one.

## The class-based jobs service

Recurring jobs are moving off the Bree wrapper and onto the class-based jobs
service in `ghost/core/core/server/services/jobs-service/`. A job there is a
class with a stable static `type` and a serialisable payload; its handler is
registered centrally in `register-job-handlers.ts`, and boot owns scheduling.
Handlers run on the main event loop rather than in a worker, so they do not
re-initialize services, and any job whose slowest branch is unbounded must wrap
itself in `withDeadline` so shutdown can still drain - a job abandoned at its
deadline is reported as a warning, not a failure. Clean-tokens and update checks
have moved; prefer this service for new recurring work.

When adding a service which registers jobs, give it an explicit `init()` call
from `ghost/core/core/boot.js`. Keep the wrapper's `init()` idempotent, but let
boot own service construction and worker setup rather than initializing on the
first request.

## Testing

Tests for the jobs wrapper live in
`ghost/core/test/unit/server/services/jobs/`. Class-based jobs are covered by a
unit test per job for its type, payload and scheduling, plus an integration test
that dispatches it against a booted Ghost - see
`ghost/core/test/integration/jobs/update-check.test.ts`. Tests should cover the
job's result and failure behavior.

## Scheduling

The jobs system uses Bree for scheduled work. Schedules use the server's system
timezone. Offloaded jobs should have unique names, be safe to run more than
once, and receive identifiers rather than large objects where possible.
