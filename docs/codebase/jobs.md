# Jobs System

Ghost's jobs system runs work inline or in a worker thread. Jobs can be
scheduled, queued, or persisted so they can resume after Ghost restarts.

Use inline jobs for short work which does not block the event loop. Use worker
threads for CPU-heavy or long-running work that should not affect requests.
Persist a job when losing it during a restart would leave Ghost in an incorrect
state.

## Adding a job

Jobs are registered through the service in
`ghost/core/core/server/services/jobs/`. The service is a wrapper around
`@tryghost/job-manager` and provides Ghost's logging, configuration, models, and
events.

Existing examples include:

- Update checks, which run inline on a schedule.
- Imports, which run as inline jobs.
- Email analytics, which uses offloaded and persisted jobs.

Prefer an existing job with similar lifecycle and failure requirements as the
starting point for a new one.

## Testing

Integration tests for the jobs system live in `ghost/core/test/integration/jobs/`.
Tests should cover the job's result and any state that must survive a restart.

## Scheduling

The jobs system uses Bree for scheduled work. Schedules use the server's system
timezone, so take care when a job needs to run at a specific local time.
