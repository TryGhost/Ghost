# Job Manager

A manager for jobs (aka tasks) that have to be performed asynchronously, optionally recurring, scheduled or one-off in their nature. The job queue is managed in memory. One-off jobs are persisted in a storage through "JobModel" passed in the constructor.

## Usage

Below is a sample code to wire up job manger and initialize jobs:
```js
const JobManager = require('@tryghost/job-manager');

const jobManager = new JobManager({JobModel: models.Job});

// register a job "function" with queued execution in current event loop
jobManager.addJob({
    job: printWord(word) => console.log(word),
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
jobsService.addOneOffJob({
    name: 'members-migrations',
    offloaded: false,
    job: stripeService.migrations.execute.bind(stripeService.migrations)
});

// register a one-off job to be executed immediately outside of current even loop
jobsService.addOneOffJob({
    name: 'generate-backup-2022-09-15',
    job: './path/to/jobs/backup.js',
});

// optionally await completion of the one-off job in case 
// there are state changes expected to execute the rest of the process
await jobsService.awaitOneOffCompletion('members-migrations');

// check if previously registered one-off job has been executed 
// successfully - it exists and doesn't have a "failed" state.
const backupSuccessful = await jobsService.hasExecutedSuccessfully('generate-backup-2022-09-15');

if (!backupSuccessful) {
    // One-off jobs with "failed" state can be rescheduled
    jobsService.addOneOffJob({
        name: 'generate-backup-2022-09-15',
        job: './path/to/jobs/backup.js',
    });
}
```

For more examples of JobManager initialization check [test/examples](https://github.com/TryGhost/Utils/tree/master/packages/job-manager/test/examples) directory.

### Job types and definitions

There are two types of jobs distinguished based on purpose and environment they run in:
- **"inline"** - job which is run in the same even loop as the caller. Should be used in situations when there is no even loop blocking operations and no need to manage memory leaks in sandboxed way. Sometimes
- **"offloaded"** - job which is executed in separate to caller's event loop. Comparing to **inline** jobs, **offloaded** jobs are safer to execute as they are run on a dedicated thread (or process) acting like a sandbox. These jobs also give better utilization of multi-core CPUs. This type of jobs is useful when there are heavy computations needed to be done blocking the event loop or need a sandboxed environment to run in safely. Example jobs would be: statistical information processing, memory intensive computations (e.g. recursive algorithms), processing that requires blocking I/O operations etc.
- **"one-off"** - job that would only ever run once. It is persisted in storage keeping the record of the job state between process restarts. One-off jobs can be of both "inline" and "offloaded" types. They do not support scheduled recurring execution as that's against the nature of being *one-off*. Apart from being persisted one-off jobs can be rescheduled for execution in case they have a "failed" execution state.

Job manager's instance registers jobs through `addJob` and `addOneOffJob` methods. The `offloaded` parameter controls if the job is **inline** (executed in the same event loop) or is **offloaded** (executed in worker thread/separate process). By default `offloaded` is set to `true` - creates an "offloaded" job.

When `offloaded: false` parameter is passed to job registering methods, job manager registers an **inline** function for execution in FIFO queue. This type of job should not be computationally intensive and should have small amount of asynchronous operations. The developer should always account that the function will be executed on the **same event loop, thread and process as caller's process**. **inline** jobs should be [JavaScript functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) or a path to a module that exports a function as default. Note, at the moment it's not possible to defined scheduled or recurring **inline** job.

When skipped or `offloaded: true` parameter is passed into job registering methods, job manager registers execution of an **offloaded** job. The job can be scheduled to run immediately, in the future, or in recurring manner (through `at` parameter). Jobs created this way are managed by [bree](https://github.com/breejs/bree) job scheduling library. For examples of job scripts check out [this section](https://github.com/breejs/bree#nodejs-email-queue-job-scheduling-example) of bree's documentation, test [job examples](https://github.com/TryGhost/Utils/tree/master/packages/job-manager/test/jobs).


### Offloaded jobs rules of thumb
To prevent complications around failed job retries and and handling of specific job states here are some rules that should be followed for all scheduled jobs:
1. Jobs are **self contained** - meaning job manager should be able to run the job with the state information included within the job's parameters. Job script should look up for the rest of needed information from somewhere else, like a database, API, or file.
2. Jobs should be [idempotent](https://en.wikipedia.org/wiki/Idempotence) - consequent job executions should be safe.
3. Job **parameters** should be **kept to the minimum**. When passing large amounts of data around performance can suffer from slow JSON serialization. Also, storage size restrictions that can arise if there is a need to store parameters in the future.Job parameters should be kept to only information that is needed to retrieve the rest of information from somewhere else. For example, it's recommended to pass in only an *id* of the resource that could be fetched from the data storage during job execution or pass in a file path which could be read during execution.
4. Scheduled **job execution time should not overlap**. It's up to the registering service to assure job execution time does not ecceed time between subsequent scheduled jobs. For example, if job is scheduled to run every 5 minutes it should always run under 5 minutes, otherwise next scheduled job would fail to start.

### Offloaded jobs lifecycle

Offloaded jobs are running on dedicated worker threads which makes their lifecycle a bit different to inline jobs:
1. When **starting** a job it's only sharing ENV variables with it's parent process. The job itself is run on an independent JavaScript execution thread. The script has to re-initialize any modules it will use. For example it should take care of: model layer initialization, cache initialization, etc.
2. When **finishing** work in a job prefer to signal successful termination by sending 'done' message to the parent thread: `parentPort.postMessage('done')` ([example use](https://github.com/TryGhost/Utils/blob/0e423f6c5c69b08d81d470f49de95654d8cc90e3/packages/job-manager/test/jobs/graceful.js#L33-L37)). Finishing work this way terminates the thread through [worker.terminate()]((https://nodejs.org/dist/latest-v14.x/docs/api/worker_threads.html#worker_threads_worker_terminate)), which logs termination in parent process and flushes any pipes opened in thread.
3. Jobs that have iterative nature, or need cleanup before interrupting work should allow for **graceful shutdown** by listening on `'cancel'` message coming from parent thread ([example use](https://github.com/TryGhost/Utils/blob/0e423f6c5c69b08d81d470f49de95654d8cc90e3/packages/job-manager/test/jobs/graceful.js#L12-L16)).
4. When **exceptions** happen and expected outcome is to terminate current job, leave the exception unhandled allowing it to bubble up to the job manager. Unhandled exceptions [terminate current thread](https://nodejs.org/dist/latest-v14.x/docs/api/worker_threads.html#worker_threads_event_error) and allow for next scheduled job execution to happen.

For more nuances on job structure best practices check [bree documentation](https://github.com/breejs/bree#writing-jobs-with-promises-and-async-await).
