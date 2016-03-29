// # Mail API
// API for sending Mail
var _             = require('lodash').runInContext(),
    Promise       = require('bluebird'),
    pipeline      = require('../utils/pipeline'),
    config        = require('../config'),
    errors        = require('../errors'),
    GhostMail     = require('../mail'),
    Models        = require('../models'),
    notifications = require('./notifications'),
    path          = require('path'),
    fs            = require('fs'),
    templatesDir  = path.resolve(__dirname, '..', 'mail', 'templates'),
    htmlToText    = require('html-to-text'),
    readFile      = Promise.promisify(fs.readFile),
    i18n          = require('../i18n'),
    mode          = process.env.NODE_ENV,
    testing       = mode !== 'production' && mode !== 'development',
    slack;

/**
 * ## Mail API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 * @typedef Mail
 * @param mail
 */
slack = {
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

module.exports = slack;
