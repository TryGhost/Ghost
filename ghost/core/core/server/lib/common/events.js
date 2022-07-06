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
const util = require('util');
let EventRegistry;
let EventRegistryInstance;

EventRegistry = function () {
    events.EventEmitter.call(this);
};

util.inherits(EventRegistry, events.EventEmitter);

EventRegistryInstance = new EventRegistry();
EventRegistryInstance.setMaxListeners(100);

module.exports = EventRegistryInstance;
