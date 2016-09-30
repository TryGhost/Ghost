// # Update Fixtures
// This module handles updating fixtures.
// This is done manually, through a series of files stored in an adjacent folder
// E.g. if we update to version 004, all the tasks in /004/ are executed

var Promise = require('bluebird'),
    _ = require('lodash'),
    sequence = function sequence(tasks, modelOptions, logger) {
        // utils/sequence.js does not offer an option to pass cloned arguments
        return Promise.reduce(tasks, function (results, task) {
            return task(_.cloneDeep(modelOptions), logger)
                .then(function (result) {
                    results.push(result);
                    return results;
                });
        }, []);
    },
    update;

/**
 * Handles doing subsequent update for one version
 */
update = function update(tasks, logger, modelOptions) {
    logger.info('Running fixture updates');

    if (!tasks.length) {
        logger.info('No fixture migration tasks found for this version');
        return Promise.resolve();
    }

    return sequence(tasks, modelOptions, logger);
};

module.exports = update;
