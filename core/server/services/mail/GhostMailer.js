// # Mail
// Handles sending email for Ghost
const _ = require('lodash');
const validator = require('@tryghost/validator');
const config = require('../../../shared/config');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const settingsCache = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils');
const messages = {
    title: 'Ghost at {domain}',
    checkEmailConfigInstructions: 'Please see {url} for instructions on configuring email.',
    failedSendingEmailError: 'Failed to send email.',
    incompleteMessageDataError: 'Incomplete message data.',
    reason: ' Reason: {reason}.',
    messageSent: 'Message sent. Double check inbox and spam folder!'
};

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
        const defaultSiteTitle = settingsCache.get('title') ? settingsCache.get('title').replace(/"/g, '\\"') : tpl(messages.title, {domain: getDomain()});
        return `"${defaultSiteTitle}" <${address}>`;
    }

    return address;
}

/**
 * Decorates incoming message object wit    h nodemailer compatible fields.
 * For nodemailer 0.7.1 reference see - https://github.com/nodemailer/nodemailer/tree/da2f1d278f91b4262e940c0b37638e7027184b1d#e-mail-message-fields
 * @param {Object} message
 * @param {boolean} [message.forceTextContent] - force text content
 * @param {string} [message.from] - sender email address
 * @returns {Object}
 */
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
    const helpMessage = tpl(messages.checkEmailConfigInstructions, {url: 'https://ghost.org/docs/config/#mail'});
    const defaultErrorMessage = tpl(messages.failedSendingEmailError);

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
        const nodemailer = require('@tryghost/nodemailer');

        let transport = config.get('mail') && config.get('mail').transport || 'direct';
        transport = transport.toLowerCase();

        // nodemailer mutates the options passed to createTransport
        const options = config.get('mail') && _.clone(config.get('mail').options) || {};

        this.state = {
            usingDirect: transport === 'direct'
        };
        this.transport = nodemailer(transport, options);
    }

    /**
     *
     * @param {Object} message
     * @param {string} message.subject - email subject
     * @param {string} message.html - email content
     * @param {string} message.to - email recipient address
     * @param {string} [message.from] - sender email address
     * @param {boolean} [message.forceTextContent] - maps to generateTextFromHTML nodemailer option
     * which is: "if set to true uses HTML to generate plain text body part from the HTML if the text is not defined"
     * (ref: https://github.com/nodemailer/nodemailer/tree/da2f1d278f91b4262e940c0b37638e7027184b1d#e-mail-message-fields)
     * @returns {Promise<any>}
     */
    async send(message) {
        if (!(message && message.subject && message.html && message.to)) {
            throw createMailError({
                message: tpl(messages.incompleteMessageDataError),
                ignoreDefaultMessage: true
            });
        }

        const messageToSend = createMessage(message);

        const response = await this.sendMail(messageToSend);

        if (this.state.usingDirect) {
            return this.handleDirectTransportResponse(response);
        }

        return response;
    }

    async sendMail(message) {
        try {
            const response = await this.transport.sendMail(message);
            return response;
        } catch (err) {
            throw createMailError({
                message: tpl(messages.reason, {reason: err.message || err}),
                err
            });
        }
    }

    handleDirectTransportResponse(response) {
        if (!response) {
            return tpl(messages.messageSent);
        }

        if (response.pending.length > 0) {
            throw createMailError({
                message: tpl(messages.reason, {reason: 'Email has been temporarily rejected'})
            });
        }

        if (response.errors.length > 0) {
            throw createMailError({
                message: tpl(messages.reason, {reason: response.errors[0].message})
            });
        }

        return tpl(messages.messageSent);
    }
};
