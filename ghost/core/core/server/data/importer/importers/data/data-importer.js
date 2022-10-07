const _ = require('lodash');
const Promise = require('bluebird');
const semver = require('semver');
const {IncorrectUsageError} = require('@tryghost/errors');
const debug = require('@tryghost/debug')('importer:data');
const {sequence} = require('@tryghost/promise');
const models = require('../../../../models');
const PostsImporter = require('./posts');
const TagsImporter = require('./tags');
const SettingsImporter = require('./settings');
const UsersImporter = require('./users');
const NewslettersImporter = require('./newsletters');
const ProductsImporter = require('./products');
const StripeProductsImporter = require('./stripe-products');
const StripePricesImporter = require('./stripe-prices');
const RolesImporter = require('./roles');
let importers = {};
let DataImporter;

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
        importers.newsletters = new NewslettersImporter(importData.data);
        importers.settings = new SettingsImporter(importData.data);
        importers.products = new ProductsImporter(importData.data);
        importers.stripe_products = new StripeProductsImporter(importData.data);
        importers.stripe_prices = new StripePricesImporter(importData.data);
        importers.posts = new PostsImporter(importData.data);

        return importData;
    },

    // Allow importing with an options object that is passed through the importer
    doImport: function doImport(importData, importOptions) {
        importOptions = importOptions || {};

        const ops = [];
        let errors = [];
        let results = [];

        const modelOptions = {
            importing: true,
            context: {
                internal: true
            }
        };

        if (!Object.prototype.hasOwnProperty.call(importOptions, 'returnImportedData')) {
            importOptions.returnImportedData = false;
        }

        if (importOptions.importPersistUser) {
            modelOptions.importPersistUser = importOptions.importPersistUser;
        }

        if (!importData.meta) {
            return Promise.reject(new IncorrectUsageError({
                message: 'Wrong importer structure. `meta` is missing.',
                help: 'https://ghost.org/docs/migration/custom/'
            }));
        }

        if (!importData.meta.version) {
            return Promise.reject(new IncorrectUsageError({
                message: 'Wrong importer structure. `meta.version` is missing.',
                help: 'https://ghost.org/docs/migration/custom/'
            }));
        }

        // CASE: We deny LTS imports, because these are major version jumps. Only imports from v1 until the latest are supported.
        //       We can detect a wrong structure by checking the meta version field. Ghost v0 doesn't use semver compliant versions.
        if (!semver.valid(importData.meta.version)) {
            return Promise.reject(new IncorrectUsageError({
                message: 'Detected unsupported file structure.',
                help: 'Please install Ghost 1.0, import the file and then update your blog to the latest Ghost version.\nVisit https://ghost.org/docs/update/ or ask for help in our https://forum.ghost.org.'
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

            /**
             * @TODO: figure out how to fix this properly
             * fixup the circular reference from
             * stripe_prices -> stripe_products -> products -> stripe_prices
             *
             * Note: the product importer validates that all values are either
             *   - being imported, or
             *   - already exist in the db
             * so we only need to map imported products
             */
            ops.push(() => {
                const importedStripePrices = importers.stripe_prices.importedData;
                const importedProducts = importers.products.importedData;
                const productOps = [];

                _.forEach(importedProducts, (importedProduct) => {
                    return _.forEach(['monthly_price_id', 'yearly_price_id'], (field) => {
                        const mappedPrice = _.find(importedStripePrices, {originalId: importedProduct[field]});
                        if (mappedPrice) {
                            productOps.push(() => {
                                return models.Product.edit({[field]: mappedPrice.id}, {id: importedProduct.id, transacting});
                            });
                        }
                    });
                });

                return sequence(productOps);
            });

            return sequence(ops)
                .then(function () {
                    results.forEach(function (promise) {
                        if (!promise.isFulfilled()) {
                            errors = errors.concat(promise.reason());
                        }
                    });

                    if (errors.length === 0) {
                        return;
                    } else {
                        throw errors;
                    }
                });
        }).then(function () {
            /**
             * data: imported data
             * originalData: data from the json file
             * problems: warnings
             */
            const toReturn = {
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
        }).catch(function (err) {
            debug(err);
            return Promise.reject(err);
        }).finally(() => {
            // release memory
            importers = {};
            results = null;
            importData = null;
        });
    }
};

module.exports = DataImporter;
