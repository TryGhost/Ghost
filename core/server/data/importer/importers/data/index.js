var _ = require('lodash'),
    Promise = require('bluebird'),
    models = require('../../../../models'),
    utils = require('../../../../utils'),
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

    doImport: function doImport(importData) {
        var ops = [], errors = [], results = [], options = {
            importing: true,
            context: {
                internal: true
            }
        };

        this.init(importData);

        return models.Base.transaction(function (transacting) {
            options.transacting = transacting;

            _.each(importers, function (importer) {
                ops.push(function doModelImport() {
                    return importer.beforeImport(options)
                        .then(function () {
                            return importer.doImport(options)
                                .then(function (_results) {
                                    results = results.concat(_results);
                                });
                        });
                });
            });

            _.each(importers, function (importer) {
                ops.push(function afterImport() {
                    return importer.afterImport(options);
                });
            });

            utils.sequence(ops)
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
