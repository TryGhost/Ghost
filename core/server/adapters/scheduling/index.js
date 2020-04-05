const postScheduling = require('./post-scheduling');

/**
 * @description Initialise all scheduler modules.
 *
 * We currently only support post-scheduling: publish posts/pages when scheduled.
 *
 * @param {Object} options
 * @param {string} options.apiUrl - Target Ghost API url
 */
exports.init = function init(options) {
    return postScheduling.init(options);
};
