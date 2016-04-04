var Promise              = require('bluebird'),
    axios                = require('axios'),
    dataProvider         = require('../models'),
    events               = require('../events'),
    config               = require('../config'),
    resolveTopicsForPost = require('./topic-resolver'),
    notifySubscribers;

notifySubscribers = function (post) {
    var tasks = [];

    return resolveTopicsForPost(post)
        .then(function (topics) {
            return dataProvider.PushSubscriber.findAllByTopicUrls(topics);
        })
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
                var task = sendNotification(pushSubscriber.get('callback_url'));

                tasks.push(task);
            });

            return Promise.all(tasks);
        });
};

module.exports = notifySubscribers;
