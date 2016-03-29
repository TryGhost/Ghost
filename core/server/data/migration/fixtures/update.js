// # Update Fixtures
// This module handles updating fixtures.
// This is done manually, through a series of files stored in an adjacent folder
// E.g. if we update to version 004, all the tasks in /004/ are executed

var sequence     = require('../../../utils/sequence'),
    versioning   = require('../../schema').versioning,
    fixtureUtils = require('./utils'),

    // Public
    update;

/**
 * ## Update
 * Handles doing subsequent updates for versions
 *
 * @param {Array} versions
 * @param {{info: logger.info, warn: logger.warn}} logger
 * @returns {Promise<*>}
 */
update = function update(versions, logger) {
    logger.info('Running fixture updates');

    var ops = versions.reduce(function updateToVersion(ops, version) {
        var tasks = versioning.getUpdateFixturesTasks(version, logger);

        if (tasks && tasks.length > 0) {
            ops.push(function runVersionTasks() {
                logger.info('Updating fixtures to ' + version);
                return sequence(tasks, fixtureUtils.modelOptions, logger);
            });
        }

        return ops;
    }, []);

    return sequence(ops, fixtureUtils.modelOptions, logger);
};

module.exports = update;
