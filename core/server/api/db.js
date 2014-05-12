var dataExport          = require('../data/export'),
    dataImport          = require('../data/import'),
    apiNotifications    = require('./notifications'),
    apiSettings         = require('./settings'),
    fs                  = require('fs-extra'),
    path                = require('path'),
    when                = require('when'),
    nodefn              = require('when/node/function'),
    _                   = require('underscore'),
    schema              = require('../data/schema'),
    config              = require('../config'),
    debugPath           = config.paths().webroot + '/ghost/debug/',

    db;

db = {
    'export': function (req, res) {
        /*jslint unparam:true*/
        return dataExport().then(function (exportedData) {
            // Save the exported data to the file system for download
            var fileName = path.resolve(__dirname + '/../../server/data/export/exported-' + (new Date().getTime()) + '.json');

            return nodefn.call(fs.writeFile, fileName, JSON.stringify(exportedData)).then(function () {
                return when(fileName);
            });
        }).then(function (exportedFilePath) {
            // Send the exported data file
            res.download(exportedFilePath, 'GhostData.json');
        }).otherwise(function (error) {
            // Notify of an error if it occurs
            return apiNotifications.browse().then(function (notifications) {
                var notification = {
                    type: 'error',
                    message: error.message || error,
                    status: 'persistent',
                    id: 'per-' + (notifications.length + 1)
                };

                return apiNotifications.add(notification).then(function () {
                    res.redirect(debugPath);
                });
            });
        });
    },
    'import': function (req, res) {
        var notification,
            databaseVersion;

        if (!req.files.importfile || !req.files.importfile.path || req.files.importfile.name.indexOf('json') === -1) {
            /**
             * Notify of an error if it occurs
             *
             * - If there's no file (although if you don't select anything, the input is still submitted, so
             *   !req.files.importfile will always be false)
             * - If there is no path
             * - If the name doesn't have json in it
             */
            return apiNotifications.browse().then(function (notifications) {
                notification = {
                    type: 'error',
                    message:  "Must select a .json file to import",
                    status: 'persistent',
                    id: 'per-' + (notifications.length + 1)
                };

                return apiNotifications.add(notification).then(function () {
                    res.redirect(debugPath);
                });
            });
        }

        apiSettings.read({ key: 'databaseVersion' }).then(function (setting) {
            return when(setting.value);
        }, function () {
            return when('001');
        }).then(function (version) {
            databaseVersion = version;
            // Read the file contents
            return nodefn.call(fs.readFile, req.files.importfile.path);
        }).then(function (fileContents) {
            var importData,
                error = '',
                tableKeys = _.keys(schema);

            // Parse the json data
            try {
                importData = JSON.parse(fileContents);
            } catch (e) {
                return when.reject(new Error("Failed to parse the import file"));
            }

            if (!importData.meta || !importData.meta.version) {
                return when.reject(new Error("Import data does not specify version"));
            }

            _.each(tableKeys, function (constkey) {
                _.each(importData.data[constkey], function (elem) {
                    var prop;
                    for (prop in elem) {
                        if (elem.hasOwnProperty(prop)) {
                            if (schema[constkey].hasOwnProperty(prop)) {
                                if (elem.hasOwnProperty(prop)) {
                                    if (!_.isNull(elem[prop])) {
                                        if (elem[prop].length > schema[constkey][prop].maxlength) {
                                            error += error !== "" ? "<br>" : "";
                                            error += "Property '" + prop + "' exceeds maximum length of " + schema[constkey][prop].maxlength + " (element:" + constkey + " / id:" + elem.id + ")";
                                        }
                                    } else {
                                        if (!schema[constkey][prop].nullable) {
                                            error += error !== "" ? "<br>" : "";
                                            error += "Property '" + prop + "' is not nullable (element:" + constkey + " / id:" + elem.id + ")";
                                        }
                                    }
                                }
                            } else {
                                error += error !== "" ? "<br>" : "";
                                error += "Property '" + prop + "' is not allowed (element:" + constkey + " / id:" + elem.id + ")";
                            }
                        }
                    }
                });
            });

            if (error !== "") {
                return when.reject(new Error(error));
            }
            // Import for the current version
            return dataImport(databaseVersion, importData);
        }).then(function importSuccess() {
            return apiNotifications.browse();
        }).then(function (notifications) {
            notification = {
                type: 'success',
                message: "Data imported. Log in with the user details you imported",
                status: 'persistent',
                id: 'per-' + (notifications.length + 1)
            };

            return apiNotifications.add(notification).then(function () {
                req.session.destroy();
                res.set({
                    "X-Cache-Invalidate": "/*"
                });
                res.redirect(config.paths().webroot + '/ghost/signin/');
            });
        }).otherwise(function importFailure(error) {
            return apiNotifications.browse().then(function (notifications) {
                // Notify of an error if it occurs
                notification = {
                    type: 'error',
                    message: error.message || error,
                    status: 'persistent',
                    id: 'per-' + (notifications.length + 1)
                };

                return apiNotifications.add(notification).then(function () {
                    res.redirect(debugPath);
                });
            });
        });
    }
};

module.exports = db;