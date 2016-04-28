// # Slack API
// API for sending Test Notifications to Slack
var slackPing     = require('../data/slack/slack'),
    events        = require('../events'),
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
        console.log('sendTest called');
        var testMail = 'This is a testpost';
        events.emit('slack.testMail', testMail);
        // events.emit('post.published');
    }
};

module.exports = slack;
