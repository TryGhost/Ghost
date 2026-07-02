const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Schedule a function for the soonest date it's been called with.
 *
 * @example
 * // Runs the function at `soon`, not `later`:
 *
 * const soonestTimer = new SoonestTimer(fn);
 *
 * const later = new Date(Date.now() + 10_000);
 * soonestTimer.scheduleAt(later);
 *
 * const soon = new Date(Date.now() + 1000);
 * soonestTimer.scheduleAt(soon);
 */
export class SoonestTimer {
    #scheduled: undefined | {
        timeout: ReturnType<typeof setTimeout>;
        at: Date;
    };
    #fn: () => unknown;

    constructor(fn: () => unknown) {
        this.#fn = fn;
    }

    scheduleAt(date: Readonly<Date>): void {
        if (this.#scheduled && this.#scheduled.at <= date) {
            return;
        }

        if (this.#scheduled) {
            clearTimeout(this.#scheduled.timeout);
        }

        this.#scheduleAt(new Date(date));
    }

    #scheduleAt(at: Date): void {
        // [`setTimeout` caps out at ~25 days][0], so we need a chain of timers
        // if the delay is long.
        // [0]: https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#maximum_delay_value
        const msUntilDate = at.getTime() - Date.now();
        if (msUntilDate <= 0) {
            this.#scheduled = undefined;
            this.#fn();
            return;
        }

        const timeout = setTimeout(() => {
            this.#scheduleAt(at);
        }, Math.min(msUntilDate, MAX_TIMEOUT_MS));

        this.#scheduled = {timeout, at};
    }
}
