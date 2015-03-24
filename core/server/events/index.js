var events  = require('events'),
    util    = require('util'),
    EventRegistry;

EventRegistry = function () {};

util.inherits(EventRegistry, events.EventEmitter);

module.exports = new EventRegistry();
