var events = require('events'),
    util = require('util'),
    EventRegistry,
    EventRegistryInstance;

EventRegistry = function () {
    events.EventEmitter.call(this);
};

util.inherits(EventRegistry, events.EventEmitter);

EventRegistry.prototype.onMany = function (arr, onEvent) {
    var self = this;

    arr.forEach(function (eventName) {
        self.on(eventName, onEvent);
    });
};

EventRegistryInstance = new EventRegistry();
EventRegistryInstance.setMaxListeners(100);

module.exports = EventRegistryInstance;
