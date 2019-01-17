var _ = require('lodash'),
    Promise = require('bluebird'),
    semver = require('semver'),
    common = require('../../../../lib/common'),
    debug = require('ghost-ignition').debug('importer:data'),
    sequence = require('../../../../lib/promise/sequence'),
    models = require('../../../../models'),
    SubscribersImporter = require('./subscribers'),
    PostsImporter = require('./posts'),
    TagsImporter = require('./tags'),
    SettingsImporter = require('./settings'),
    ClientsImporter = require('./clients'),
    TrustedDomainsImporter = require('./trusted-domains'),
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
        importers.users = new UsersImporter(importData.data);
        importers.roles = new RolesImporter(importData.data);
        importers.tags = new TagsImporter(importData.data);
        importers.subscribers = new SubscribersImporter(importData.data);
        importers.posts = new PostsImporter(importData.data);
        importers.settings = new SettingsImporter(importData.data);
        importers.clients = new ClientsImporter(importData.data);
        importers.trustedDomains = new TrustedDomainsImporter(importData.data);

        return importData;
    },

    // Allow importing with an options object that is passed through the importer
    doImport: function doImport(importData, importOptions) {
        importOptions = importOptions || {};

        var ops = [], errors = [], results = [], modelOptions = {
            importing: true,
            context: {
                internal: true
            }
        };

        if (!importOptions.hasOwnProperty('returnImportedData')) {
            importOptions.returnImportedData = false;
        }

        if (importOptions.importPersistUser) {
            modelOptions.importPersistUser = importOptions.importPersistUser;
        }

        if (!importData.meta) {
            throw new common.errors.IncorrectUsageError({
                message: 'Wrong importer structure. `meta` is missing.',
                help: 'https://docs.ghost.org/api/migration/#json-file-structure'
            });
        }

        if (!importData.meta.version) {
            throw new common.errors.IncorrectUsageError({
                message: 'Wrong importer structure. `meta.version` is missing.',
                help: 'https://docs.ghost.org/api/migration/#json-file-structure'
            });
        }

        // CASE: We deny LTS imports, because these are two major version jumps. We only support previous (v1) and latest (v2).
        //       We can detect a wrong structure by checking the meta version field. Ghost v0 doesn't use semver compliant versions.
        //       Same applies to WP exports. It currently uses the same meta version notation (000) - https://github.com/TryGhost/wp-ghost-exporter/issues/12
        if (!semver.valid(importData.meta.version)) {
            return Promise.reject(new common.errors.InternalServerError({
                message: 'Detected unsupported file structure.',
                context: 'Please install Ghost 1.0, import the file and then update your blog to Ghost 2.0.\nVisit https://docs.ghost.org/faq/upgrade-to-ghost-1-0 or ask for help in our https://forum.ghost.org.'
            }));
        }

        this.init(importData);

        return models.Base.transaction(function (transacting) {
            modelOptions.transacting = transacting;

            _.each(importers, function (importer) {
                ops.push(function doModelImport() {
                    return importer.fetchExisting(modelOptions, importOptions)
                        .then(function () {
                            return importer.beforeImport(modelOptions, importOptions);
                        })
                        .then(function () {
                            if (importer.options.requiredImportedData.length) {
                                _.each(importer.options.requiredImportedData, (key) => {
                                    importer.requiredImportedData[key] = importers[key].importedData;
                                });
                            }

                            if (importer.options.requiredExistingData.length) {
                                _.each(importer.options.requiredExistingData, (key) => {
                                    importer.requiredExistingData[key] = importers[key].existingData;
                                });
                            }

                            return importer.replaceIdentifiers(modelOptions, importOptions);
                        })
                        .then(function () {
                            return importer.doImport(modelOptions, importOptions)
                                .then(function (_results) {
                                    results = results.concat(_results);
                                });
                        });
                });
            });

            sequence(ops)
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

                if (importOptions.returnImportedData) {
                    toReturn.data[importer.dataKeyToImport] = importer.importedDataToReturn;
                }
            });

            return toReturn;
        }).catch(function (errors) {
            debug(errors);
            return Promise.reject(errors);
        }).finally(() => {
            // release memory
            importers = {};
            results = null;
            importData = null;
        });
    }
};

module.exports = DataImporter;
