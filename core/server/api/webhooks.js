// # Webhooks API
// RESTful API for creating webhooks
// also known as "REST Hooks", see http://resthooks.org
var Promise = require('bluebird'),
    _ = require('lodash'),
    pipeline = require('../utils/pipeline'),
    apiUtils = require('./utils'),
    models = require('../models'),
    errors = require('../errors'),
    i18n = require('../i18n'),
    docName = 'webhooks',
    webhooks;

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
            return models.Webhook.getByEventAndTarget(options.data.webhooks[0].event, options.data.webhooks[0].target_url)
                .then(function (webhook) {
                    if (webhook) {
                        return Promise.reject(new errors.ValidationError({message: i18n.t('errors.api.webhooks.webhookAlreadyExists')}));
                    }

                    return models.Webhook.add(options.data.webhooks[0], _.omit(options, ['data'])).catch(function (error) {
                        return Promise.reject(error);
                    });
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
    }
};

module.exports = webhooks;
