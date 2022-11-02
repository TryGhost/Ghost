const _ = require('lodash');
const semver = require('semver');
const {IncorrectUsageError} = require('@tryghost/errors');
const models = require('../../../../models');
const PostsImporter = require('./posts');
const TagsImporter = require('./tags');
const SettingsImporter = require('./settings');
const UsersImporter = require('./users');
const NewslettersImporter = require('./newsletters');
const ProductsImporter = require('./products');
const StripeProductsImporter = require('./stripe-products');
const StripePricesImporter = require('./stripe-prices');
const CustomThemeSettingsImporter = require('./custom-theme-settings');
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
        importers.custom_theme_settings = new CustomThemeSettingsImporter(importData.data);

        return importData;
    },

    // Allow importing with an options object that is passed through the importer
    doImport: async function doImport(importData, importOptions) {
        importOptions = importOptions || {};

        let errors = [];

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

        await models.Base.transaction(async (transacting) => {
            modelOptions.transacting = transacting;

            for (const importer of Object.values(importers)) {
                try {
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
                } catch (_errors) {
                    errors.push(..._errors);
                }
            }

            const importedStripePrices = importers.stripe_prices.importedData;
            const importedProducts = importers.products.importedData;

            for (const importedProduct of importedProducts) {
                for (const field of ['monthly_price_id', 'yearly_price_id']) {
                    const mappedPrice = _.find(importedStripePrices, {originalId: importedProduct[field]});
                    if (mappedPrice) {
                        await models.Product.edit({[field]: mappedPrice.id}, {id: importedProduct.id, transacting});
                    }
                }
            }
        });

        if (errors.length > 0) {
            throw errors;
        }

        const toReturn = {
            data: {},
            originalData: importData.data,
            problems: []
        };

        for (const importer of Object.values(importers)) {
            toReturn.problems = toReturn.problems.concat(importer.problems);

            if (importOptions.returnImportedData) {
                toReturn.data[importer.dataKeyToImport] = importer.importedDataToReturn;
            }
        }

        importers = {};

        return toReturn;
    }
};

module.exports = DataImporter;
