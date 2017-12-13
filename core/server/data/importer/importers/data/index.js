var _ = require('lodash'),
    Promise = require('bluebird'),
    models = require('../../../../models'),
    globalUtils = require('../../../../utils'),
    SubscribersImporter = require('./subscribers'),
    PostsImporter = require('./posts'),
    TagsImporter = require('./tags'),
    SettingsImporter = require('./settings'),
    UsersImporter = require('./users'),
    RolesImporter = require('./roles'),
    importers = {},
    DataImporter;

DataImporter = {
    type: 'data',

    preProcess: function preProcess(importData) {
        importData.preProcessedByData = true;
        return importData;
    },

    init: function init(importData) {
        importers.roles = new RolesImporter(importData.data);
        importers.tags = new TagsImporter(importData.data);
        importers.users = new UsersImporter(importData.data);
        importers.subscribers = new SubscribersImporter(importData.data);
        importers.posts = new PostsImporter(importData.data);
        importers.settings = new SettingsImporter(importData.data);

        return importData;
    },

    // Allow importing with an options object that is passed through the importer
    doImport: function doImport(importData, importOptions) {
        var ops = [], errors = [], results = [], modelOptions = {
            importing: true,
            context: {
                internal: true
            }
        };

        if (importOptions && importOptions.importPersistUser) {
            modelOptions.importPersistUser = importOptions.importPersistUser;
        }
        this.init(importData);

        return models.Base.transaction(function (transacting) {
            modelOptions.transacting = transacting;

            _.each(importers, function (importer) {
                ops.push(function doModelImport() {
                    return importer.beforeImport(modelOptions, importOptions)
                        .then(function () {
                            return importer.doImport(modelOptions)
                                .then(function (_results) {
                                    results = results.concat(_results);
                                });
                        });
                });
            });

            _.each(importers, function (importer) {
                ops.push(function afterImport() {
                    return importer.afterImport(modelOptions);
                });
            });

            globalUtils.sequence(ops)
                .then(function () {
                    results.forEach(function (promise) {
                        if (!promise.isFulfilled()) {
                            errors = errors.concat(promise.reason());
                        }
                    });

                    if (errors.length === 0) {
                        transacting.commit();
                    } else {
                        transacting.rollback(errors);
                    }
                });
        }).then(function () {
            /**
             * data: imported data
             * originalData: data from the json file
             * problems: warnings
             */
            var toReturn = {
                data: {},
                originalData: importData.data,
                problems: []
            };

            _.each(importers, function (importer) {
                toReturn.problems = toReturn.problems.concat(importer.problems);
                toReturn.data[importer.dataKeyToImport] = importer.importedData;
            });

            return toReturn;
        }).catch(function (errors) {
            return Promise.reject(errors);
        });
    }
};

module.exports = DataImporter;
