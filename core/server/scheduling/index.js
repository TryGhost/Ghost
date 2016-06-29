var postScheduling = require(__dirname + '/post-scheduling'),
    newsletterScheduling = require(__dirname + '/newsletter-scheduling');

/**
 * scheduling modules:
 *   - post scheduling: publish posts/pages when scheduled
 *   - newsletter scheduling: send newsletter periodically
 */
exports.init = function init(options) {
    options = options || {};
    
    return postScheduling.init(options)
        .then(function () {
            return newsletterScheduling.init(options);
        });
};
