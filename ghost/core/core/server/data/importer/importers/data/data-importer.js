const _ = require('lodash');
const ObjectId = require('bson-objectid').default;
const semver = require('semver');
const {IncorrectUsageError} = require('@tryghost/errors');
const debug = require('@tryghost/debug')('importer:data');
const {sequence} = require('@tryghost/promise');
const models = require('../../../../models');
const PostsImporter = require('./PostsImporter');
const TagsImporter = require('./TagsImporter');
const SettingsImporter = require('./SettingsImporter');
const UsersImporter = require('./UsersImporter');
const NewslettersImporter = require('./NewslettersImporter');
const ProductsImporter = require('./ProductsImporter');
const StripeProductsImporter = require('./StripeProductsImporter');
const StripePricesImporter = require('./StripePricesImporter');
const CustomThemeSettingsImporter = require('./CustomThemeSettingsImporter');
const RevueSubscriberImporter = require('./RevueSubscriberImporter');
const RolesImporter = require('./RolesImporter');
const {slugify} = require('@tryghost/string/lib');

let importers = {};
let DataImporter;

DataImporter = {
    type: 'data',

    preProcess: function preProcess(importData) {
        debug('preProcess');
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
        importers.custom_theme_settings = new CustomThemeSettingsImporter(importData.data);
        importers.revue_subscribers = new RevueSubscriberImporter(importData.data);

        return importData;
    },

    // Allow importing with an options object that is passed through the importer
    doImport: async function doImport(importData, importOptions) {
        debug('doImport');
        importOptions = importOptions || {};

        if (importOptions.importTag && importData?.data?.posts) {
            const tagId = ObjectId().toHexString();
            if (!('tags' in importData.data)) {
                importData.data.tags = [];
            }
            importData.data.tags.push({
                id: tagId,
                name: importOptions.importTag,
                slug: slugify(importOptions.importTag.replace(/^#/, 'hash-'))
            });
            if (!('posts_tags' in importData.data)) {
                importData.data.posts_tags = [];
            }
            for (const post of importData.data.posts) {
                if (!('id' in post)) {
                    // Make sure post has an id if it doesn't already
                    post.id = ObjectId().toHexString();
                }
                importData.data.posts_tags.push({
                    post_id: post.id,
                    tag_id: tagId
                });
            }
        }

        const ops = [];
        let problems = [];
        let errors = [];
        let importedData = {};

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

        return models.Base.transaction(async function (transacting) {
            modelOptions.transacting = transacting;

            _.each(importers, function (importer) {
                ops.push(async function doModelImport() {
                    await importer.fetchExisting(modelOptions, importOptions);
                    await importer.beforeImport(modelOptions, importOptions);

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

                    await importer.replaceIdentifiers(modelOptions, importOptions);
                    await importer.doImport(modelOptions, importOptions);

                    errors = errors.concat(importer.errors);
                    problems = problems.concat(importer.problems);
                    if (importOptions.returnImportedData) {
                        importedData[importer.dataKeyToImport] = importer.importedDataToReturn;
                    }
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

            await sequence(ops);

            // Errors preventing import:
            if (errors.length > 0) {
                debug(errors);
                throw errors;
            }

            return {
                data: importedData,
                originalData: importData.data,
                problems: problems
            };
        });
    }
};

module.exports = DataImporter;
