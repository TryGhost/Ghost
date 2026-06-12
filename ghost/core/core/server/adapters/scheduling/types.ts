/**
 * Shape of a job the scheduler adapter queues. Time is a unix timestamp;
 * url carries a JWT-signed admin token; extra forwards through to the
 * HTTP callback the adapter fires.
 */
export interface SchedulerJob {
    time: number;
    url: string;
    extra: {
        httpMethod: string;
        oldTime?: number | null;
    };
}

/**
 * Implemented by scheduler-using subsystems (post-scheduling, automations,
 * gift reminders). The adapter calls `rescheduleAll` on every registered
 * rescheduler when something requires the queue to be rebuilt — currently
 * after an internal API key rotation.
 */
export interface Rescheduler {
    rescheduleAll(opts?: {previousKey?: {id: string; secret: string}}): Promise<void>;
}

/**
 * The contract Ghost expects of any concrete scheduling adapter. Adapters
 * that extend `SchedulingBase` inherit `register` and `rescheduleAll` for
 * free; the three runtime methods (`schedule`, `unschedule`, `run`) are
 * the ones each adapter implementation must provide.
 */
export interface SchedulerAdapter {
    run(): void;
    schedule(job: SchedulerJob): void;
    unschedule(job: SchedulerJob, opts?: {bootstrap?: boolean}): void;
    register(rescheduler: Rescheduler): void;
}
