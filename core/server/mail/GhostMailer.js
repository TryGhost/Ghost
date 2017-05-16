// # Mail
// Handles sending email for Ghost
var _          = require('lodash'),
    Promise    = require('bluebird'),
    nodemailer = require('nodemailer'),
    validator  = require('validator'),
    config     = require('../config'),
    i18n       = require('../i18n');

function GhostMailer() {
    var transport = config.mail && config.mail.transport || 'direct',
        options = config.mail && _.clone(config.mail.options) || {};

    this.state = {};

    this.transport = nodemailer.createTransport(transport, options);

    this.state.usingDirect = transport === 'direct';
}

GhostMailer.prototype.from = function () {
    var from = config.mail && (config.mail.from || config.mail.fromaddress),
        defaultBlogTitle;

    // If we don't have a from address at all
    if (!from) {
        // Default to ghost@[blog.url]
        from = 'ghost@' + this.getDomain();
    }

    // If we do have a from address, and it's just an email
    if (validator.isEmail(from)) {
        defaultBlogTitle = config.theme.title ? config.theme.title.replace(/"/g, '\\"') : i18n.t('common.mail.title', {domain: this.getDomain()});

        from = '"' + defaultBlogTitle + '" <' + from + '>';
    }

    return from;
};

// Moved it to its own module
GhostMailer.prototype.getDomain = function () {
    var domain = config.url.match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
    return domain && domain[1];
};

// Sends an email message enforcing `to` (blog owner) and `from` fields
// This assumes that api.settings.read('email') was already done on the API level
GhostMailer.prototype.send = function (message) {
    var self = this,
        to;

    // important to clone message as we modify it
    message = _.clone(message) || {};
    to = message.to || false;

    if (!(message && message.subject && message.html && message.to)) {
        return Promise.reject(new Error(i18n.t('errors.mail.incompleteMessageData.error')));
    }

    message = _.extend(message, {
        from: self.from(),
        to: to,
        generateTextFromHTML: true,
        encoding: 'base64'
    });

    return new Promise(function (resolve, reject) {
        self.transport.sendMail(message, function (error, response) {
            if (error) {
                return reject(new Error(error));
            }

            if (self.transport.transportType !== 'DIRECT') {
                return resolve(response);
            }

            response.statusHandler.once('failed', function (data) {
                var reason = i18n.t('errors.mail.failedSendingEmail.error');

                if (data.error && data.error.errno === 'ENOTFOUND') {
                    reason += i18n.t('errors.mail.noMailServerAtAddress.error', {domain: data.domain});
                }
                reason += '.';
                return reject(new Error(reason));
            });

            response.statusHandler.once('requeue', function (data) {
                var errorMessage = i18n.t('errors.mail.messageNotSent.error');

                if (data.error && data.error.message) {
                    errorMessage += i18n.t('errors.general.moreInfo', {info: data.error.message});
                }

                return reject(new Error(errorMessage));
            });

            response.statusHandler.once('sent', function () {
                return resolve(i18n.t('notices.mail.messageSent'));
            });
        });
    });
};

module.exports = GhostMailer;
