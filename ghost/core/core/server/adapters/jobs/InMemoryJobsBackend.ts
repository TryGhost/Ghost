import logging from '@tryghost/logging';
import errors from '@tryghost/errors';
import later from '@breejs/later';
import {
    JobsBackendBase,
    type JobEnvelope,
    type JobProcessor,
    type JobsShutdownOptions,
    type JobsStartOptions,
    type RecurringSchedule
} from '@tryghost/adapter-base-jobs';

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30 * 1000;

/**
 * Parse a cron expression with @breejs/later — the same cron dialect the
 * legacy job manager's Bree schedules use — accepting the standard 5-field
 * form or 6 fields with leading seconds.
 *
 * later's parser doesn't throw on garbage: it emits `null` constraints
 * instead, and silently clamps out-of-range values the way it always has.
 * The field count and a scan for null constraints catch malformed
 * expressions at scheduling time rather than at the first (never-firing)
 * tick.
 */
function parseCron(cron: string): object {
    const fieldCount = cron.trim().split(/\s+/).length;
    if (fieldCount !== 5 && fieldCount !== 6) {
        throw new errors.IncorrectUsageError({
            message: `Invalid cron expression "${cron}": expected 5 fields, or 6 with leading seconds`
        });
    }

    const sched = later.parse.cron(cron, fieldCount === 6);
    if (JSON.stringify(sched).includes('null')) {
        throw new errors.IncorrectUsageError({
            message: `Invalid cron expression "${cron}"`
        });
    }

    return sched;
}

/**
 * Reference implementation of the jobs adapter contract
 * (@tryghost/adapter-base-jobs). Everything lives in process memory:
 * accepted envelopes go onto a FIFO queue delivered serially on the main
 * event loop — no worker threads, so handlers keep full access to Ghost's
 * services — and recurring schedules are setTimeout chains whose next
 * occurrence is computed with @breejs/later. Delivery is therefore
 * at-most-once: anything queued or in flight when the process dies is lost,
 * exactly like the legacy inline job queue.
 */
export default class InMemoryJobsBackend extends JobsBackendBase {
    #processor: JobProcessor | null = null;
    #queue: JobEnvelope[] = [];
    #delivering = false;
    #stopped = false;
    #timers = new Map<string, ReturnType<typeof setTimeout>>();
    #idleWaiters: (() => void)[] = [];

    start({processor}: JobsStartOptions) {
        this.#processor = processor;
        // A fresh start after shutdown revives the backend: Ghost boots more
        // than once per process in the test harness, and every boot re-wires
        // the processor and re-schedules its recurring jobs from scratch.
        this.#stopped = false;
    }

    enqueue(envelope: JobEnvelope) {
        this.#assertAccepting(envelope);

        this.#queue.push(envelope);
        this.#pump();
        // Returns on acceptance — delivery happens later on the event loop.
    }

    scheduleRecurring(envelope: JobEnvelope, {cron}: RecurringSchedule) {
        this.#assertAccepting(envelope);

        // Parse eagerly so an invalid expression fails at scheduling time.
        const sched = parseCron(cron);

        // Re-scheduling a type replaces its previous schedule, so a re-boot
        // is idempotent rather than stacking a second daily tick.
        const existingTimer = this.#timers.get(envelope.type);
        if (existingTimer) {
            clearTimeout(existingTimer);
            this.#timers.delete(envelope.type);
        }

        this.#scheduleNextTick(envelope, sched);
    }

    async shutdown({timeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS}: JobsShutdownOptions = {}) {
        this.#stopped = true;

        for (const timer of this.#timers.values()) {
            clearTimeout(timer);
        }
        this.#timers.clear();

        if (!this.#delivering && this.#queue.length === 0) {
            return;
        }

        let timer: ReturnType<typeof setTimeout> | undefined;
        const timedOut = await Promise.race([
            this.allSettled().then(() => false),
            new Promise<boolean>((resolve) => {
                timer = setTimeout(() => resolve(true), timeoutMs);
                timer.unref?.();
            })
        ]);
        clearTimeout(timer);

        if (timedOut) {
            logging.warn(`In-memory jobs backend shut down before draining: abandoning ${this.#queue.length} queued job(s) and any in-flight delivery`);
        }
    }

    /**
     * Resolves once every accepted job has been delivered and the queue is
     * idle. Not part of the adapter contract — completion signalling
     * deliberately doesn't cross that boundary — Ghost's test suites use it
     * as a synchronisation barrier, like the legacy manager's allSettled().
     */
    async allSettled() {
        if (!this.#delivering && this.#queue.length === 0) {
            return;
        }

        await new Promise<void>((resolve) => {
            this.#idleWaiters.push(resolve);
        });
    }

    #assertAccepting(envelope: JobEnvelope) {
        if (!this.#processor) {
            throw new errors.IncorrectUsageError({
                message: `Cannot accept job "${envelope.type}" before the jobs backend is started`
            });
        }

        if (this.#stopped) {
            throw new errors.IncorrectUsageError({
                message: `Cannot accept job "${envelope.type}" after the jobs backend has been shut down`
            });
        }
    }

    #scheduleNextTick(envelope: JobEnvelope, sched: object) {
        if (this.#stopped) {
            return;
        }

        // The next tick is computed from the current time when the previous
        // one fires, keeping the chain aligned to the cron cadence. The
        // start time is nudged one second forward because later treats an
        // exactly-matching "now" as the next occurrence, which would fire a
        // zero-delay tick in the same second, twice. A tick enqueues its
        // envelope like any other job, so recurring deliveries are
        // serialised with the rest of the queue and never overlap.
        const next = later.schedule(sched).next(1, new Date(Date.now() + 1000));
        if (!(next instanceof Date)) {
            // Can't happen for the validated cron forms we accept, but a
            // schedule with no future occurrence must not loop forever.
            logging.warn(`In-memory jobs backend found no next occurrence for recurring job "${envelope.type}" — stopping its schedule`);
            return;
        }
        const delay = Math.max(0, next.getTime() - Date.now());

        const timer = setTimeout(() => {
            if (this.#stopped) {
                return;
            }
            this.#queue.push(envelope);
            this.#pump();
            this.#scheduleNextTick(envelope, sched);
        }, delay);
        // A pending tick must never keep the process alive on its own.
        timer.unref?.();
        this.#timers.set(envelope.type, timer);
    }

    #pump() {
        if (this.#delivering || !this.#processor) {
            return;
        }
        this.#delivering = true;

        // Deferred to a microtask so the accepting call returns before
        // delivery begins. Deliberately not a timer (setImmediate/setTimeout):
        // microtasks keep draining under sinon's fake clocks, which several
        // suites install around recurring-schedule tests.
        void Promise.resolve().then(() => this.#drainQueue());
    }

    async #drainQueue() {
        const processor = this.#processor as JobProcessor;

        while (this.#queue.length > 0) {
            const envelope = this.#queue.shift() as JobEnvelope;
            try {
                await processor(envelope);
            } catch (err) {
                // The jobs service guarantees the processor never rejects;
                // this guard only keeps broken wiring from killing the queue.
                logging.error(err);
            }
        }

        this.#delivering = false;
        const waiters = this.#idleWaiters;
        this.#idleWaiters = [];
        for (const resolve of waiters) {
            resolve();
        }
    }
}
