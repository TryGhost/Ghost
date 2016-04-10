var events  = require('events'),
    util    = require('util'),
    EventRegistry,
    EventRegistryInstance;

EventRegistry = function () {
    events.EventEmitter.call(this);
};
util.inherits(EventRegistry, events.EventEmitter);

EventRegistryInstance = new EventRegistry();
EventRegistryInstance.setMaxListeners(100);

module.exports = EventRegistryInstance;
