// # Webhooks API
// RESTful API for creating webhooks
// also known as "REST Hooks", see http://resthooks.org
const Promise = require('bluebird'),
    _ = require('lodash'),
    pipeline = require('../../lib/promise/pipeline'),
    localUtils = require('./utils'),
    models = require('../../models'),
    common = require('../../lib/common'),
    docName = 'webhooks';

let webhooks;

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
    add(object, options) {
        let tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return models.Webhook.getByEventAndTarget(options.data.webhooks[0].event, options.data.webhooks[0].target_url, _.omit(options, ['data']))
                .then((webhook) => {
                    if (webhook) {
                        return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.api.webhooks.webhookAlreadyExists')}));
                    }

                    return models.Webhook.add(options.data.webhooks[0], _.omit(options, ['data']));
                })
                .then((model) => {
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
    destroy(options) {
        let tasks;

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
    }
};

module.exports = webhooks;
