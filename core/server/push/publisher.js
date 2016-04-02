var events            = require('../events'),
    notifySubscribers = require('./subscriber-notifier'),
    init;

init = function () {
    // @todo: work out delta of changed data and pass this to notifySubscribers
    events.on('post.published', notifySubscribers);
};

module.exports.init = init;
