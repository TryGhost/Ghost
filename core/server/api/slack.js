// # Slack API
// API for sending Test Notifications to Slack
var slackPing     = require('../data/slack/slack'),
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
        slackPing._ping({});
    }
};

module.exports = slack;
