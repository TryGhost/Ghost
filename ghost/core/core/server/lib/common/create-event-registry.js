const events = require('events');

class EventRegistry extends events.EventEmitter {
    /**
     * This is method is semi-hack to make sure listeners are only registered once
     * during the lifetime of the process. And example problem it solves is
     * registering duplicate listeners between Ghost instance reboots when running tests.
     * @param {string} eventName
     * @param {string} listenerName named function name registered as a listener for the event
     * @returns {boolean}
     */
    hasRegisteredListener(eventName, listenerName) {
        return !!(this.listeners(eventName).find(listener => (listener.name === listenerName)));
    }
}

module.exports = function createEventRegistry() {
    const eventRegistry = new EventRegistry();
    eventRegistry.setMaxListeners(100);
    return eventRegistry;
};
