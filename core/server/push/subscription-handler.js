var dataProvider   = require('../models'),
    handleSubscription;

function createSubscriber(callbackUrl) {
    return dataProvider.PushSubscriber.add({callback_url: callbackUrl});
}

function deleteSubscriber(callbackUrl) {
    var PushSubscriber = dataProvider.PushSubscriber;

    return PushSubscriber.findOne({callback_url: callbackUrl})
        .then(function (result) {
            if (result) {
                return PushSubscriber.destroy({id: result.attributes.id});
            } else {
                // @todo
            }
        });
}

handleSubscription = function handleSubscription(req, res, next) {
    var mode = req.body['hub.mode'],
        callbackUrl = req.body['hub.callback'];

    if (mode == 'subscribe') {
        return createSubscriber(callbackUrl)
            .then(function () {
               res.status(202).end();
            });
    } else {
        return deleteSubscriber(callbackUrl)
            .then(function () {
                res.status(202).end();
            });
    }
};

module.exports = handleSubscription;
