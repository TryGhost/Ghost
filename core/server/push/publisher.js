var Promise      = require('bluebird'),
    axios        = require('axios'),
    dataProvider = require('../models'),
    events       = require('../events'),
    config       = require('../config'),
    init,
    notifySubscribers;

notifySubscribers = function () {
    var tasks = [];

    return dataProvider.PushSubscriber.findAll()
        .then(function (pushSubscribers) {
            var sendNotification = function (callbackUrl, triesCount) {
                var maxAllowedRetries = config.PuSH.notificationRetryAttempts - 1;
                triesCount = triesCount || 1;

                // @todo: send diff of changed content
                return axios.post(callbackUrl, {
                    headers: {
                        'Content-Type': 'text/xml; charset=UTF-8'
                    }
                })
                .then(function (response) {
                    if (response.status < 200 || response.status >= 300 && triesCount <= maxAllowedRetries) {
                        triesCount = triesCount + 1;

                        return sendNotification(callbackUrl, triesCount);
                    }
                });
            };

            pushSubscribers.forEach(function (pushSubscriber) {
                var task = sendNotification(pushSubscriber.attributes.callback_url);

                tasks.push(task);
            });

            return Promise.all(tasks);
        });
};

init = function () {
    events.on('post.published', notifySubscribers);
};

module.exports.init = init;
module.exports.notifySubscribers = notifySubscribers;
