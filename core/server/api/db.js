var dataExport       = require('../data/export'),
    dataImport       = require('../data/import'),
    dataProvider     = require('../models'),
    fs               = require('fs-extra'),
    when             = require('when'),
    nodefn           = require('when/node/function'),
    _                = require('lodash'),
    validation       = require('../data/validation'),
    errors           = require('../../server/errorHandling'),
    api              = {},
    db;

api.notifications    = require('./notifications');
api.settings         = require('./settings');

db = {
    'exportContent': function () {
        // Export data, otherwise send error 500
        return dataExport().otherwise(function (error) {
            return when.reject({errorCode: 500, message: error.message || error});
        });
    },
    'importContent': function (options) {
        var databaseVersion;

        if (!options.importfile || !options.importfile.path || options.importfile.name.indexOf('json') === -1) {
            /**
             * Notify of an error if it occurs
             *
             * - If there's no file (although if you don't select anything, the input is still submitted, so
             *   !req.files.importfile will always be false)
             * - If there is no path
             * - If the name doesn't have json in it
             */
            return when.reject({code: 500, message: 'Please select a .json file to import.'});
        }

        return api.settings.read({ key: 'databaseVersion' }).then(function (setting) {
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
            } catch (e) {
                errors.logError(e, "API DB import content", "check that the import file is valid JSON.");
                return when.reject(new Error("Failed to parse the import JSON file"));
            }

            if (!importData.meta || !importData.meta.version) {
                return when.reject(new Error("Import data does not specify version"));
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
            return when.resolve({message: 'Posts, tags and other data successfully imported'});
        }).otherwise(function importFailure(error) {
            return when.reject({code: 500, message: error.message || error});
        }).finally(function () {
            // Unlink the file after import
            return nodefn.call(fs.unlink, options.importfile.path);
        });
    },
    'deleteAllContent': function () {
        return when(dataProvider.deleteAllContent())
            .then(function () {
                return when.resolve({message: 'Successfully deleted all content from your blog.'});
            }, function (error) {
                return when.reject({code: 500, message: error.message || error});
            });
    }
};

module.exports = db;
