import errors from '@tryghost/errors';
import JobQueueBase, {Job, JobClass, JobQueueOptions} from './JobQueueBase';
import {validateCron} from './validate-cron';

const fastq = require('fastq');
const later = require('@breejs/later');

// Match the old bree/later-backed job manager: local-timezone cron.
later.date.localTime();

export interface InMemoryJobQueueOptions extends JobQueueOptions {
    /** Max jobs running at once on the default queue. */
    concurrency?: number;
}

interface QueueUnit {
    job: Job;
}

/**
 * In-memory job queue built on fastq (queues + concurrency) and @breejs/later
 * (recurring schedules). fastq starts a handler eagerly — synchronously up to
 * its first await. A capped type gets its own fastq pool at that concurrency,
 * alongside the default queue — so total concurrency is the default limit
 * plus the sum of the caps. Delivery is best-effort at-most-once, so handlers
 * must be idempotent; durable backends share this surface.
 */
export default class InMemoryJobQueue extends JobQueueBase {
    #defaultQueue: any;
    #typeQueues = new Map<string, any>();
    #timers = new Set<{clear(): void}>();
    #idleResolvers: Array<() => void> = [];

    constructor({concurrency = 3, ...options}: InMemoryJobQueueOptions = {}) {
        super(options);
        this.#defaultQueue = this.#makeQueue(concurrency);
    }

    #makeQueue(concurrency: number): any {
        // The worker never rejects (handler errors are caught in #runUnit).
        const queue = fastq(this, (unit: QueueUnit, done: (err: Error | null) => void) => {
            this.#runUnit(unit).then(() => done(null), done);
        }, concurrency);
        queue.drain = () => this.#signalIdleIfDone();
        return queue;
    }

    #queueFor(job: Job): any {
        const type = this.#typeOf(job);
        if (!type) {
            return this.#defaultQueue;
        }
        const cap = this.getTypeConcurrency(type);
        if (cap === undefined) {
            return this.#defaultQueue;
        }
        let queue = this.#typeQueues.get(type);
        if (!queue) {
            queue = this.#makeQueue(cap);
            this.#typeQueues.set(type, queue);
        }
        return queue;
    }

    #typeOf(job: Job): string | undefined {
        return (job.constructor as Partial<JobClass>).type;
    }

    async dispatch(job: Job): Promise<void> {
        const type = this.#typeOf(job);
        // Fail loudly at the dispatch site: a job with no owner would
        // otherwise evaporate after the caller was told it was accepted.
        if (!type || !this.getHandler(type)) {
            throw new errors.IncorrectUsageError({
                message: `No handler registered for job "${type ?? job.constructor.name}".`
            });
        }
        this.#queueFor(job).push({job});
    }

    async #runUnit({job}: QueueUnit): Promise<void> {
        const type = this.#typeOf(job) as string;
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
        // or a re-boot would double-fire every recurring job. Per-type pools
        // are dropped too — their caps belong to the old registrations. Jobs
        // still in flight in a dropped pool finish detached: allSettled() no
        // longer sees them (test boots drain before re-booting).
        this.#clearTimers();
        this.#typeQueues.clear();
        super.reset();
    }

    #clearTimers(): void {
        for (const timer of this.#timers) {
            timer.clear();
        }
        this.#timers.clear();
    }

    #allIdle(): boolean {
        if (!this.#defaultQueue.idle()) {
            return false;
        }
        for (const queue of this.#typeQueues.values()) {
            if (!queue.idle()) {
                return false;
            }
        }
        return true;
    }

    async allSettled(): Promise<void> {
        if (this.#allIdle()) {
            return;
        }
        return new Promise((resolve) => {
            this.#idleResolvers.push(resolve);
        });
    }

    #signalIdleIfDone(): void {
        if (!this.#allIdle()) {
            return;
        }
        const resolvers = this.#idleResolvers;
        this.#idleResolvers = [];
        for (const resolve of resolvers) {
            resolve();
        }
    }
}
