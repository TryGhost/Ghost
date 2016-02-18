// # Mail API
// API for sending Mail
var _             = require('lodash').runInContext(),
    Promise       = require('bluebird'),
    pipeline      = require('../utils/pipeline'),
    config        = require('../config'),
    errors        = require('../errors'),
    GhostMail     = require('../mail'),
    Models        = require('../models'),
    utils         = require('./utils'),
    notifications = require('./notifications'),
    path          = require('path'),
    fs            = require('fs'),
    templatesDir  = path.resolve(__dirname, '..', 'mail', 'templates'),
    htmlToText    = require('html-to-text'),
    readFile      = Promise.promisify(fs.readFile),
    docName       = 'mail',
    i18n          = require('../i18n'),
    mode          = process.env.NODE_ENV,
    testing       = mode !== 'production' && mode !== 'development',
    mailer,
    mail;

_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

/**
 * Send mail helper
 */

function sendMail(object) {
    if (!(mailer instanceof GhostMail) || testing) {
        mailer = new GhostMail();
    }

    return mailer.send(object.mail[0].message).catch(function (err) {
        if (mailer.state.usingDirect) {
            notifications.add({notifications: [{
                type: 'warn',
                message: [
                    i18n.t('warnings.index.unableToSendEmail'),
                    i18n.t('common.seeLinkForInstructions',
                    {link: '<a href=\'http://support.ghost.org/mail\' target=\'_blank\'>http://support.ghost.org/mail</a>'})
                ].join(' ')
            }]}, {context: {internal: true}});
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
mail = {
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
            return mail.generateContent({template: 'test'}).then(function (content) {
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
    },

    /**
     *
     * @param {Object} options {
     *              data: JSON object representing the data that will go into the email
     *              template: which email template to load (files are stored in /core/server/mail/templates/)
     *          }
     * @returns {*}
     */
    generateContent: function (options) {
        var defaults,
            data;

        defaults = {
            siteUrl: config.forceAdminSSL ? (config.urlSSL || config.url) : config.url
        };

        data = _.defaults(defaults, options.data);

        // read the proper email body template
        return readFile(path.join(templatesDir, options.template + '.html'), 'utf8').then(function (content) {
            var compiled,
                htmlContent,
                textContent;

            // insert user-specific data into the email
            compiled = _.template(content);
            htmlContent = compiled(data);

            // generate a plain-text version of the same email
            textContent = htmlToText.fromString(htmlContent);

            return {
                html: htmlContent,
                text: textContent
            };
        });
    }
};

module.exports = mail;
