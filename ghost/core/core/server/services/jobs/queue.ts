import type JobQueueBase from '../../adapters/jobqueue/JobQueueBase';

const adapterManager = require('../adapter-manager');
const sentry = require('../../../shared/sentry');

/**
 * The Ghost-wired JobQueue singleton, selected by `adapters:jobqueue` config.
 * Coexists with the legacy `@tryghost/job-manager` service (`./index`) while
 * callers migrate across.
 */
const jobQueue: JobQueueBase = adapterManager.getAdapter('jobqueue');

// Adapters are constructed from JSON config, so runtime wiring attaches here.
jobQueue.onError((error: Error) => {
    sentry.captureException(error);
});

export default jobQueue;

// Re-exported so consumers never import from the adapters directory.
export type {
    default as JobQueue,
    Job,
    JobClass,
    JobHandler,
    HandleOptions
} from '../../adapters/jobqueue/JobQueueBase';
