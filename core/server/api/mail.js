// # Mail API
// API for sending Mail

var Promise       = require('bluebird'),
    pipeline      = require('../utils/pipeline'),
    errors        = require('../errors'),
    mail          = require('../mail'),
    Models        = require('../models'),
    utils         = require('./utils'),
    notifications = require('./notifications'),
    docName       = 'mail',
    i18n          = require('../i18n'),
    mode          = process.env.NODE_ENV,
    testing       = mode !== 'production' && mode !== 'development',
    mailer,
    apiMail;

/**
 * Send mail helper
 */
function sendMail(object) {
    if (!(mailer instanceof mail.GhostMailer) || testing) {
        mailer = new mail.GhostMailer();
    }

    return mailer.send(object.mail[0].message).catch(function (err) {
        if (mailer.state.usingDirect) {
            notifications.add(
                {notifications: [{
                    type: 'warn',
                    message: [
                        i18n.t('warnings.index.unableToSendEmail'),
                        i18n.t('common.seeLinkForInstructions',
                            {link: '<a href=\'https://docs.ghost.org/v0.11.9/docs/mail-config\' target=\'_blank\'>https://docs.ghost.org/v0.11.9/docs/mail-config</a>'})
                    ].join(' ')
                }]},
                {context: {internal: true}}
            );
        }

        return Promise.reject(new errors.EmailError(err.message));
    });
}

/**
 * ## Mail API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 * @typedef Mail
 * @param mail
 */
apiMail = {
    /**
     * ### Send
     * Send an email
     *
     * @public
     * @param {Mail} object details of the email to send
     * @returns {Promise}
     */
    send: function (object, options) {
        var tasks;

        /**
         * ### Format Response
         * @returns {Mail} mail
         */

        function formatResponse(data) {
            delete object.mail[0].options;
            // Sendmail returns extra details we don't need and that don't convert to JSON
            delete object.mail[0].message.transport;
            object.mail[0].status = {
                message: data.message
            };

            return object;
        }

        /**
         * ### Send Mail
         */

        function send() {
            return sendMail(object, options);
        }

        tasks = [
            utils.handlePermissions(docName, 'send'),
            send,
            formatResponse
        ];

        return pipeline(tasks, options || {});
    },

    /**
     * ### SendTest
     * Send a test email
     *
     * @public
     * @param {Object} options required property 'to' which contains the recipient address
     * @returns {Promise}
     */
    sendTest: function (options) {
        var tasks;

        /**
         * ### Model Query
         */

        function modelQuery() {
            return Models.User.findOne({id: options.context.user});
        }

        /**
         * ### Generate content
         */

        function generateContent(result) {
            return mail.utils.generateContent({template: 'test'}).then(function (content) {
                var payload = {
                    mail: [{
                        message: {
                            to: result.get('email'),
                            subject: i18n.t('common.api.mail.testGhostEmail'),
                            html: content.html,
                            text: content.text
                        }
                    }]
                };

                return payload;
            });
        }

        /**
         * ### Send mail
         */

        function send(payload) {
            return sendMail(payload, options);
        }

        tasks = [
            modelQuery,
            generateContent,
            send
        ];

        return pipeline(tasks);
    }
};

module.exports = apiMail;
