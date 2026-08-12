/**
 * Base class for job data classes: a job is pure, JSON-serialisable data
 * with a stable `static type` string. Services, models and functions never
 * ride along — they live in the handler, which is registered centrally in
 * register-handlers.js and closes over what it needs.
 *
 * Subclasses declare their payload as instance fields and their name as
 * `static type`. The default serialize/deserialize round-trip the instance's
 * own enumerable fields; a subclass with constructor logic can override
 * either side.
 */
export class Job {
    /**
     * The job's stable public name (e.g. `clean-tokens`). These strings will
     * eventually persist in database rows — treat them as a public contract
     * and never rename one.
     */
    declare static type: string;

    constructor(data: Record<string, unknown> = {}) {
        Object.assign(this, data);
    }

    /** The JSON-safe data this job carries across the backend boundary. */
    serialize(): Record<string, unknown> {
        return {...this} as Record<string, unknown>;
    }

    /** Rebuild an instance from a parsed payload on delivery. */
    static deserialize(data: unknown): Job {
        return new this(data as Record<string, unknown>);
    }
}
