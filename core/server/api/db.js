var Ghost         = require('../../ghost'),
    dataExport    = require('../data/export'),
    dataImport    = require('../data/import'),
    api           = require('../api'),
    fs            = require('fs-extra'),
    path          = require('path'),
    when          = require('when'),
    nodefn        = require('when/node/function'),
    _             = require('underscore'),

    ghost         = new Ghost(),
    db;

db = {
    export: function (req, res) {
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
            var notification = {
                type: 'error',
                message: error.message || error,
                status: 'persistent',
                id: 'per-' + (ghost.notifications.length + 1)
            };

            return api.notifications.add(notification).then(function () {
                res.redirect('/ghost/debug/');
            });
        });
    },
    import: function (req, res) {

        if (!req.files.importfile || req.files.importfile.size === 0 || req.files.importfile.name.indexOf('json') === -1) {
            /**
             * Notify of an error if it occurs
             *
             * - If there's no file (although if you don't select anything, the input is still submitted, so
             *   !req.files.importfile will always be false)
             * - If the size is 0
             * - If the name doesn't have json in it
             */
            var notification = {
                type: 'error',
                message:  "Must select a .json file to import",
                status: 'persistent',
                id: 'per-' + (ghost.notifications.length + 1)
            };

            return api.notifications.add(notification).then(function () {
                res.redirect('/ghost/debug/');
            });
        }

        // Get the current version for importing
        api.settings.read({ key: 'databaseVersion' })
            .then(function (setting) {
                return when(setting.value);
            }, function () {
                return when('001');
            })
            .then(function (databaseVersion) {
                // Read the file contents
                return nodefn.call(fs.readFile, req.files.importfile.path)
                    .then(function (fileContents) {
                        var importData,
                            error = "",
                            constraints = require('../data/migration/' + databaseVersion).constraints,
                            constraintkeys = _.keys(constraints);

                        // Parse the json data
                        try {
                            importData = JSON.parse(fileContents);
                        } catch (e) {
                            return when.reject(new Error("Failed to parse the import file"));
                        }

                        if (!importData.meta || !importData.meta.version) {
                            return when.reject(new Error("Import data does not specify version"));
                        }

                        _.each(constraintkeys, function (constkey) {
                            _.each(importData.data[constkey], function (elem) {
                                var prop;
                                for (prop in elem) {
                                    if (elem.hasOwnProperty(prop)) {
                                        if (constraints[constkey].hasOwnProperty(prop)) {
                                            if (elem.hasOwnProperty(prop)) {
                                                if (!_.isNull(elem[prop])) {
                                                    if (elem[prop].length > constraints[constkey][prop].maxlength) {
                                                        error += error !== "" ? "<br>" : "";
                                                        error += "Property '" + prop + "' exceeds maximum length of " + constraints[constkey][prop].maxlength + " (element:" + constkey + " / id:" + elem.id + ")";
                                                    }
                                                } else {
                                                    if (!constraints[constkey][prop].nullable) {
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
                    });
            })
            .then(function importSuccess() {
                var notification = {
                    type: 'success',
                    message: "Data imported. Log in with the user details you imported",
                    status: 'persistent',
                    id: 'per-' + (ghost.notifications.length + 1)
                };

                return api.notifications.add(notification).then(function () {
                    delete req.session.user;
                    res.set({
                        "X-Cache-Invalidate": "/*"
                    });
                    res.redirect('/ghost/signin/');
                });

            }, function importFailure(error) {
                // Notify of an error if it occurs
                var notification = {
                    type: 'error',
                    message: error.message || error,
                    status: 'persistent',
                    id: 'per-' + (ghost.notifications.length + 1)
                };

                return api.notifications.add(notification).then(function () {
                    res.redirect('/ghost/debug/');
                });
            });
    },
};

module.exports.db = db;