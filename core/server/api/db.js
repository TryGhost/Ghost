// # DB API
// API for DB operations
var dataExport       = require('../data/export'),
    dataImport       = require('../data/import'),
    dataProvider     = require('../models'),
    fs               = require('fs-extra'),
    when             = require('when'),
    nodefn           = require('when/node'),
    _                = require('lodash'),
    path             = require('path'),
    errors           = require('../../server/errors'),
    canThis          = require('../permissions').canThis,
    api              = {},
    db;

api.settings         = require('./settings');


function isValidFile(ext) {
    if (ext === '.json') {
        return true;
    }
    return false;
}
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
    'exportContent': function (options) {
        options = options || {};

        // Export data, otherwise send error 500
        return canThis(options.context).exportContent.db().then(function () {
            return dataExport().then(function (exportedData) {
                return when.resolve({ db: [exportedData] });
            }).otherwise(function (error) {
                return when.reject(new errors.InternalServerError(error.message || error));
            });
        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to export data. (no rights)'));
        });
    },
    /**
     * ### Import Content
     * Import posts, tags etc from a JSON blob
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Success
     */
    'importContent': function (options) {
        options = options || {};
        var databaseVersion,
            type,
            ext,
            filepath;

        return canThis(options.context).importContent.db().then(function () {
            if (!options.importfile || !options.importfile.type || !options.importfile.path) {
                return when.reject(new errors.NoPermissionError('Please select a file to import.'));
            }

            type = options.importfile.type;
            ext = path.extname(options.importfile.name).toLowerCase();
            filepath = options.importfile.path;

            return when(isValidFile(ext)).then(function (result) {
                if (!result) {
                    return when.reject(new errors.UnsupportedMediaTypeError('Please select a .json file to import.'));
                }
            }).then(function () {
                return api.settings.read(
                    {key: 'databaseVersion', context: { internal: true }}
                ).then(function (response) {
                    var setting = response.settings[0];

                    return when(setting.value);
                });
            }).then(function (version) {
                databaseVersion = version;
                // Read the file contents
                return nodefn.call(fs.readFile, filepath);
            }).then(function (fileContents) {
                var importData;

                // Parse the json data
                try {
                    importData = JSON.parse(fileContents);

                    // if importData follows JSON-API format `{ db: [exportedData] }`
                    if (_.keys(importData).length === 1 && Array.isArray(importData.db)) {
                        importData = importData.db[0];
                    }
                } catch (e) {
                    errors.logError(e, 'API DB import content', 'check that the import file is valid JSON.');
                    return when.reject(new errors.BadRequest('Failed to parse the import JSON file'));
                }

                if (!importData.meta || !importData.meta.version) {
                    return when.reject(
                        new errors.ValidationError('Import data does not specify version', 'meta.version')
                    );
                }

                // Import for the current version
                return dataImport(databaseVersion, importData);

            }).then(function importSuccess() {
                return api.settings.updateSettingsCache();
            }).then(function () {
                return when.resolve({ db: [] });
            }).finally(function () {
                // Unlink the file after import
                return nodefn.call(fs.unlink, filepath);
            });
        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to import data. (no rights)'));
        });
    },
    /**
     * ### Delete All Content
     * Remove all posts and tags
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Success
     */
    'deleteAllContent': function (options) {
        options = options || {};

        return canThis(options.context).deleteAllContent.db().then(function () {
            return when(dataProvider.deleteAllContent())
                .then(function () {
                    return when.resolve({ db: [] });
                }, function (error) {
                    return when.reject(new errors.InternalServerError(error.message || error));
                });
        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to export data. (no rights)'));
        });
    }
};

module.exports = db;
