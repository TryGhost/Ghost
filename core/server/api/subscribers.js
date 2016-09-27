// # Tag API
// RESTful API for the Tag resource
var Promise      = require('bluebird'),
    _            = require('lodash'),
    fs           = require('fs'),
    dataProvider = require('../models'),
    errors       = require('../errors'),
    utils        = require('./utils'),
    serverUtils  = require('../utils'),
    pipeline     = require('../utils/pipeline'),
    i18n         = require('../i18n'),

    docName      = 'subscribers',
    subscribers;

/**
 * ### Subscribers API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
subscribers = {
    /**
     * ## Browse
     * @param {{context}} options
     * @returns {Promise<Subscriber>} Subscriber Collection
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
            return dataProvider.Subscriber.findPage(options);
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {opts: utils.browseDefaultOptions}),
            utils.handlePermissions(docName, 'browse'),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    },

    /**
     * ## Read
     * @param {{id}} options
     * @return {Promise<Subscriber>} Subscriber
     */
    read: function read(options) {
        var attrs = ['id'],
            tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.Subscriber.findOne(options.data, _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {attrs: attrs}),
            utils.handlePermissions(docName, 'read'),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options).then(function formatResponse(result) {
            if (result) {
                return {subscribers: [result.toJSON(options)]};
            }

            return Promise.reject(new errors.NotFoundError(i18n.t('errors.api.subscribers.subscriberNotFound')));
        });
    },

    /**
     * ## Add
     * @param {Subscriber} object the subscriber to create
     * @returns {Promise(Subscriber)} Newly created Subscriber
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
            return dataProvider.Subscriber.getByEmail(options.data.subscribers[0].email)
                .then(function (subscriber) {
                    if (subscriber && options.context.external) {
                        // we don't expose this information
                        return Promise.resolve(subscriber);
                    } else if (subscriber) {
                        return Promise.reject(new errors.ValidationError(i18n.t('errors.api.subscribers.subscriberAlreadyExists')));
                    }

                    return dataProvider.Subscriber.add(options.data.subscribers[0], _.omit(options, ['data'])).catch(function (error) {
                        if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
                            return Promise.reject(new errors.ValidationError(i18n.t('errors.api.subscribers.subscriberAlreadyExists')));
                        }

                        return Promise.reject(error);
                    });
                });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName),
            utils.handlePermissions(docName, 'add'),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options).then(function formatResponse(result) {
            var subscriber = result.toJSON(options);
            return {subscribers: [subscriber]};
        });
    },

    /**
     * ## Edit
     *
     * @public
     * @param {Subscriber} object Subscriber or specific properties to update
     * @param {{id, context, include}} options
     * @return {Promise<Subscriber>} Edited Subscriber
     */
    edit: function edit(object, options) {
        var tasks;

        /**
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.Subscriber.edit(options.data.subscribers[0], _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {opts: utils.idDefaultOptions}),
            utils.handlePermissions(docName, 'edit'),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options).then(function formatResponse(result) {
            if (result) {
                var subscriber = result.toJSON(options);

                return {subscribers: [subscriber]};
            }

            return Promise.reject(new errors.NotFoundError(i18n.t('errors.api.subscribers.subscriberNotFound')));
        });
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
         * ### Delete Subscriber
         * Make the call to the Model layer
         * @param {Object} options
         */
        function doQuery(options) {
            return dataProvider.Subscriber.destroy(options).return(null);
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {opts: utils.idDefaultOptions}),
            utils.handlePermissions(docName, 'destroy'),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    },

    /**
     * ### Export Subscribers
     * Generate the CSV to export
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Ghost Export CSV format
     */
    exportCSV: function exportCSV(options) {
        var tasks = [];

        options = options || {};

        function formatCSV(data) {
            var fields = ['id', 'email', 'created_at', 'deleted_at'],
                csv = fields.join(',') + '\r\n',
                subscriber,
                field,
                j,
                i;

            for (j = 0; j < data.length; j = j + 1) {
                subscriber = data[j];

                for (i = 0; i < fields.length; i = i + 1) {
                    field = fields[i];
                    csv += subscriber[field] !== null ? subscriber[field] : '';
                    if (i !== fields.length - 1) {
                        csv += ',';
                    }
                }
                csv += '\r\n';
            }
            return csv;
        }

        // Export data, otherwise send error 500
        function exportSubscribers() {
            return dataProvider.Subscriber.findPage(options).then(function (data) {
                return formatCSV(data.subscribers);
            }).catch(function (error) {
                return Promise.reject(new errors.InternalServerError(error.message || error));
            });
        }

        tasks = [
            utils.handlePermissions(docName, 'browse'),
            exportSubscribers
        ];

        return pipeline(tasks, options);
    },

    /**
     * ### Import CSV
     * Import subscribers from a CSV file
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Success
     */
    importCSV: function (options) {
        var tasks = [];
        options = options || {};

        function importCSV(options) {
            var filePath = options.path,
                fulfilled = 0,
                invalid = 0,
                duplicates = 0;

            return serverUtils.readCSV({
                path: filePath,
                columnsToExtract: [{name: 'email', lookup: /email/i}]
            }).then(function (result) {
                return Promise.all(result.map(function (entry) {
                    return subscribers.add(
                        {subscribers: [{email: entry.email}]},
                        {context: options.context}
                    ).reflect();
                })).each(function (inspection) {
                    if (inspection.isFulfilled()) {
                        fulfilled = fulfilled + 1;
                    } else {
                        if (inspection.reason() instanceof errors.ValidationError) {
                            duplicates = duplicates + 1;
                        } else {
                            invalid = invalid + 1;
                        }
                    }
                });
            }).then(function () {
                return {
                    meta: {
                        stats: {
                            imported: fulfilled,
                            duplicates: duplicates,
                            invalid: invalid
                        }
                    }
                };
            }).finally(function () {
                // Remove uploaded file from tmp location
                return Promise.promisify(fs.unlink)(filePath);
            });
        }

        tasks = [
            utils.handlePermissions(docName, 'add'),
            importCSV
        ];

        return pipeline(tasks, options);
    }
};

module.exports = subscribers;
