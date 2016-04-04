var dataProvider   = require('../models'),
    handleSubscription;

function createSubscriber(callbackUrl, topicUrl) {
    return dataProvider.PushSubscriber.add({
        callback_url: callbackUrl,
        topic_url: topicUrl
    });
}

function deleteSubscriber(callbackUrl, topicUrl) {
    var PushSubscriber = dataProvider.PushSubscriber;

    return new Promise(function (resolve, reject) {
        PushSubscriber.findOne({callback_url: callbackUrl, topic_url: topicUrl})
            .then(function (result) {
                if (result) {
                    PushSubscriber.destroy({id: result.attributes.id}).then(resolve);
                } else {
                    reject();
                }
            });
    });
}

handleSubscription = function handleSubscription(req, res, next) {
    var mode = req.body['hub.mode'],
        callbackUrl = req.body['hub.callback'],
        topicUrl = req.body['hub.topic'];

    if (mode == 'subscribe') {
        return createSubscriber(callbackUrl, topicUrl)
            .then(function () {
               res.status(202).end();
            });
    } else {
        return deleteSubscriber(callbackUrl, topicUrl)
            .then(function () {
                res.status(202).end();
            })
            .catch(function () {
                res.status(500).send('Subscription modification failed');
            });
    }
};

module.exports = handleSubscription;
