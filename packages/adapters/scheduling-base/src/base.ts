import logging from '@tryghost/logging';


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
 * Options passed to `rescheduleAll` by the adapter when it calls the method on
 * each registered rescheduler. The previous key is provided so that the
 * rescheduler can unschedule any jobs that were queued under the old key.
 */
export interface RescheduleOpts {
    previousKey?: { id: string; secret: string};
}

/**
 * Implemented by scheduler-using subsystems (post-scheduling, automations,
 * gift reminders). The adapter calls `rescheduleAll` on every registered
 * rescheduler when something requires the queue to be rebuilt — currently
 * after an internal API key rotation.
 */
export interface Rescheduler {
    rescheduleAll(opts?: RescheduleOpts): Promise<void>;
}

/**
 * The contract Ghost expects of any concrete scheduling adapter. Adapters
 * that extend `SchedulingBase` inherit `register` and `rescheduleAll` for
 * free; the three runtime methods (`schedule`, `unschedule`, `run`) are
 * the ones each adapter implementation must provide.
 */
export interface SchedulerAdapter {
    run(): void | Promise<void>;
    schedule(job: SchedulerJob): void | Promise<void>;
    unschedule(job: SchedulerJob, opts?: {bootstrap?: boolean}): void | Promise<void>;
    register(rescheduler: Rescheduler): void;
}

export abstract class SchedulingBase implements SchedulerAdapter {
    declare readonly requiredFns: readonly ['run', 'schedule', 'unschedule'];

    #reschedulers = new Set<Rescheduler>();

    constructor() {
        Object.defineProperty(this, 'requiredFns', {
            value: Object.freeze(['run', 'schedule', 'unschedule']),
            writable: false,
        })
    }

    register(rescheduler: Rescheduler) {
        this.#reschedulers.add(rescheduler);
    }

    /**
     * Ask every registered rescheduler to rebuild its queue under the current
     * key. Best-effort: a failure in one doesn't block the others.
     */
    async rescheduleAll(opts?: RescheduleOpts) {
        const reschedulers = Array.from(this.#reschedulers);
        const results = await Promise.allSettled(
            reschedulers.map(r => r.rescheduleAll(opts))
        );

        results.forEach((result, i) => {
            if (result.status === 'rejected') {
                logging.error({
                    event: {name: 'scheduler.reschedule_all.failed'},
                    err: result.reason,
                    rescheduler: reschedulers[i]!.constructor?.name || 'unknown'
                }, 'Rescheduler failed');
            }
        });

        return results;
    }

    abstract run(): void | Promise<void>;
    abstract schedule(job: SchedulerJob): void | Promise<void>
    abstract unschedule(job: SchedulerJob, opts?: {bootstrap?: boolean}): void | Promise<void>
}
