import errors from '@tryghost/errors';
import createDebug from '@tryghost/debug';
import type {JobEnvelope, JobsBackendBase, JobsShutdownOptions, RecurringSchedule} from '@tryghost/adapter-base-jobs';

const debug = createDebug('services:jobs:v2');

/**
 * The shape `handle`/`dispatch` accept: any class with a stable `static
 * type` and a static `deserialize` rehydration hook. Extending `Job` (see
 * job.ts) provides both with sensible defaults.
 */
export interface JobClass<T extends object = object> {
    new (...args: never[]): T;
    /**
     * The job's stable public name (e.g. `clean-tokens`). These strings
     * will eventually persist in database rows — treat them as a public
     * contract and never rename one.
     */
    type: string;
    /**
     * Rebuild an instance from a parsed payload on delivery. Typed loosely
     * so the handler's job type is inferred from the constructor alone.
     */
    deserialize(data: unknown): object;
}

export type JobHandler<T extends object = object> = (job: T) => void | Promise<void>;

/**
 * Reports a failed job. Handler errors never surface at the dispatch site
 * and never crash the process — they are handed here (boot wires this to
 * logging + Sentry, mirroring the legacy job service's error handler).
 */
export type ErrorReporter = (error: unknown, context: {jobType: string}) => void;

interface Registration {
    JobClass: JobClass;
    handler: JobHandler;
}

/**
 * Fail loudly when a value would not survive the JSON round-trip to a jobs
 * backend. JSON.stringify silently drops functions and `undefined` and
 * flattens class instances (a Date becomes a string, a model becomes its
 * enumerable props) — every one of those is a latent bug once a durable
 * backend delivers the payload to another process, so they are rejected at
 * dispatch time in every environment.
 */
function assertSerialisable(value: unknown, path: string, seen: Set<object>): void {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
        return;
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new errors.IncorrectUsageError({
                message: `Job payload is not serialisable: ${path} is ${value}, which JSON turns into null`
            });
        }
        return;
    }

    if (value === undefined) {
        throw new errors.IncorrectUsageError({
            message: `Job payload is not serialisable: ${path} is undefined, which JSON silently drops`
        });
    }

    if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
        throw new errors.IncorrectUsageError({
            message: `Job payload is not serialisable: ${path} is a ${typeof value}`
        });
    }

    // From here on the value is an object.
    const obj = value as object;
    if (seen.has(obj)) {
        throw new errors.IncorrectUsageError({
            message: `Job payload is not serialisable: ${path} closes a circular reference`
        });
    }
    seen.add(obj);

    if (Array.isArray(obj)) {
        obj.forEach((entry, index) => assertSerialisable(entry, `${path}[${index}]`, seen));
        return;
    }

    const proto = Object.getPrototypeOf(obj);
    if (proto !== Object.prototype && proto !== null) {
        const name = (obj.constructor && obj.constructor.name) || 'class';
        throw new errors.IncorrectUsageError({
            message: `Job payload is not serialisable: ${path} is a ${name} instance — only plain JSON data can cross the jobs boundary`
        });
    }

    for (const [key, entry] of Object.entries(obj)) {
        assertSerialisable(entry, `${path}.${key}`, seen);
    }
}

/**
 * The class-based jobs service: job data classes are dispatched through a
 * backend chosen by the adapter system (`adapters:jobs` config), and the
 * single handler per job type is registered at boot by register-handlers.js.
 *
 * Serialisation is enforced at the boundary even for the in-memory backend:
 * dispatch hands the backend `{type, payload}` with the payload
 * JSON-serialised, and the handler always receives a rehydrated instance —
 * never the object that was dispatched. A job that cannot survive the
 * round-trip fails today, not when a durable backend lands.
 */
export class JobsService {
    #backend: JobsBackendBase | null = null;
    #errorReporter: ErrorReporter | null = null;
    #registrations = new Map<string, Registration>();

    /**
     * Wire the configured jobs backend and the error reporter. Called once
     * per boot, before handler registration — re-initialising (a re-boot in
     * the test harness) resets the registration set so every boot registers
     * from scratch.
     */
    init({backend, errorReporter}: {backend: JobsBackendBase, errorReporter: ErrorReporter}) {
        this.#backend = backend;
        this.#errorReporter = errorReporter;
        this.#registrations.clear();
        backend.start({processor: envelope => this.#process(envelope)});
    }

    /**
     * Register the one handler for a job type. One boot step
     * (register-handlers.js) makes every registration, so there is a single
     * place to read "what jobs exist". Re-registering a type replaces the
     * previous handler — within one boot that is a mistake, caught by the
     * register-handlers unit test asserting registered types are unique.
     */
    handle<T extends object>(JobClassParam: JobClass<T>, handler: JobHandler<T>) {
        const type = JobClassParam?.type;
        if (typeof type !== 'string' || type.length === 0) {
            throw new errors.IncorrectUsageError({
                message: 'Job classes must declare a non-empty static `type` string'
            });
        }
        if (typeof JobClassParam.deserialize !== 'function') {
            throw new errors.IncorrectUsageError({
                message: `Job class for type "${type}" must provide a static deserialize — extend Job or define your own`
            });
        }
        if (typeof handler !== 'function') {
            throw new errors.IncorrectUsageError({
                message: `The handler for job type "${type}" must be a function`
            });
        }
        if (this.#registrations.has(type)) {
            debug(`replacing the registered handler for job type "${type}"`);
        }

        this.#registrations.set(type, {JobClass: JobClassParam as JobClass, handler: handler as JobHandler});
    }

    /** The registered job type names, for introspection and tests. */
    get registeredTypes(): string[] {
        return [...this.#registrations.keys()];
    }

    /**
     * Enqueue a job instance. Resolves when the backend has **accepted** the
     * job, never when it has run — handler errors are reported (logging +
     * Sentry) and do not surface here.
     */
    async dispatch(job: object) {
        const envelope = this.#serialize(job);
        await this.#requireBackend().enqueue(envelope);
    }

    /**
     * Schedule a job instance for recurring delivery on a cron cadence. How
     * the schedule is stored and what fires the tick is the backend's
     * decision; re-scheduling a type replaces its previous schedule.
     */
    async scheduleRecurring(job: object, {cron}: RecurringSchedule) {
        const envelope = this.#serialize(job);
        await this.#requireBackend().scheduleRecurring(envelope, {cron});
    }

    /**
     * Test-suite barrier: resolves once every accepted job has been
     * delivered, when the backend supports it. Completion signalling is
     * deliberately not part of the backend contract, so this degrades to a
     * no-op on backends without the affordance. Mirrors the legacy job
     * manager's allSettled().
     */
    async allSettled() {
        const backend = this.#backend as (JobsBackendBase & {allSettled?: () => Promise<void>}) | null;
        await backend?.allSettled?.();
    }

    /** Drain in-flight jobs within a bounded time. Wired to server cleanup. */
    async shutdown(options?: JobsShutdownOptions) {
        await this.#backend?.shutdown(options);
    }

    #requireBackend(): JobsBackendBase {
        if (!this.#backend) {
            throw new errors.IncorrectUsageError({
                message: 'The jobs service has not been initialised yet'
            });
        }
        return this.#backend;
    }

    #serialize(job: object): JobEnvelope {
        const JobClassRef = job?.constructor as JobClass | undefined;
        const type = JobClassRef?.type;

        if (typeof type !== 'string' || type.length === 0) {
            throw new errors.IncorrectUsageError({
                message: 'Only job class instances with a static `type` can be dispatched'
            });
        }
        if (!this.#registrations.has(type)) {
            throw new errors.IncorrectUsageError({
                message: `Cannot dispatch job type "${type}" — no handler has been registered for it`
            });
        }

        const data = typeof (job as {serialize?: unknown}).serialize === 'function'
            ? (job as {serialize: () => Record<string, unknown>}).serialize()
            : {...job};

        // The instance itself is naturally a class instance — only the data
        // it carries has to be plain JSON.
        const seen = new Set<object>([job, data]);
        for (const [key, entry] of Object.entries(data)) {
            assertSerialisable(entry, `payload.${key}`, seen);
        }

        return {type, payload: JSON.stringify(data)};
    }

    /**
     * The processor handed to the backend: rehydrate and run the handler.
     * Never rejects — a handler error is reported and swallowed, exactly
     * like the legacy job manager's error handler. A failing job must never
     * crash Ghost, the backend's delivery loop, or the dispatch site.
     */
    async #process(envelope: JobEnvelope) {
        try {
            const registration = this.#registrations.get(envelope.type);
            if (!registration) {
                throw new errors.IncorrectUsageError({
                    message: `No handler registered for job type "${envelope.type}"`
                });
            }

            const job = registration.JobClass.deserialize(JSON.parse(envelope.payload));

            await registration.handler(job);
        } catch (err) {
            this.#errorReporter?.(err, {jobType: envelope.type});
        }
    }
}
