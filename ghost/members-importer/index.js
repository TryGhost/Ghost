const MembersCSVImporter = require('./lib/MembersCSVImporter');
const MembersCSVImporterStripeUtils = require('./lib/MembersCSVImporterStripeUtils');

/**
 * @typedef {import('./lib/MembersCSVImporter').MembersCSVImporterOptions} MembersCSVImporterOptions
 */

/**
 * @typedef {Object} MakeImporterDeps
 * @property {Object} stripeAPIService - Instance of StripeAPIService
 * @property {Object} productRepository - Instance of ProductRepository
 */

/**
 * Make an instance of MembersCSVImporter
 *
 * @param {MakeImporterDeps & MembersCSVImporterOptions} deps
 * @returns {MembersCSVImporter}
 */
module.exports = function makeImporter(deps) {
    const stripeUtils = new MembersCSVImporterStripeUtils({
        stripeAPIService: deps.stripeAPIService,
        productRepository: deps.productRepository
    });

    return new MembersCSVImporter({
        ...deps,
        stripeUtils
    });
};
