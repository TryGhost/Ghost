// # Client API
// RESTful API for the Client resource
const Promise = require('bluebird'),
    {extend, omit} = require('lodash'),
    pipeline = require('../lib/promise/pipeline'),
    localUtils = require('./utils'),
    models = require('../models'),
    common = require('../lib/common'),
    docName = 'clients';

let clients;

/**
 * ### Clients API Methods
 *
 * **See:** [API Methods](events.js.html#api%20methods)
 */
clients = {

    /**
     * ## Read
     * @param {{id}} options
     * @return {Promise<Client>} Client
     */
    read: function read(options) {
        const attrs = ['id', 'slug'];
        let tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            // only User Agent (type = `ua`) clients are available at the moment.
            options.data = extend(options.data, {type: 'ua'});

            return models.Client.findOne(options.data, omit(options, ['data']))
                .then(function onModelResponse(model) {
                    if (!model) {
                        return Promise.reject(new common.errors.NotFoundError({
                            message: common.i18n.t('common.api.clients.clientNotFound')
                        }));
                    }

                    return {
                        clients: [model.toJSON(options)]
                    };
                });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            localUtils.validate(docName, {attrs: attrs}),
            localUtils.convertOptions(),
            // TODO: add permissions
            // utils.handlePublicPermissions(docName, 'read'),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    }
};

module.exports = clients;
