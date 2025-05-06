# Job Manager

A manager for background jobs in Ghost, supporting one-off tasks and recurring jobs.

## Table of Contents
- [Quick Start](#quick-start)
- [Job Types](#job-types)
- [Background Job Requirements](#background-job-requirements)
- [Advanced Usage](#advanced-usage)
- [Technical Details](#technical-details)

## Quick Start

```js
const JobManager = require('@tryghost/job-manager');
const jobManager = new JobManager({JobModel: models.Job});

// Simple one-off job
jobManager.addJob({
    name: 'hello-world',
    job: () => console.log('Hello World'),
    offloaded: false
});

// Recurring job every 5 minutes
jobManager.addJob({
    name: 'check-emails',
    at: 'every 5 minutes',
    job: './jobs/check-emails.js'
});
```

## Job Types

Ghost supports two types of jobs:

1. **Inline Jobs**
   - Run in the main Ghost process
   - Best for quick, simple tasks
   - Cannot be scheduled or recurring

2. **Offloaded Jobs**
   - Run in a separate process
   - Good for CPU-intensive tasks
   - Can be scheduled or recurring

## Background Job Requirements

Offloaded jobs must:

- Have a unique name
- Be idempotent (safe to run multiple times)
- Use minimal parameters (prefer using IDs rather than full objects)
- Import their own dependencies
- Primarily use DB or API calls

## Advanced Usage

Below is a sample code to wire up job manger and initialize jobs. This is the simplest way to interact with the job manager - these jobs do not persist after reboot:
```js
const JobManager = require('@tryghost/job-manager');

const jobManager = new JobManager({JobModel: models.Job});

// register a job "function" with queued execution in current event loop
jobManager.addJob({
    job: (word) => console.log(word),
    name: 'hello',
    offloaded: false
});

// register a job "module" with queued execution in current even loop
jobManager.addJob({
    job:'./path/to/email-module.js',
    data: {email: 'send@here.com'},
    offloaded: false
});

// register recurring job which needs execution outside of current event loop
jobManager.addJob({
    at: 'every 5 minutes',
    job: './path/to/jobs/check-emails.js',
    name: 'email-checker'
});

// register recurring job with cron syntax running every 5 minutes
// job needs execution outside of current event loop
// for cron builder check https://crontab.guru/ (first value is seconds)
jobManager.addJob({
    at: '0 1/5 * * * *',
    job: './path/to/jobs/check-emails.js',
    name: 'email-checker-cron'
});

// register a job to run immediately running outside of current even loop
jobManager.addJob({
    job: './path/to/jobs/check-emails.js',
    name: 'email-checker-now'
});

// register a one-off job to be executed immediately within current event loop
jobManager.addOneOffJob({
    name: 'members-migrations',
    offloaded: false,
    job: stripeService.migrations.execute.bind(stripeService.migrations)
});

// register a one-off job to be executed immediately outside of current event loop
jobManager.addOneOffJob({
    name: 'generate-backup-2022-09-15',
    job: './path/to/jobs/backup.js',
});

// optionally await completion of the one-off job in case 
// there are state changes expected to execute the rest of the process
//  NOTE: if multiple jobs are submitted using the same name, the first completion will resolve
await jobManager.awaitOneOffCompletion('members-migrations');

// check if previously registered one-off job has been executed 
// successfully - it exists and doesn't have a "failed" state.
//  NOTE: this is stored in memory and cleared on reboot
const backupSuccessful = await jobManager.hasExecutedSuccessfully('generate-backup-2022-09-15');

if (!backupSuccessful) {
    // One-off jobs with "failed" state can be rescheduled
    jobManager.addOneOffJob({
        name: 'generate-backup-2022-09-15',
        job: './path/to/jobs/backup.js',
    });
}
```

For more examples of JobManager initialization check [test/examples](https://github.com/TryGhost/Utils/tree/master/packages/job-manager/test/examples) directory.

## Technical Details

### Process Isolation
Background jobs run in separate processes, meaning:
- No shared memory with Ghost
- Must import own dependencies
- Should avoid heavy dependencies
- Should handle graceful shutdown

### Job Lifecycle
Offloaded jobs are running on dedicated worker threads which makes their lifecycle a bit different from inline jobs:
1. When **starting** a job it's only sharing ENV variables with its parent process. The job itself is run on an independent JavaScript execution thread. The script has to re-initialize any modules it will use. For example, it should take care of: model layer initialization, cache initialization, etc.
2. When **finishing** work in a job prefer to signal successful termination by sending 'done' message to the parent thread: `parentPort.postMessage('done')` ([example use](https://github.com/TryGhost/Utils/blob/0e423f6c5c69b08d81d470f49de95654d8cc90e3/packages/job-manager/test/jobs/graceful.js#L33-L37)). Finishing work this way terminates the thread through [worker.terminate()]((https://nodejs.org/dist/latest-v14.x/docs/api/worker_threads.html#worker_threads_worker_terminate)), which logs termination in parent process and flushes any pipes opened in thread.
3. Jobs that have iterative nature, or need cleanup before interrupting work should allow for **graceful shutdown** by listening on `'cancel'` message coming from parent thread ([example use](https://github.com/TryGhost/Utils/blob/0e423f6c5c69b08d81d470f49de95654d8cc90e3/packages/job-manager/test/jobs/graceful.js#L12-L16)).
4. When **exceptions** happen and expected outcome is to terminate current job, leave the exception unhandled allowing it to bubble up to the job manager. Unhandled exceptions [terminate current thread](https://nodejs.org/dist/latest-v14.x/docs/api/worker_threads.html#worker_threads_event_error) and allow for next scheduled job execution to happen.

For more nuances on job structure best practices check [bree documentation](https://github.com/breejs/bree#writing-jobs-with-promises-and-async-await).
