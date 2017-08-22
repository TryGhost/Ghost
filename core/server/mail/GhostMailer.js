// # Mail
// Handles sending email for Ghost
var _          = require('lodash'),
    Promise    = require('bluebird'),
    validator  = require('validator'),
    config     = require('../config'),
    settingsCache = require('../settings/cache'),
    i18n       = require('../i18n'),
    utils      = require('../utils'),
    logging    = require('../logging'),
    errors     = require('../errors');

function GhostMailer() {
    var nodemailer = require('nodemailer'),
        transportType = config.get('mail') && config.get('mail').transport || 'direct',
        options = config.get('mail') && _.clone(config.get('mail').options) || {};

    this.state = {};

    if (transportType === 'SMTP' || transportType === 'direct') {
        this.transport = nodemailer.createTransport(transportType === 'direct' ? _.extend(options, { direct: true }) : options);
    } else {
        try {
            var provider = require('nodemailer-' + transportType.toLowerCase() + '-transport');

            if (!_.isFunction(provider)) {
                throw new Error('Provider not found.');
            }
        } catch (err) {
            logging.error(new errors.EmailError({ message: 'Specified email provider ' + transportType + ' not found.' }))
        }

        this.transport = nodemailer.createTransport(provider(options));
    }

    this.transportType = transportType.toUpperCase();
    this.state.usingDirect = transportType === 'direct';
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
        defaultBlogTitle = settingsCache.get('title') ? settingsCache.get('title').replace(/"/g, '\\"') : i18n.t('common.mail.title', {domain: this.getDomain()});
        from = '"' + defaultBlogTitle + '" <' + from + '>';
    }

    return from;
};

// Moved it to its own module
GhostMailer.prototype.getDomain = function () {
    var domain = utils.url.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
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

            if (self.transportType !== 'DIRECT') {
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
