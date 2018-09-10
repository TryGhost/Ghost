const events = require('events'),
    util = require('util');
let EventRegistry,
    EventRegistryInstance;

EventRegistry = function () {
    events.EventEmitter.call(this);
};

util.inherits(EventRegistry, events.EventEmitter);

EventRegistry.prototype.onMany = function (arr, onEvent) {
    arr.forEach((eventName) => {
        this.on(eventName, onEvent);
    });
};

EventRegistryInstance = new EventRegistry();
EventRegistryInstance.setMaxListeners(100);

module.exports = EventRegistryInstance;
