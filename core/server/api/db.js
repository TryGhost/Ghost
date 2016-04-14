// # DB API
// API for DB operations
var _                = require('lodash'),
    Promise          = require('bluebird'),
    exporter         = require('../data/export'),
    importer         = require('../data/importer'),
    backupDatabase   = require('../data/migration').backupDatabase,
    models           = require('../models'),
    errors           = require('../errors'),
    utils            = require('./utils'),
    pipeline         = require('../utils/pipeline'),
    i18n             = require('../i18n'),

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

        function validate(options) {
            options.name = options.originalname;
            options.type = options.mimetype;

            // Check if a file was provided
            if (!utils.checkFileExists(options)) {
                return Promise.reject(new errors.ValidationError(i18n.t('errors.api.db.selectFileToImport')));
            }

            // Check if the file is valid
            if (!utils.checkFileIsValid(options, importer.getTypes(), importer.getExtensions())) {
                return Promise.reject(new errors.UnsupportedMediaTypeError(
                    i18n.t('errors.api.db.unsupportedFile') +
                        _.reduce(importer.getExtensions(), function (memo, ext) {
                            return memo ? memo + ', ' + ext : ext;
                        })
                ));
            }

            return options;
        }

        function importContent(options) {
            return importer.importFromFile(options)
                .then(function () {
                    api.settings.updateSettingsCache();
                })
                .return({db: []});
        }

        tasks = [
            validate,
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
