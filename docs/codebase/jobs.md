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

- Update checks, which run in a worker on a schedule.
- Imports, which run as inline jobs.
- Email analytics, which uses scheduled worker jobs.

Prefer an existing job with similar lifecycle and failure requirements as the
starting point for a new one.

When adding a service which registers jobs, give it an explicit `init()` call
from `ghost/core/core/boot.js`. Keep the wrapper's `init()` idempotent, but let
boot own service construction and worker setup rather than initializing on the
first request.

## Testing

Tests for the jobs wrapper live in
`ghost/core/test/unit/server/services/jobs/`, with update-check integration
coverage in `ghost/core/test/integration/jobs/`. Tests should cover the job's
result and failure behavior.

## Scheduling

The jobs system uses Bree for scheduled work. Schedules use the server's system
timezone. Offloaded jobs should have unique names, be safe to run more than
once, and receive identifiers rather than large objects where possible.
