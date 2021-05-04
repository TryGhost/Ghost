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
