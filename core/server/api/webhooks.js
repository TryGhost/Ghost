// # Webhooks API
// RESTful API for creating webhooks
// also known as "REST Hooks", see http://resthooks.org
var Promise = require('bluebird'),
    _ = require('lodash'),
    pipeline = require('../lib/promise/pipeline'),
    localUtils = require('./utils'),
    models = require('../models'),
    common = require('../lib/common'),
    request = require('../lib/request'),
    docName = 'webhooks',
    webhooks;

function makeRequest(webhook, payload, options) {
    var event = webhook.get('event'),
        targetUrl = webhook.get('target_url'),
        webhookId = webhook.get('id'),
        reqPayload = JSON.stringify(payload);

    common.logging.info('webhook.trigger', event, targetUrl);

    request(targetUrl, {
        body: reqPayload,
        headers: {
            'Content-Length': Buffer.byteLength(reqPayload),
            'Content-Type': 'application/json'
        },
        timeout: 2 * 1000,
        retries: 5
    }).catch(function (err) {
        // when a webhook responds with a 410 Gone response we should remove the hook
        if (err.statusCode === 410) {
            common.logging.info('webhook.destroy (410 response)', event, targetUrl);
            return models.Webhook.destroy({id: webhookId}, options);
        }

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
}

function makeRequests(webhooksCollection, payload, options) {
    _.each(webhooksCollection.models, function (webhook) {
        makeRequest(webhook, payload, options);
    });
}

/**
 * ## Webhook API Methods
 *
 * **See:** [API Methods](constants.js.html#api%20methods)
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
            localUtils.validate(docName),
            localUtils.convertOptions(),
            localUtils.handlePermissions(docName, 'add'),
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
            localUtils.validate(docName, {opts: localUtils.idDefaultOptions}),
            localUtils.convertOptions(),
            localUtils.handlePermissions(docName, 'destroy'),
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
