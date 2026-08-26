import errors from '@tryghost/errors';
import cronValidate from 'cron-validate';
import type {
    JobsBackendBase,
    JobEnvelope,
    JobsShutdownOptions,
    RecurringSchedule
} from '@tryghost/adapter-base-jobs';
import {Job, JobConstructor, JobHandler} from './job';

export interface JobsLogger {
    error(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
}

export interface JobsErrorReporter {
    captureException(err: unknown, captureContext?: {tags?: Record<string, string>}): void;
}

export interface JobsServiceOptions {
    backend: JobsBackendBase;
    logging: JobsLogger;
    sentry?: JobsErrorReporter;
}

type Deliverer = (payload: string) => Promise<void> | void;

export class JobsService {
    readonly #backend: JobsBackendBase;
    readonly #logging: JobsLogger;
    readonly #sentry?: JobsErrorReporter;
    readonly #registry = new Map<string, Deliverer>();

    constructor({backend, logging, sentry}: JobsServiceOptions) {
        this.#backend = backend;
        this.#logging = logging;
        this.#sentry = sentry;
    }

    handle<T extends Job, D>(JobClass: JobConstructor<T, D>, handler: JobHandler<T>): void {
        const type = JobClass.type;
        if (typeof type !== 'string' || type.length === 0) {
            throw new errors.IncorrectUsageError({
                message: `Cannot register a job handler: ${JobClass.name ?? 'job class'} is missing a static "type" string.`
            });
        }
        if (this.#registry.has(type)) {
            throw new errors.IncorrectUsageError({
                message: `A handler for job type "${type}" is already registered.`
            });
        }
        this.#registry.set(type, payload => handler(new JobClass(JSON.parse(payload))));
    }

    async dispatch(job: Job): Promise<void> {
        await this.#backend.enqueue(this.#buildEnvelope(job));
    }

    async scheduleRecurring(job: Job, schedule: RecurringSchedule): Promise<void> {
        this.#assertValidCron(schedule.cron);
        await this.#backend.scheduleRecurring(this.#buildEnvelope(job), schedule);
    }

    // later.parse.cron does not strictly validate: it silently coerces a
    // malformed expression into a bogus schedule (garbage -> every minute,
    // out-of-range -> clamped, an impossible date -> effectively never), so
    // validate up front and fail loudly instead.
    #assertValidCron(cron: string): void {
        const result = cronValidate(cron, {
            preset: 'default', // the seconds field is not supported in the default preset
            override: {useSeconds: true}
        });
        if (!result.isValid()) {
            throw new errors.IncorrectUsageError({
                message: `Invalid cron expression: ${JSON.stringify(cron)}.`
            });
        }
    }

    async start(): Promise<void> {
        await this.#backend.start({
            processor: envelope => this.#process(envelope)
        });
    }

    async shutdown(options?: JobsShutdownOptions): Promise<void> {
        await this.#backend.shutdown(options);
    }

    #buildEnvelope(job: Job): JobEnvelope {
        return {type: this.#typeOf(job), payload: JSON.stringify(job)};
    }

    #typeOf(job: Job): string {
        const ctor: {type?: unknown; name?: string} = job.constructor;
        const type = ctor.type;
        if (typeof type !== 'string' || type.length === 0) {
            throw new errors.IncorrectUsageError({
                message: `Cannot dispatch job: ${ctor.name ?? 'job'} is missing a static "type" string.`
            });
        }
        return type;
    }

    async #process(envelope: JobEnvelope): Promise<void> {
        const deliver = this.#registry.get(envelope.type);
        if (!deliver) {
            this.#logging.error(`No handler registered for job type "${envelope.type}"; dropping delivery.`);
            return;
        }

        try {
            await deliver(envelope.payload);
        } catch (err) {
            this.#sentry?.captureException(err, {tags: {job_type: envelope.type}});
            throw err;
        }
    }
}
