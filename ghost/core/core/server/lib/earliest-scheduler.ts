const MAX_TIMEOUT_MS = 2 ** 31 - 1;

export class EarliestScheduler {
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
