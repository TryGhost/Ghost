const EventEmitter = require('events').EventEmitter;
const logging = require('@tryghost/logging');

/**
 * Instance-based port of the domain-events static class, so each container scope can
 * own a bus. API-compatible with the package's static class.
 */
class DomainEventsBus {
    constructor() {
        this.ee = new EventEmitter();

        this._awaitQueue = [];
        this._dispatchCount = 0;
        this._processedCount = 0;
        this._trackingEnabled = Boolean(process.env.NODE_ENV?.startsWith('test'));
    }

    /**
     * @param {{name: string}} Event - the event class
     * @param {(event: object) => Promise<void> | void} handler
     */
    subscribe(Event, handler) {
        this.ee.on(Event.name, async (event) => {
            try {
                await handler(event);
            } catch (e) {
                logging.error('Unhandled error in event handler for event: ' + Event.name);
                logging.error(e);
            }
            if (this._trackingEnabled) {
                this._onProcessed();
            }
        });
    }

    /**
     * @param {{constructor: {name: string}}} event
     */
    dispatch(event) {
        this.dispatchRaw(event.constructor.name, event);
    }

    /**
     * Dispatch an event in case you don't have an instance of the event class, but you do have the event name and event data.
     * @param {string} name
     * @param {object} data
     */
    dispatchRaw(name, data) {
        if (this._trackingEnabled) {
            this._dispatchCount += this.ee.listenerCount(name);
        }
        this.ee.emit(name, data);
    }

    /**
     * Waits for all the events in the queue to be dispatched and fully processed (async).
     */
    allSettled() {
        return new Promise((resolve) => {
            if (this._processedCount >= this._dispatchCount) {
                resolve();
            } else {
                this._awaitQueue.push({resolve});
            }
        });
    }

    _onProcessed() {
        this._processedCount += 1;
        if (this._processedCount >= this._dispatchCount) {
            for (const item of this._awaitQueue) {
                item.resolve();
            }
            this._awaitQueue = [];
        }
    }

    /**
     * Enable or disable dispatch/processed tracking. Test-only.
     * @param {boolean} enabled
     */
    setTrackingEnabledForTest(enabled) {
        this._trackingEnabled = enabled;
    }

    /**
     * Clear the await queue and reset dispatch/processed counts. Test-only.
     */
    resetTrackingStateForTest() {
        this._awaitQueue = [];
        this._dispatchCount = 0;
        this._processedCount = 0;
    }
}

module.exports = function createDomainEvents() {
    return new DomainEventsBus();
};
