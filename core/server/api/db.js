// # DB API
// API for DB operations
var Promise = require('bluebird'),
    pipeline = require('../lib/promise/pipeline'),
    localUtils = require('./utils'),
    exporter = require('../data/export'),
    importer = require('../data/importer'),
    backupDatabase = require('../data/db/backup'),
    models = require('../models'),
    common = require('../lib/common'),
    docName = 'db',
    db;

/**
 * ## DB API Methods
 *
 * **See:** [API Methods](constants.js.html#api%20methods)
 */
db = {
    /**
     * ### Archive Content
     * Generate the JSON to export
     *
     * @public
     * @returns {Promise} Ghost Export JSON format
     */
    backupContent: function (options) {
        var tasks;

        options = options || {};

        function jsonResponse(filename) {
            return {db: [{filename: filename}]};
        }

        tasks = [
            backupDatabase,
            jsonResponse
        ];

        return pipeline(tasks, options);
    },
    /**
     * ### Export Content
     * Generate the JSON to export
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Ghost Export JSON format
     */
    exportContent: function exportContent(options) {
        var tasks;

        options = options || {};

        // Export data, otherwise send error 500
        function exportContent() {
            return exporter.doExport().then(function (exportedData) {
                return {db: [exportedData]};
            }).catch(function (err) {
                return Promise.reject(new common.errors.GhostError({err: err}));
            });
        }

        tasks = [
            localUtils.handlePermissions(docName, 'exportContent'),
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
    importContent: function importContent(options) {
        var tasks;
        options = options || {};

        function importContent(options) {
            return importer.importFromFile(options)
                .then(function (response) {
                    // NOTE: response can contain 2 objects if images are imported
                    return {db: [], problems: response.length === 2 ? response[1].problems : response[0].problems};
                });
        }

        tasks = [
            localUtils.handlePermissions(docName, 'importContent'),
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
    deleteAllContent: function deleteAllContent(options) {
        var tasks,
            queryOpts = {columns: 'id', context: {internal: true}};

        options = options || {};

        function deleteContent() {
            var collections = [
                models.Post.findAll(queryOpts),
                models.Tag.findAll(queryOpts)
            ];

            return Promise.each(collections, function then(Collection) {
                return Collection.invokeThen('destroy', queryOpts);
            }).return({db: []})
                .catch(function (err) {
                    throw new common.errors.GhostError({err: err});
                });
        }

        tasks = [
            localUtils.handlePermissions(docName, 'deleteAllContent'),
            backupDatabase,
            deleteContent
        ];

        return pipeline(tasks, options);
    }
};

module.exports = db;
