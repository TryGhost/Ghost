// # Slack API
// API for sending Test Notifications to Slack
var Promise = require('bluebird'),
    common = require('../lib/common'),
    slack;

/**
 * ## Slack API Method
 *
 * **See:** [API Methods](index.js.html#api%20methods)
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
    sendTest: function () {
        common.events.emit('slack.test');
        return Promise.resolve();
    }
};

module.exports = slack;
