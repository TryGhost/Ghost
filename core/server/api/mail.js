// # Mail API
// API for sending Mail
var when       = require('when'),
    config     = require('../config'),
    canThis    = require('../permissions').canThis,
    errors     = require('../errors'),
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
    sendTest: function (object, options) {
        var html = '<p><strong>Hello there!</strong></p>' +
            '<p>Excellent!' +
            ' You\'ve successfully setup your email config for your Ghost blog over on ' + config.url + '</p>' +
            '<p>If you hadn\'t, you wouldn\'t be reading this email, but you are, so it looks like all is well :)</p>' +
            '<p>xoxo</p>' +
            '<p>Team Ghost<br>' +
            '<a href="https://ghost.org">https://ghost.org</a></p>',

            payload = {mail: [{
                message: {
                    to: object.to,
                    subject: 'Test Ghost Email',
                    html: html
                }
            }]};

        return mail.send(payload, options);
    }
};

module.exports = mail;