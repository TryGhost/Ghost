var events            = require('../events'),
    notifySubscribers = require('./subscriber-notifier'),
    init;

init = function () {
    events.on('post.published', notifySubscribers);
};

module.exports.init = init;
