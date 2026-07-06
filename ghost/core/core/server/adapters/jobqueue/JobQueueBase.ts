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

    #handlers = new Map<string, JobHandler>();
    #logging: Logger;
    #errorHandler: (error: Error) => void;

    constructor({logging = defaultLogging, errorHandler}: JobQueueOptions = {}) {
        this.#logging = logging;
        this.#errorHandler = errorHandler ?? (error => this.#logging.error(error));
    }

    /** Register the one handler that owns a job class. */
    handle<T extends Job>(jobClass: JobClass<T>, handler: JobHandler<T>): void {
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

        this.#handlers.set(type, handler as JobHandler);
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

    protected getHandler(type: string): JobHandler | undefined {
        return this.#handlers.get(type);
    }

    protected reportError(error: Error): void {
        this.#errorHandler(error);
    }

}
