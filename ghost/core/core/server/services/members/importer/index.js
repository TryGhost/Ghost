const MembersCSVImporter = require('./members-csv-importer');
const MembersCSVImporterStripeUtils = require('./members-csv-importer-stripe-utils');
const jobQueue = require('../../jobs/queue').default;
const ProcessMemberImportJob = require('./jobs/process-member-import-job').default;

/**
 * @typedef {import('./members-csv-importer').MembersCSVImporterOptions} MembersCSVImporterOptions
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

    const importer = new MembersCSVImporter({
        ...deps,
        stripeUtils
    });

    // Register the ProcessMemberImportJob handler against the importer Ghost
    // just built.
    // Own pool: a big CSV import can run for hours and must not occupy the
    // default queue's slots, starving the recurring jobs that share them.
    jobQueue.handle(ProcessMemberImportJob, job => importer.runImportJob(job.data), {concurrency: 1});

    return importer;
};
