// # Update Fixtures
// This module handles updating fixtures.
// This is done manually, through a series of files stored in an adjacent folder
// E.g. if we update to version 004, all the tasks in /004/ are executed

var Promise = require('bluebird'),
    sequence = require('../../../utils/sequence'),
    update;

/**
 * Handles doing subsequent update for one version
 */
update = function update(tasks, logger, modelOptions) {
    logger.info('Running fixture updates');

    if (!tasks.length) {
        return Promise.resolve();
    }

    return sequence(tasks, modelOptions, logger);
};

module.exports = update;
