/**
 * This overrides file should be used for all tests that use the DB
 */

module.exports = require('./overrides');

/**
 * Global Setup
 * Guaranteed to only ever run once regardless of whether
 * mocha is run in serial or parallel
 */
module.exports.mochaGlobalSetup = async function () {
    // Actually delete the database so we start afresh
    // This protects against DB errors after an aborted test run
    // This technically only needs to happen before DB-related tests
    await require('./db-utils').destroy();
};
