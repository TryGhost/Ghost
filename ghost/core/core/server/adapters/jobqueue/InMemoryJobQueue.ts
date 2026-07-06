import errors from '@tryghost/errors';
import JobQueueBase, {Job, JobClass, JobQueueOptions} from './JobQueueBase';

const fastq = require('fastq');

export interface InMemoryJobQueueOptions extends JobQueueOptions {
    concurrency?: number;
}

interface QueueUnit {
    job: Job;
}

/**
 * In-memory job queue built on fastq, which owns the queue and its
 * concurrency limit. fastq starts a handler eagerly — synchronously up to its
 * first await. Delivery is best-effort at-most-once, so handlers must be
 * idempotent; durable backends share this surface.
 */
export default class InMemoryJobQueue extends JobQueueBase {
    #queue: any;
    #idleResolvers: Array<() => void> = [];

    constructor({concurrency = 3, ...options}: InMemoryJobQueueOptions = {}) {
        super(options);
        // The worker never rejects (handler errors are caught in #runUnit).
        this.#queue = fastq(this, (unit: QueueUnit, done: (err: Error | null) => void) => {
            this.#runUnit(unit).then(() => done(null), done);
        }, concurrency);
        this.#queue.drain = () => this.#signalIdleIfDone();
    }

    async dispatch(job: Job): Promise<void> {
        const type = (job.constructor as Partial<JobClass>).type;
        // Fail loudly at the dispatch site: a job with no owner would
        // otherwise evaporate after the caller was told it was accepted.
        if (!type || !this.getHandler(type)) {
            throw new errors.IncorrectUsageError({
                message: `No handler registered for job "${type ?? job.constructor.name}".`
            });
        }
        this.#queue.push({job});
    }

    async #runUnit({job}: QueueUnit): Promise<void> {
        const type = (job.constructor as Partial<JobClass>).type as string;
        const handler = this.getHandler(type);

        if (!handler) {
            // The registry was reset between dispatch and run (re-boot)
            this.reportError(new errors.IncorrectUsageError({
                message: `No handler registered for job "${type}".`
            }));
            return;
        }

        try {
            await handler(job);
        } catch (err) {
            this.reportError(new errors.UnhandledJobError({context: type, err: err as Error}));
        }
    }

    async allSettled(): Promise<void> {
        if (this.#queue.idle()) {
            return;
        }
        return new Promise((resolve) => {
            this.#idleResolvers.push(resolve);
        });
    }

    #signalIdleIfDone(): void {
        if (!this.#queue.idle()) {
            return;
        }
        const resolvers = this.#idleResolvers;
        this.#idleResolvers = [];
        for (const resolve of resolvers) {
            resolve();
        }
    }
}
