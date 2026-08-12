/**
 * The serialised form of a job as it crosses the adapter boundary. This is
 * the ONLY shape a backend ever sees: job data classes and their handlers
 * live in Ghost's jobs service, which serialises before enqueueing and
 * rehydrates on delivery. A backend stores and transports envelopes verbatim.
 */
export interface JobEnvelope {
    /**
     * The job's stable public type name (e.g. `clean-tokens`). These names
     * will eventually persist in database rows — treat them as a public
     * contract, never rename one.
     */
    type: string;
    /** The job's data, JSON-serialised by the jobs service. */
    payload: string;
}

/**
 * Delivery callback wired by the jobs service via `start`. The service owns
 * handler lookup, payload rehydration and error reporting; the processor
 * never rejects — a handler failure is reported (logging/Sentry) inside the
 * service, not surfaced to the backend. Backends MUST await the processor so
 * in-flight work is visible to `shutdown`'s drain.
 */
export type JobProcessor = (envelope: JobEnvelope) => Promise<void>;

export interface JobsStartOptions {
    processor: JobProcessor;
}

export interface RecurringSchedule {
    /**
     * A cron expression: standard 5-field, or 6-field with leading seconds.
     * How the schedule is stored and what fires the tick is the backend's
     * decision — the shared interface only promises the handler runs on
     * the given cadence while the process (or, for a durable backend, the
     * cluster) is up. Re-scheduling an already-scheduled type replaces the
     * previous schedule, so a re-boot is idempotent.
     */
    cron: string;
}

export interface JobsShutdownOptions {
    /**
     * Maximum time in milliseconds to wait for in-flight deliveries before
     * abandoning them. A stuck handler must never hang process shutdown.
     */
    timeoutMs?: number;
}

/**
 * The contract Ghost expects of any background jobs backend.
 *
 * Semantics every implementation must respect:
 *
 * - `enqueue` resolves when the job is **accepted**, not when it has run —
 *   a durable backend cannot promise completion to the caller, and no
 *   completion signal crosses this interface.
 * - Delivery is at-most-once for the in-memory backend but at-least-once
 *   for durable ones; handlers are written to tolerate redelivery.
 * - No delivery may happen before `start` has wired the processor. The
 *   processor never rejects, but a defensive backend must survive a
 *   rejected processor call without crashing its delivery loop.
 * - `scheduleRecurring` for an already-scheduled type replaces the previous
 *   schedule (idempotent re-boot).
 * - `shutdown` stops the recurring tick, stops accepting work, drains
 *   in-flight deliveries within `timeoutMs`, and resolves even if a handler
 *   is stuck.
 */
export abstract class JobsBackendBase {
    declare readonly requiredFns: readonly ['start', 'enqueue', 'scheduleRecurring', 'shutdown'];

    constructor() {
        Object.defineProperty(this, 'requiredFns', {
            value: Object.freeze(['start', 'enqueue', 'scheduleRecurring', 'shutdown']),
            writable: false,
        });
    }

    /** Wire the processor. Called once per boot by the jobs service. */
    abstract start(options: JobsStartOptions): void | Promise<void>;
    /** Accept a one-off job for delivery. Resolves on acceptance. */
    abstract enqueue(envelope: JobEnvelope): void | Promise<void>;
    /** Accept a recurring job, delivered on the given cron cadence. */
    abstract scheduleRecurring(envelope: JobEnvelope, schedule: RecurringSchedule): void | Promise<void>;
    /** Stop delivering and drain in-flight work within a bounded time. */
    abstract shutdown(options?: JobsShutdownOptions): Promise<void>;
}
