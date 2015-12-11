// # Client API
// RESTful API for the Client resource
var Promise      = require('bluebird'),
    _            = require('lodash'),
    dataProvider = require('../models'),
    errors       = require('../errors'),
    utils        = require('./utils'),
    pipeline     = require('../utils/pipeline'),
    i18n         = require('../i18n'),

    docName      = 'clients',
    allowedIncludes = ['trustedDomains'],
    clients;

/**
 * ### Clients API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
clients = {
    /**
     * ## Browse
     * @param {{context}} options
     * @returns {Promise<Clients>} Clients Collection
     */
    browse: function browse(options) {
        var tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.Client.findPage(options);
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {opts: utils.browseDefaultOptions}),
            // TODO: add permissions
            // utils.handlePublicPermissions(docName, 'browse'),
            utils.convertOptions(allowedIncludes),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    },

    /**
     * ## Read
     * @param {{id}} options
     * @return {Promise<Client>} Client
     */
    read: function read(options) {
        var attrs = ['id', 'slug'],
            tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            // only User Agent (type = `ua`) clients are available at the moment.
            options.data = _.extend(options.data, {type: 'ua'});
            return dataProvider.Client.findOne(options.data, _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {attrs: attrs}),
            // TODO: add permissions
            // utils.handlePublicPermissions(docName, 'read'),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options).then(function formatResponse(result) {
            if (result) {
                return {clients: [result.toJSON(options)]};
            }

            return Promise.reject(new errors.NotFoundError(i18n.t('common.api.clients.clientNotFound')));
        });
    },

    /**
     * ## Add
     * @param {Client} object the client to create
     * @returns {Promise(Client)} Newly created Client
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
            return dataProvider.Client.add(options.data.clients[0], _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName),
            // TODO: add permissions
            // utils.handlePermissions(docName, 'add'),
            utils.convertOptions(allowedIncludes),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options).then(function formatResponse(result) {
            var client = result.toJSON(options);

            return {clients: [client]};
        });
    },

    /**
     * ## Edit
     *
     * @public
     * @param {Client} object Client or specific properties to update
     * @param {{id, context, include}} options
     * @return {Promise<Client>} Edited Client
     */
    edit: function edit(object, options) {
        var tasks;

        /**
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.Client.edit(options.data.clients[0], _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {opts: utils.idDefaultOptions}),
            // TODO: add permissions
            // utils.handlePermissions(docName, 'edit'),
            utils.convertOptions(allowedIncludes),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options).then(function formatResponse(result) {
            if (result) {
                var client = result.toJSON(options);

                return {clients: [client]};
            }

            return Promise.reject(new errors.NotFoundError('Client not found.'));
        });
    }
};

module.exports = clients;
