/**
 * Why has this not been moved to e.g. @tryghost/events or shared yet?
 *
 * - We currently massively overuse this utility, coupling together bits of the codebase in unexpected ways
 * - We want to prevent this, not reinforce it
 * * Having an @tryghost/events or shared/events module would reinforce this bad patter of using the same event emitter everywhere
 *
 * - Ideally, we want to refactor to:
 *    - either remove dependence on events where we can
 *    - or have separate event emitters for e.g. model layer and routing layer
 *
 */

const events = require('events');

class EventRegistry extends events.EventEmitter {
    /**
     * This is method is semi-hack to make sure listeners are only registered once
     * during the lifetime of the process. And example problem it solves is
     * registering duplicate listeners between Ghost instance reboots when running tests.
     * @param {String} eventName
     * @param {String} listenerName named function name registered as a listener for the event
     * @returns {Boolean}
     */
    hasRegisteredListener(eventName, listenerName) {
        return !!(this.listeners(eventName).find(listener => (listener.name === listenerName)));
    }
}

const eventRegistryInstance = new EventRegistry();
eventRegistryInstance.setMaxListeners(100);

module.exports = eventRegistryInstance;
