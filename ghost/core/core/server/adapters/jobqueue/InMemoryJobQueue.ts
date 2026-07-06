import errors from '@tryghost/errors';
import JobQueueBase, {Job, JobClass, JobQueueOptions} from './JobQueueBase';
import {validateCron} from './validate-cron';

const fastq = require('fastq');
const later = require('@breejs/later');

// Match the old bree/later-backed job manager: local-timezone cron.
later.date.localTime();

export interface InMemoryJobQueueOptions extends JobQueueOptions {
    concurrency?: number;
}

interface QueueUnit {
    job: Job;
}

/**
 * In-memory job queue built on fastq (queue + concurrency) and @breejs/later
 * (recurring schedules). fastq starts a handler eagerly — synchronously up to
 * its first await; later accepts invalid cron silently. Delivery is
 * best-effort at-most-once, so handlers must be idempotent; durable backends
 * share this surface.
 */
export default class InMemoryJobQueue extends JobQueueBase {
    #queue: any;
    #timers = new Set<{clear(): void}>();
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

    scheduleRecurring(job: Job, {cron}: {cron: string}): void {
        // Fail at boot on a bad expression — later itself accepts anything.
        validateCron(cron);
        const schedule = later.parse.cron(cron, true);
        // Report, never float: a rejection inside a timer has no caller to
        // catch it and would become an unhandled rejection.
        const timer = later.setInterval(() => {
            this.dispatch(job).catch(err => this.reportError(err));
        }, schedule);
        this.#timers.add(timer);
    }

    async shutdown(): Promise<void> {
        this.#clearTimers();
        await super.shutdown();
    }

    reset(): void {
        // Disarm the previous boot's schedules along with its registrations,
        // or a re-boot would double-fire every recurring job.
        this.#clearTimers();
        super.reset();
    }

    #clearTimers(): void {
        for (const timer of this.#timers) {
            timer.clear();
        }
        this.#timers.clear();
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
