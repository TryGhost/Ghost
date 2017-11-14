var _ = require('lodash'),
    errors = require('./errors'),
    events = require('./events'),
    logging = require('./logging'),
    models = require('./models'),
    https = require('https'),
    url = require('url');

function makeRequest(webhook, payload) {
    var reqOptions, reqPayload, req;

    reqOptions = url.parse(webhook.get('target_url'));
    reqOptions.method = 'POST';
    reqOptions.headers = {'Content-Type': 'application/json'};

    reqPayload = JSON.stringify(payload);

    // TODO: log that the webhook request was made?
    req = https.request(reqOptions);

    req.write(reqPayload);
    req.on('error', function (err) {
        // TODO: use i18n
        logging.error(new errors.GhostError({
            err: err,
            context: {
                id: webhook.get('id'),
                event: webhook.get('event'),
                target_url: webhook.get('target_url')
            }
        }));
    });
    req.end();
}

function triggerSubscriberAdded(subscriber) {
    // webhook POST body should match GET request for same resource
    // TODO: is `options` needed here?
    var payload = {
        subscribers: [subscriber.toJSON()]
    };

    // find relevant Webhooks
    models.Webhook.findAll({event: 'susbcriber.added'}).then(function (result) {
        _.each(result.models, function each(webhook) {
            makeRequest(webhook, payload);
        });
    });
}

function triggerSubscriberRemoved(subscriber) {
    // TODO: this will be difficult to make generic, maybe we need to listen
    // to a "deleting" event instead so the data is still around?
    var payload = {
        subscribers: [{
            id: subscriber._previousAttributes.id,
            name: subscriber._previousAttributes.name,
            email: subscriber._previousAttributes.email
        }]
    };

    // find relevant Webhooks
    models.Webhook.findAll({event: 'susbcriber.deleted'}).then(function (result) {
        _.each(result.models, function each(webhook) {
            makeRequest(webhook, payload);
        });
    });
}

module.exports.init = function () {
    events.on('subscriber.added', triggerSubscriberAdded);
    events.on('subscriber.deleted', triggerSubscriberRemoved);
};
