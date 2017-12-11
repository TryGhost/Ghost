// # Mail API
// API for sending Mail

var Promise = require('bluebird'),
    pipeline = require('../utils/pipeline'),
    apiUtils = require('./utils'),
    models = require('../models'),
    common = require('../lib/common'),
    mail = require('../mail'),
    notificationsAPI = require('./notifications'),
    docName = 'mail',
    mailer,
    apiMail;

/**
 * Send mail helper
 */
function sendMail(object) {
    if (!(mailer instanceof mail.GhostMailer)) {
        mailer = new mail.GhostMailer();
    }

    return mailer.send(object.mail[0].message).catch(function (err) {
        if (mailer.state.usingDirect) {
            notificationsAPI.add(
                {
                    notifications: [{
                        type: 'warn',
                        message: [
                            common.i18n.t('warnings.index.unableToSendEmail'),
                            common.i18n.t('common.seeLinkForInstructions',
                                {link: '<a href=\'https://docs.ghost.org/v1/docs/mail-config\' target=\'_blank\'>Checkout our mail configuration docs!</a>'})
                        ].join(' ')
                    }]
                },
                {context: {internal: true}}
            );
        }

        return Promise.reject(err);
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
            apiUtils.handlePermissions(docName, 'send'),
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
            return models.User.findOne({id: options.context.user});
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
                            subject: common.i18n.t('common.api.mail.testGhostEmail'),
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
