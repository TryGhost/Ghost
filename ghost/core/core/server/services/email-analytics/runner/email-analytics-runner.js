const defaultLogging = require('@tryghost/logging');

const DEFAULT_MAX_EVENTS = 10000;

class EmailAnalyticsRunner {
    #restoredSchedule = false;
    #fetching = false;

    constructor({adapter, logging = defaultLogging, maxEvents = DEFAULT_MAX_EVENTS}) {
        this.adapter = adapter;
        this.logging = logging;
        this.maxEvents = maxEvents;
    }

    async start() {
        if (!this.#restoredSchedule) {
            this.#restoredSchedule = true;
            if (this.adapter.restoreScheduled) {
                await this.adapter.restoreScheduled();
            }
        }

        if (this.#fetching) {
            this.logging.info('Email analytics fetch already running, skipping');
            return;
        }
        this.#fetching = true;

        try {
            const openedEventCount = await this.adapter.fetchLatestOpenedEvents({maxEvents: this.maxEvents});
            if (openedEventCount >= this.maxEvents) {
                this._restartFetch('high opened event count');
                return;
            }

            const nonOpenedEventCount = await this.adapter.fetchLatestNonOpenedEvents({
                maxEvents: this.maxEvents - openedEventCount
            });
            const missingEventCount = await this.adapter.fetchMissing({
                maxEvents: this.maxEvents - openedEventCount - nonOpenedEventCount
            });

            if ((openedEventCount + nonOpenedEventCount + missingEventCount) > this.maxEvents) {
                this._restartFetch('high event count');
                return;
            }

            const scheduledEventCount = this.adapter.fetchScheduled ? await this.adapter.fetchScheduled({
                maxEvents: this.maxEvents
            }) : 0;

            if (scheduledEventCount > 0) {
                this._restartFetch('scheduled backfill');
                return;
            }

            if (openedEventCount + nonOpenedEventCount + missingEventCount + scheduledEventCount === 0) {
                this.logging.info('[EmailAnalytics] Job complete - No events');
            }

            this.#fetching = false;
        } catch (e) {
            this.logging.error(e, 'Error while fetching email analytics');
            this.logging.error(e);
        }
        this.#fetching = false;
    }

    _restartFetch(reason) {
        this.#fetching = false;

        if (this.adapter.restartFetch) {
            this.adapter.restartFetch(reason);
            return;
        }

        this.logging.info(`[EmailAnalytics] Restarting fetch due to ${reason}`);
        this.start();
    }
}

module.exports = EmailAnalyticsRunner;
