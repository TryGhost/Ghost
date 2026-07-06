import defaultLogging from '@tryghost/logging';
import errors from '@tryghost/errors';

/** A job is a plain data class: a serialisable payload plus a stable `static type`. */
export interface Job {
    data?: unknown;
}

export interface JobClass<T extends Job = Job> {
    new (...args: any[]): T;
    type: string;
}

export type JobHandler<T extends Job = Job> = (job: T) => void | Promise<void>;

export interface HandleOptions {
    /** Max jobs of this type running at once — the isolation lever that lets unbounded work share one queue. */
    concurrency?: number;
}

export interface Logger {
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}

export interface JobQueueOptions {
    logging?: Logger;
    errorHandler?: (error: Error) => void;
}

/**
 * Shared surface for `jobqueue` adapter backends: the per-type handler
 * registry and error reporting. Subclasses implement how a job is stored and
 * drained.
 */
export default abstract class JobQueueBase {
    /** Contract checked by the adapter manager when an implementation loads. */
    readonly requiredFns = ['handle', 'dispatch', 'scheduleRecurring', 'allSettled', 'shutdown'];

    #handlers = new Map<string, {handler: JobHandler; concurrency?: number}>();
    #logging: Logger;
    #errorHandler: (error: Error) => void;

    constructor({logging = defaultLogging, errorHandler}: JobQueueOptions = {}) {
        this.#logging = logging;
        this.#errorHandler = errorHandler ?? (error => this.#logging.error(error));
    }

    /** Register the one handler that owns a job class. */
    handle<T extends Job>(jobClass: JobClass<T>, handler: JobHandler<T>, options: HandleOptions = {}): void {
        const type = jobClass.type;

        if (typeof type !== 'string' || type.length === 0) {
            throw new errors.IncorrectUsageError({
                message: `Job class "${jobClass.name}" must define a non-empty \`static type\`.`
            });
        }

        if (this.#handlers.has(type)) {
            throw new errors.IncorrectUsageError({
                message: `A handler for job "${type}" is already registered.`
            });
        }

        this.#handlers.set(type, {handler: handler as JobHandler, concurrency: options.concurrency});
    }

    /**
     * Drop every registration. Boot calls this first: each boot owns the
     * registry, so an in-process re-boot rebinds handlers to its fresh
     * service instances while duplicates within one boot still throw.
     */
    reset(): void {
        this.#handlers.clear();
    }

    /** Resolves once the work is accepted, not once it has run. */
    abstract dispatch(job: Job): Promise<void>;

    /** Resolves once the queue is drained and no jobs are running. */
    abstract allSettled(): Promise<void>;

    /** How a schedule is stored and who fires the tick is a backend decision. */
    abstract scheduleRecurring(job: Job, options: {cron: string}): void;

    /** Hook for backends with a background worker; no-op otherwise. */
    start(): void {}

    /**
     * Backends override to stop their own schedules and workers first. The
     * drain is bounded: a stuck handler must not hold shutdown until the
     * process watchdog hard-kills Ghost.
     */
    async shutdown(): Promise<void> {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timedOut = await Promise.race([
            this.allSettled().then(() => false),
            new Promise<boolean>((resolve) => {
                timer = setTimeout(() => resolve(true), JobQueueBase.SHUTDOWN_TIMEOUT_MS);
            })
        ]);
        clearTimeout(timer);
        if (timedOut) {
            this.#logging.warn(`JobQueue shutdown timed out after ${JobQueueBase.SHUTDOWN_TIMEOUT_MS}ms with jobs still in flight`);
        }
    }

    static readonly SHUTDOWN_TIMEOUT_MS = 30 * 1000;

    protected getHandler(type: string): JobHandler | undefined {
        return this.#handlers.get(type)?.handler;
    }

    /** Undefined when the type is uncapped and only the backend's global limit applies. */
    protected getTypeConcurrency(type: string): number | undefined {
        return this.#handlers.get(type)?.concurrency;
    }

    protected reportError(error: Error): void {
        this.#errorHandler(error);
    }

}
