var postScheduling = require('./post-scheduling'),
    subscribersScheduling = require('./subscribers-scheduling');

/**
 * scheduling modules:
 *   - post scheduling: publish posts/pages when scheduled
 */
exports.init = function init(options) {
    options = options || {};

    return postScheduling.init(options)
        .then(function () {
            return subscribersScheduling.init(options);
        });
};
