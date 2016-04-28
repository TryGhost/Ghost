// # Slack API
// API for sending Test Notifications to Slack
var events        = require('../events'),
    Promise       = require('bluebird'),
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
        var testMail = 'This is a testpost';
        events.emit('slack.testMail', testMail);
        return Promise.resolve();
    }
};

module.exports = slack;
