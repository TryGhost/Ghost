const EventEmitter = require('events').EventEmitter;

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
     * @param {(event: EventClass) => void} handler
     *
     * @returns {void}
     */
    static subscribe(Event, handler) {
        DomainEvents.ee.on(Event.name, handler);
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
        DomainEvents.ee.emit(name, data);
    }
}

module.exports = DomainEvents;
