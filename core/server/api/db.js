// # DB API
// API for DB operations
var Promise          = require('bluebird'),
    exporter         = require('../data/export'),
    importer         = require('../data/importer'),
    backupDatabase   = require('../data/migration').backupDatabase,
    models           = require('../models'),
    errors           = require('../errors'),
    utils            = require('./utils'),
    pipeline         = require('../utils/pipeline'),
    api              = {},
    docName      = 'db',
    db;

api.settings         = require('./settings');

/**
 * ## DB API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
db = {
    /**
     * ### Export Content
     * Generate the JSON to export
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Ghost Export JSON format
     */
    exportContent: function (options) {
        var tasks = [];

        options = options || {};

        // Export data, otherwise send error 500
        function exportContent() {
            return exporter.doExport().then(function (exportedData) {
                return {db: [exportedData]};
            }).catch(function (error) {
                return Promise.reject(new errors.InternalServerError(error.message || error));
            });
        }

        tasks = [
            utils.handlePermissions(docName, 'exportContent'),
            exportContent
        ];

        return pipeline(tasks, options);
    },
    /**
     * ### Import Content
     * Import posts, tags etc from a JSON blob
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Success
     */
    importContent: function (options) {
        var tasks = [];
        options = options || {};

        function importContent(options) {
            return importer.importFromFile(options)
                .then(function () {
                    api.settings.updateSettingsCache();
                })
                .return({db: []});
        }

        tasks = [
            utils.handlePermissions(docName, 'importContent'),
            importContent
        ];

        return pipeline(tasks, options);
    },
    /**
     * ### Delete All Content
     * Remove all posts and tags
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Success
     */
    deleteAllContent: function (options) {
        var tasks,
            queryOpts = {columns: 'id', context: {internal: true}};

        options = options || {};

        function deleteContent() {
            var collections = [
                models.Post.findAll(queryOpts),
                models.Tag.findAll(queryOpts)
            ];

            return Promise.each(collections, function then(Collection) {
                return Collection.invokeThen('destroy');
            }).return({db: []})
            .catch(function (error) {
                throw new errors.InternalServerError(error.message || error);
            });
        }

        tasks = [
            utils.handlePermissions(docName, 'deleteAllContent'),
            backupDatabase,
            deleteContent
        ];

        return pipeline(tasks, options);
    }
};

module.exports = db;
