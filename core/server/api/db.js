var dataExport       = require('../data/export'),
    dataImport       = require('../data/import'),
    dataProvider     = require('../models'),
    fs               = require('fs-extra'),
    when             = require('when'),
    nodefn           = require('when/node/function'),
    _                = require('lodash'),
    validation       = require('../data/validation'),
    errors           = require('../../server/errors'),
    canThis          = require('../permissions').canThis,
    api              = {},
    db;

api.notifications    = require('./notifications');
api.settings         = require('./settings');

db = {
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
    'importContent': function (options) {
        options = options || {};
        var databaseVersion;

        return canThis(options.context).importContent.db().then(function () {
            if (!options.importfile || !options.importfile.path || options.importfile.name.indexOf('json') === -1) {
                /**
                 * Notify of an error if it occurs
                 *
                 * - If there's no file (although if you don't select anything, the input is still submitted, so
                 *   !req.files.importfile will always be false)
                 * - If there is no path
                 * - If the name doesn't have json in it
                 */
                return when.reject(new errors.InternalServerError('Please select a .json file to import.'));
            }

            return api.settings.read({key: 'databaseVersion', context: { internal: true }}).then(function (response) {
                var setting = response.settings[0];

                return when(setting.value);
            }, function () {
                return when('002');
            }).then(function (version) {
                databaseVersion = version;
                // Read the file contents
                return nodefn.call(fs.readFile, options.importfile.path);
            }).then(function (fileContents) {
                var importData,
                    error = '';

                // Parse the json data
                try {
                    importData = JSON.parse(fileContents);

                    // if importData follows JSON-API format `{ db: [exportedData] }`
                    if (_.keys(importData).length === 1 && Array.isArray(importData.db)) {
                        importData = importData.db[0];
                    }
                } catch (e) {
                    errors.logError(e, "API DB import content", "check that the import file is valid JSON.");
                    return when.reject(new errors.BadRequest("Failed to parse the import JSON file"));
                }

                if (!importData.meta || !importData.meta.version) {
                    return when.reject(new errors.ValidationError("Import data does not specify version", 'meta.version'));
                }

                _.each(_.keys(importData.data), function (tableName) {
                    _.each(importData.data[tableName], function (importValues) {
                        try {
                            validation.validateSchema(tableName, importValues);
                        } catch (err) {
                            error += error !== "" ? "<br>" : "";
                            error += err.message;
                        }
                    });
                });

                if (error !== "") {
                    return when.reject(new Error(error));
                }
                // Import for the current version
                return dataImport(databaseVersion, importData);

            }).then(function importSuccess() {
                return api.settings.updateSettingsCache();
            }).then(function () {
                return when.resolve({ db: [] });
            }).otherwise(function importFailure(error) {
                return when.reject(new errors.InternalServerError(error.message || error));
            }).finally(function () {
                // Unlink the file after import
                return nodefn.call(fs.unlink, options.importfile.path);
            });
        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to export data. (no rights)'));
        });
    },
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
