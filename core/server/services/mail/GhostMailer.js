// # Mail
// Handles sending email for Ghost
const _ = require('lodash');
const Promise = require('bluebird');
const validator = require('validator');
const config = require('../../config');
const common = require('../../lib/common');
const settingsCache = require('../settings/cache');
const urlUtils = require('../../lib/url-utils');

function GhostMailer() {
    var nodemailer = require('nodemailer'),
        transport = config.get('mail') && config.get('mail').transport || 'direct',
        options = config.get('mail') && _.clone(config.get('mail').options) || {};

    this.state = {};
    this.transport = nodemailer.createTransport(transport, options);
    this.state.usingDirect = transport === 'direct';
}
function getDomain() {
    const domain = urlUtils.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
    return domain && domain[1];
}

function getFromAddress() {
    const configAddress = config.get('mail') && config.get('mail').from;

    const address = configAddress;
    // If we don't have a from address at all
    if (!address) {
        // Default to noreply@[blog.url]
        return getFromAddress(`noreply@${getDomain()}`);
    }

    // If we do have a from address, and it's just an email
    if (validator.isEmail(address)) {
        const defaultBlogTitle = settingsCache.get('title') ? settingsCache.get('title').replace(/"/g, '\\"') : common.i18n.t('common.mail.title', {domain: getDomain()});
        return `"${defaultBlogTitle}" <${address}>`;
    }

    return address;
}

// Sends an email message enforcing `to` (blog owner) and `from` fields
// This assumes that api.settings.read('email') was already done on the API level
GhostMailer.prototype.send = function (message) {
    var self = this,
        to,
        help = common.i18n.t('errors.api.authentication.checkEmailConfigInstructions', {url: 'https://ghost.org/docs/concepts/config/#mail'}),
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
