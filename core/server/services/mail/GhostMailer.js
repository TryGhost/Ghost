// # Mail
// Handles sending email for Ghost
const _ = require('lodash');
const Promise = require('bluebird');
const validator = require('validator');
const config = require('../../../shared/config');
const errors = require('@tryghost/errors');
const {i18n} = require('../../lib/common');
const settingsCache = require('../settings/cache');
const urlUtils = require('../../../shared/url-utils');

const helpMessage = i18n.t('errors.api.authentication.checkEmailConfigInstructions', {url: 'https://ghost.org/docs/config/#mail'});
const defaultErrorMessage = i18n.t('errors.mail.failedSendingEmail.error');

function getDomain() {
    const domain = urlUtils.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
    return domain && domain[1];
}

function getFromAddress(requestedFromAddress) {
    const configAddress = config.get('mail') && config.get('mail').from;

    const address = requestedFromAddress || configAddress;
    // If we don't have a from address at all
    if (!address) {
        // Default to noreply@[blog.url]
        return getFromAddress(`noreply@${getDomain()}`);
    }

    // If we do have a from address, and it's just an email
    if (validator.isEmail(address, {require_tld: false})) {
        const defaultBlogTitle = settingsCache.get('title') ? settingsCache.get('title').replace(/"/g, '\\"') : i18n.t('common.mail.title', {domain: getDomain()});
        return `"${defaultBlogTitle}" <${address}>`;
    }

    return address;
}

function createMessage(message) {
    const encoding = 'base64';
    const generateTextFromHTML = !message.forceTextContent;
    return Object.assign({}, message, {
        from: getFromAddress(message.from),
        generateTextFromHTML,
        encoding
    });
}

function createMailError({message, err, ignoreDefaultMessage} = {message: ''}) {
    const fullErrorMessage = defaultErrorMessage + message;
    let statusCode = (err && err.name === 'RecipientError') ? 400 : 500;
    return new errors.EmailError({
        message: ignoreDefaultMessage ? message : fullErrorMessage,
        err: err,
        statusCode,
        help: helpMessage
    });
}

module.exports = class GhostMailer {
    constructor() {
        const nodemailer = require('nodemailer');
        const transport = config.get('mail') && config.get('mail').transport || 'direct';
        // nodemailer mutates the options passed to createTransport
        const options = config.get('mail') && _.clone(config.get('mail').options) || {};

        this.state = {
            usingDirect: transport === 'direct'
        };
        this.transport = nodemailer.createTransport(transport, options);
    }

    send(message) {
        if (!(message && message.subject && message.html && message.to)) {
            return Promise.reject(createMailError({
                message: i18n.t('errors.mail.incompleteMessageData.error'),
                ignoreDefaultMessage: true
            }));
        }

        const messageToSend = createMessage(message);

        return this.sendMail(messageToSend).then((response) => {
            if (this.transport.transportType === 'DIRECT') {
                return this.handleDirectTransportResponse(response);
            }
            return response;
        });
    }

    sendMail(message) {
        return new Promise((resolve, reject) => {
            this.transport.sendMail(message, (err, response) => {
                if (err) {
                    reject(createMailError({
                        message: i18n.t('errors.mail.reason', {reason: err.message || err}),
                        err
                    }));
                }
                resolve(response);
            });
        });
    }

    handleDirectTransportResponse(response) {
        return new Promise((resolve, reject) => {
            response.statusHandler.once('failed', function (data) {
                if (data.error && data.error.code === 'ENOTFOUND') {
                    reject(createMailError({
                        message: i18n.t('errors.mail.noMailServerAtAddress.error', {domain: data.domain})
                    }));
                }

                reject(createMailError());
            });

            response.statusHandler.once('requeue', function (data) {
                if (data.error && data.error.message) {
                    reject(createMailError({
                        message: i18n.t('errors.mail.reason', {reason: data.error.message})
                    }));
                }

                reject(createMailError());
            });

            response.statusHandler.once('sent', function () {
                resolve(i18n.t('notices.mail.messageSent'));
            });
        });
    }
};
