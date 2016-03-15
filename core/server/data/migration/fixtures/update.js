// # Update Fixtures
// This module handles updating fixtures.
// This is done manually, through a series of files stored in an adjacent folder
// E.g. if we update to version 004, all the tasks in /004/ are executed

var sequence = require('../../../utils/sequence'),

    // Private
    getVersionTasks,
    modelOptions = {context: {internal: true}},

    // Public
    update;

/**
 * ### Get Version Tasks
 * Tries to require a directory matching the version number
 *
 * This was split from update to make testing easier
 *
 * @param {String} version
 * @param {Function} logInfo
 * @returns {Array}
 */
getVersionTasks = function getVersionTasks(version, logInfo) {
    var tasks = [];

    try {
        tasks = require('./' + version);
    } catch (e) {
        logInfo('No fixture updates found for version', version);
    }

    return tasks;
};

/**
 * ## Update
 * Handles doing subsequent updates for versions
 *
 * @param {Array} versions
 * @param {Function} logInfo
 * @returns {Promise<*>}
 */
update = function update(versions, logInfo) {
    var ops = [];

    logInfo('Updating fixtures');

    versions.forEach(function (version) {
        var tasks = getVersionTasks(version, logInfo);

        if (tasks && tasks.length > 0) {
            ops.push(function () {
                logInfo('Updating fixtures to', version);
                return sequence(require('./' + version), modelOptions, logInfo);
            });
        }
    });

    return sequence(ops, modelOptions, logInfo);
};

module.exports = update;
