// # Mail API
// API for sending Mail
var _            = require('lodash'),
    when         = require('when'),
    config       = require('../config'),
    canThis      = require('../permissions').canThis,
    errors       = require('../errors'),
    path         = require('path'),
    fs           = require('fs'),
    templatesDir = path.resolve(__dirname, '..', 'email-templates'),
    htmlToText   = require('html-to-text'),
    mail;

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
        var mailer = require('../mail');

        return canThis(options.context).send.mail().then(function () {
            return mailer.send(object.mail[0].message)
                .then(function (data) {
                    delete object.mail[0].options;
                    // Sendmail returns extra details we don't need and that don't convert to JSON
                    delete object.mail[0].message.transport;
                    object.mail[0].status = {
                        message: data.message
                    };
                    return object;
                })
                .otherwise(function (error) {
                    return when.reject(new errors.EmailError(error.message));
                });

        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to send mail.'));
        });
    },

    /**
     * ### SendTest
     * Send a test email
     *
     * @public
     * @param {Object} required property 'to' which contains the recipient address
     * @returns {Promise}
     */
    sendTest: function (options) {
        var user = require('../models/user').User;

        return user.findOne({id: options.context.user}).then(function (result) {
            return mail.generateContent({template: 'test'}).then(function (emailContent) {
                var payload = {mail: [{
                    message: {
                        to: result.get('email'),
                        subject: 'Test Ghost Email',
                        html: emailContent.html,
                        text: emailContent.text
                    }
                }]};
                return mail.send(payload, options);
            });
        }, function () {
            return when.reject(new errors.NotFoundError('Could not find the current user'));
        });
    },

    /**
     *
     * @param {
     *              data: JSON object representing the data that will go into the email
     *              template: which email template to load (files are stored in /core/server/email-templates/)
     *          }
     * @returns {*}
     */
    generateContent: function (options) {

        var defaultData = {
                siteUrl: config.forceAdminSSL ? (config.urlSSL || config.url) : config.url
            },
            emailData = _.defaults(defaultData, options.data);

        _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

        //read the proper email body template
        return when.promise(function (resolve, reject) {
            fs.readFile(templatesDir + '/' + options.template + '.html', {encoding: 'utf8'}, function (err, fileContent) {
                if (err) {
                    reject(err);
                }

                //insert user-specific data into the email
                var htmlContent = _.template(fileContent, emailData),
                    textContent;

                //generate a plain-text version of the same email
                textContent = htmlToText.fromString(htmlContent);

                resolve({
                    html: htmlContent,
                    text: textContent
                });

            });
        });

    }
};

module.exports = mail;
