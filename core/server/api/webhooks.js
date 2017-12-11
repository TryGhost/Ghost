// # Webhooks API
// RESTful API for creating webhooks
// also known as "REST Hooks", see http://resthooks.org
var Promise = require('bluebird'),
    _ = require('lodash'),
    https = require('https'),
    url = require('url'),
    pipeline = require('../utils/pipeline'),
    apiUtils = require('./utils'),
    models = require('../models'),
    common = require('../lib/common'),
    docName = 'webhooks',
    webhooks;

// TODO: Use the request util. Do we want retries here?
function makeRequest(webhook, payload, options) {
    var event = webhook.get('event'),
        targetUrl = webhook.get('target_url'),
        webhookId = webhook.get('id'),
        reqOptions, reqPayload, req;

    reqOptions = url.parse(targetUrl);
    reqOptions.method = 'POST';
    reqOptions.headers = {'Content-Type': 'application/json'};

    reqPayload = JSON.stringify(payload);

    common.logging.info('webhook.trigger', event, targetUrl);
    req = https.request(reqOptions);

    req.write(reqPayload);
    req.on('error', function (err) {
        // when a webhook responds with a 410 Gone response we should remove the hook
        if (err.status === 410) {
            common.logging.info('webhook.destroy (410 response)', event, targetUrl);
            return models.Webhook.destroy({id: webhookId}, options);
        }

        // TODO: use i18n?
        common.logging.error(new common.errors.GhostError({
            err: err,
            context: {
                id: webhookId,
                event: event,
                target_url: targetUrl,
                payload: payload
            }
        }));
    });
    req.end();
}

function makeRequests(webhooksCollection, payload, options) {
    _.each(webhooksCollection.models, function (webhook) {
        makeRequest(webhook, payload, options);
    });
}

/**
 * ## Webhook API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
webhooks = {

    /**
     * ### Add
     * @param {Webhook} object the webhook to create
     * @returns {Promise(Webhook)} newly created Webhook
     */
    add: function add(object, options) {
        var tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return models.Webhook.getByEventAndTarget(options.data.webhooks[0].event, options.data.webhooks[0].target_url, _.omit(options, ['data']))
                .then(function (webhook) {
                    if (webhook) {
                        return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.api.webhooks.webhookAlreadyExists')}));
                    }

                    return models.Webhook.add(options.data.webhooks[0], _.omit(options, ['data']));
                })
                .then(function onModelResponse(model) {
                    return {
                        webhooks: [model.toJSON(options)]
                    };
                });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            apiUtils.validate(docName),
            apiUtils.handlePermissions(docName, 'add'),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options);
    },

    /**
     * ## Destroy
     *
     * @public
     * @param {{id, context}} options
     * @return {Promise}
     */
    destroy: function destroy(options) {
        var tasks;

        /**
         * ### Delete Webhook
         * Make the call to the Model layer
         * @param {Object} options
         */
        function doQuery(options) {
            return models.Webhook.destroy(options).return(null);
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            apiUtils.validate(docName, {opts: apiUtils.idDefaultOptions}),
            apiUtils.handlePermissions(docName, 'destroy'),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    },

    trigger: function trigger(event, payload, options) {
        var tasks;

        function doQuery(options) {
            return models.Webhook.findAllByEvent(event, options);
        }

        tasks = [
            doQuery,
            _.partialRight(makeRequests, payload, options)
        ];

        return pipeline(tasks, options);
    }
};

module.exports = webhooks;
