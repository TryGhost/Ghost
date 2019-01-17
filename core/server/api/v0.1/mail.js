// # Mail API
// API for sending Mail

const Promise = require('bluebird'),
    pipeline = require('../../lib/promise/pipeline'),
    localUtils = require('./utils'),
    models = require('../../models'),
    common = require('../../lib/common'),
    mail = require('../../services/mail'),
    notificationsAPI = require('./notifications'),
    docName = 'mail';

let mailer;

/**
 * Send mail helper
 */
function sendMail(object) {
    if (!(mailer instanceof mail.GhostMailer)) {
        mailer = new mail.GhostMailer();
    }

    return mailer.send(object.mail[0].message).catch((err) => {
        if (mailer.state.usingDirect) {
            notificationsAPI.add(
                {
                    notifications: [{
                        type: 'warn',
                        message: [
                            common.i18n.t('warnings.index.unableToSendEmail'),
                            common.i18n.t('common.seeLinkForInstructions', {link: 'https://docs.ghost.org/mail/'})
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
 * **See:** [API Methods](constants.js.html#api%20methods)
 * @typedef Mail
 * @param mail
 */
const apiMail = {
    /**
     * ### Send
     * Send an email
     *
     * @public
     * @param {Mail} object details of the email to send
     * @returns {Promise}
     */
    send(object, options) {
        let tasks;

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
            localUtils.handlePermissions(docName, 'send'),
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
    sendTest(options) {
        let tasks;

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
            return mail.utils.generateContent({template: 'test'}).then((content) => {
                const payload = {
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
