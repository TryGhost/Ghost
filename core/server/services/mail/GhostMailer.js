// # Mail
// Handles sending email for Ghost
var _ = require('lodash'),
    Promise = require('bluebird'),
    validator = require('validator'),
    config = require('../../config'),
    common = require('../../lib/common'),
    settingsCache = require('../settings/cache'),
    urlService = require('../url');

function GhostMailer() {
    var nodemailer = require('nodemailer'),
        transport = config.get('mail') && config.get('mail').transport || 'direct',
        options = config.get('mail') && _.clone(config.get('mail').options) || {};

    this.state = {};
    this.transport = nodemailer.createTransport(transport, options);
    this.state.usingDirect = transport === 'direct';
}

GhostMailer.prototype.from = function () {
    var from = config.get('mail') && config.get('mail').from,
        defaultBlogTitle;

    // If we don't have a from address at all
    if (!from) {
        // Default to ghost@[blog.url]
        from = 'ghost@' + this.getDomain();
    }

    // If we do have a from address, and it's just an email
    if (validator.isEmail(from)) {
        defaultBlogTitle = settingsCache.get('title') ? settingsCache.get('title').replace(/"/g, '\\"') : common.i18n.t('common.mail.title', {domain: this.getDomain()});
        from = '"' + defaultBlogTitle + '" <' + from + '>';
    }

    return from;
};

// Moved it to its own module
GhostMailer.prototype.getDomain = function () {
    var domain = urlService.utils.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
    return domain && domain[1];
};

// Sends an email message enforcing `to` (blog owner) and `from` fields
// This assumes that api.settings.read('email') was already done on the API level
GhostMailer.prototype.send = function (message) {
    var self = this,
        to,
        help = common.i18n.t('errors.api.authentication.checkEmailConfigInstructions', {url: 'https://docs.ghost.org/mail/'}),
        errorMessage = common.i18n.t('errors.mail.failedSendingEmail.error');

    // important to clone message as we modify it
    message = _.clone(message) || {};
    to = message.to || false;

    if (!(message && message.subject && message.html && message.to)) {
        return Promise.reject(new common.errors.EmailError({
            message: common.i18n.t('errors.mail.incompleteMessageData.error'),
            help: help
        }));
    }

    message = _.extend(message, {
        from: self.from(),
        to: to,
        generateTextFromHTML: true,
        encoding: 'base64'
    });

    return new Promise(function (resolve, reject) {
        self.transport.sendMail(message, function (err, response) {
            if (err) {
                errorMessage += common.i18n.t('errors.mail.reason', {reason: err.message || err});

                return reject(new common.errors.EmailError({
                    message: errorMessage,
                    err: err,
                    help: help
                }));
            }

            if (self.transport.transportType !== 'DIRECT') {
                return resolve(response);
            }

            response.statusHandler.once('failed', function (data) {
                if (data.error && data.error.errno === 'ENOTFOUND') {
                    errorMessage += common.i18n.t('errors.mail.noMailServerAtAddress.error', {domain: data.domain});
                }

                return reject(new common.errors.EmailError({
                    message: errorMessage,
                    help: help
                }));
            });

            response.statusHandler.once('requeue', function (data) {
                if (data.error && data.error.message) {
                    errorMessage += common.i18n.t('errors.mail.reason', {reason: data.error.message});
                }

                return reject(new common.errors.EmailError({
                    message: errorMessage,
                    help: help
                }));
            });

            response.statusHandler.once('sent', function () {
                return resolve(common.i18n.t('notices.mail.messageSent'));
            });
        });
    });
};

module.exports = GhostMailer;
