// # Update Fixtures
// This module handles updating fixtures.
// This is done manually, through a series of files stored in an adjacent folder
// E.g. if we update to version 004, all the tasks in /004/ are executed

var sequence = require('../../../utils/sequence'),
    versioning = require('../../schema').versioning,

    // Private
    modelOptions = {context: {internal: true}},

    // Public
    update;

/**
 * ## Update
 * Handles doing subsequent updates for versions
 *
 * @param {Array} versions
 * @param {Function} logInfo
 * @returns {Promise<*>}
 */
update = function update(versions, logInfo) {
    logInfo('Updating fixtures');

    var ops = versions.reduce(function updateToVersion(ops, version) {
        var tasks = versioning.getUpdateFixturesTasks(version, logInfo);

        if (tasks && tasks.length > 0) {
            ops.push(function runVersionTasks() {
                logInfo('Updating fixtures to ', version);
                return sequence(tasks, modelOptions, logInfo);
            });
        }

        return ops;
    }, []);

    return sequence(ops, modelOptions, logInfo);
};

module.exports = update;
