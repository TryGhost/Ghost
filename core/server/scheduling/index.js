var postScheduling = require(__dirname + '/post-scheduling');

/**
 * scheduling modules:
 *   - post scheduling: publish posts/pages when scheduled
 */
exports.init = function init(options) {
    options = options || {};

    return postScheduling.init(options);
};
