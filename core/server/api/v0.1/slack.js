// # Slack API
// API for sending Test Notifications to Slack
const Promise = require('bluebird'),
    common = require('../../lib/common');

let slack;

/**
 * ## Slack API Method
 *
 * **See:** [API Methods](constants.js.html#api%20methods)
 * @typedef Slack
 * @param slack
 */
slack = {
    /**
     * ### SendTest
     * Send a test notification
     *
     * @public
     */
    sendTest() {
        common.events.emit('slack.test');
        return Promise.resolve();
    }
};

module.exports = slack;
