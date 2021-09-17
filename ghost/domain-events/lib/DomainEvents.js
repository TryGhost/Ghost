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
        DomainEvents.ee.emit(event.constructor.name, event);
    }
}

module.exports = DomainEvents;
