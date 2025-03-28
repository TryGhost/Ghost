const EventEmitter = require('events').EventEmitter;
const logging = require('@tryghost/logging');

/**
 * @template T
 * @typedef {import('./').ConstructorOf<T>} ConstructorOf<T>
 */

/**
 * @template Data
 * @typedef {object} IEvent
 * @prop {Date} timestamp
 * @prop {Data} data
 */

class DomainEvents {
    /**
     * @private
     * @type EventEmitter
     */
    static ee = new EventEmitter;

    /**
     * @template Data
     * @template {IEvent<Data>} EventClass
     * @param {ConstructorOf<EventClass>} Event
     * @param {(event: EventClass) => Promise<void> | void} handler
     *
     * @returns {void}
     */
    static subscribe(Event, handler) {
        DomainEvents.ee.on(Event.name, async (event) => {
            try {
                await handler(event);
            } catch (e) {
                logging.error('Unhandled error in event handler for event: ' + Event.name);
                logging.error(e);
            }
            if (this.#trackingEnabled) {
                this.#onProcessed();
            }
        });
    }

    /**
     * @template Data
     * @param {IEvent<Data>} event
     * @returns {void}
     */
    static dispatch(event) {
        DomainEvents.dispatchRaw(event.constructor.name, event);
    }

    /**
     * Dispatch an event in case you don't have an instance of the event class, but you do have the event name and event data.
     * @template Data
     * @param {string} name
     * @param {Data} data
     * @returns {void}
     */
    static dispatchRaw(name, data) {
        if (this.#trackingEnabled) {
            this.#dispatchCount += DomainEvents.ee.listenerCount(name);
        }
        DomainEvents.ee.emit(name, data);
    }

    // Methods and properties below are only for testing purposes
    static #awaitQueue = [];
    static #dispatchCount = 0;
    static #processedCount = 0;
    static #trackingEnabled = process.env.NODE_ENV?.startsWith('test');

    /**
     * Waits for all the events in the queue to be dispatched and fully processed (async).
     */
    static allSettled() {
        return new Promise((resolve) => {
            if (this.#processedCount >= this.#dispatchCount) {
                // Resolve immediately if there are no events in the queue
                resolve();
                return;
            }
            this.#awaitQueue.push({resolve});
        });
    }

    static #onProcessed() {
        this.#processedCount += 1;
        if (this.#processedCount >= this.#dispatchCount) {
            for (const item of this.#awaitQueue) {
                item.resolve();
            }
            this.#awaitQueue = [];
        }
    }
}

module.exports = DomainEvents;
