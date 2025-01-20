const {IncorrectUsageError, BadRequestError} = require('@tryghost/errors');
const {isEmail} = require('@tryghost/validator');
const tpl = require('@tryghost/tpl');
const messages = {
    invalidEmail: 'Email is not valid',
    unsupportedEmailDomain: 'This email domain is not accepted, try again with a different email address'
};

/**
 * @typedef { import('nodemailer').Transporter } MailTransporter
 * @typedef { import('nodemailer').SentMessageInfo } SentMessageInfo
 * @typedef { string } URL
 */

/**
 * @template T
 * @template D
 * @typedef {Object} TokenProvider<T, D>
 * @prop {(data: D) => Promise<T>} create
 * @prop {(token: T) => Promise<D>} validate
 */

/**
 * MagicLink
 * @template Token
 * @template TokenData
 */
class MagicLink {
    /**
     * @param {object} options
     * @param {MailTransporter} options.transporter
     * @param {TokenProvider<Token, TokenData>} options.tokenProvider
     * @param {(token: Token, type: string, referrer?: string) => URL} options.getSigninURL
     * @param {typeof defaultGetText} [options.getText]
     * @param {typeof defaultGetHTML} [options.getHTML]
     * @param {typeof defaultGetSubject} [options.getSubject]
     * @param {object} [options.sentry]
     * @param {object} [options.config]
     */
    constructor(options) {
        if (!options || !options.transporter || !options.tokenProvider || !options.getSigninURL) {
            throw new IncorrectUsageError({message: 'Missing options. Expects {transporter, tokenProvider, getSigninURL}'});
        }
        this.transporter = options.transporter;
        this.tokenProvider = options.tokenProvider;
        this.getSigninURL = options.getSigninURL;
        this.getText = options.getText || defaultGetText;
        this.getHTML = options.getHTML || defaultGetHTML;
        this.getSubject = options.getSubject || defaultGetSubject;
        this.sentry = options.sentry || undefined;
        this.config = options.config || {};
    }

    /**
     * sendMagicLink
     *
     * @param {object} options
     * @param {string} options.email - The email to send magic link to
     * @param {TokenData} options.tokenData - The data for token
     * @param {string} [options.type='signin'] - The type to be passed to the url and content generator functions
     * @param {string} [options.referrer=null] - The referrer of the request, if exists. The member will be redirected back to this URL after signin.
     * @returns {Promise<{token: Token, info: SentMessageInfo}>}
     */
    async sendMagicLink(options) {
        this.sentry?.captureMessage?.(`[Magic Link] Generating magic link`, {extra: options});

        if (!isEmail(options.email)) {
            throw new BadRequestError({
                message: tpl(messages.invalidEmail)
            });
        }

        if (this.isEmailDomainBlocked(options.email)) {
            throw new BadRequestError({
                message: tpl(messages.unsupportedEmailDomain)
            });
        }

        const token = await this.tokenProvider.create(options.tokenData);

        const type = options.type || 'signin';

        const url = this.getSigninURL(token, type, options.referrer);

        const info = await this.transporter.sendMail({
            to: options.email,
            subject: this.getSubject(type),
            text: this.getText(url, type, options.email),
            html: this.getHTML(url, type, options.email)
        });

        return {token, info};
    }

    /**
     * getMagicLink
     *
     * @param {object} options
     * @param {TokenData} options.tokenData - The data for token
     * @param {string} [options.type='signin'] - The type to be passed to the url and content generator functions. This type will also get stored in the token data.
     * @param {string} [options.referrer=null] - The referrer of the request, if exists. The member will be redirected back to this URL after signin.
     * @returns {Promise<URL>} - signin URL
     */
    async getMagicLink(options) {
        const type = options.type ?? 'signin';
        const token = await this.tokenProvider.create({...options.tokenData, type});

        return this.getSigninURL(token, type, options.referrer);
    }

    /**
     * getDataFromToken
     *
     * @param {Token} token - The token to decode
     * @returns {Promise<TokenData>} data - The data object associated with the magic link
     */
    async getDataFromToken(token) {
        const tokenData = await this.tokenProvider.validate(token);
        return tokenData;
    }

    /**
     * Check if the email domain is blocked, based on the `spam.blocked_email_domains` config
     *
     * @param {string} email
     * @returns {boolean}
     */
    isEmailDomainBlocked(email) {
        const emailDomain = email.split('@')[1]?.toLowerCase();
        const blockedDomains = this.config?.get('spam:blocked_email_domains');

        // Config is not set properly: skip check
        if (!blockedDomains || !Array.isArray(blockedDomains)) {
            return false;
        }

        return blockedDomains.includes(emailDomain);
    }
}

/**
 * defaultGetText
 *
 * @param {URL} url - The url which will trigger sign in flow
 * @param {string} type - The type of email to send e.g. signin, signup
 * @param {string} email - The recipient of the email to send
 * @returns {string} text - The text content of an email to send
 */
function defaultGetText(url, type, email) {
    let msg = 'sign in';
    if (type === 'signup') {
        msg = 'confirm your email address';
    }
    return `Click here to ${msg} ${url}. This msg was sent to ${email}`;
}

/**
 * defaultGetHTML
 *
 * @param {URL} url - The url which will trigger sign in flow
 * @param {string} type - The type of email to send e.g. signin, signup
 * @param {string} email - The recipient of the email to send
 * @returns {string} HTML - The HTML content of an email to send
 */
function defaultGetHTML(url, type, email) {
    let msg = 'sign in';
    if (type === 'signup') {
        msg = 'confirm your email address';
    }
    return `<a href="${url}">Click here to ${msg}</a> This msg was sent to ${email}`;
}

/**
 * defaultGetSubject
 *
 * @param {string} type - The type of email to send e.g. signin, signup
 * @returns {string} subject - The subject of an email to send
 */
function defaultGetSubject(type) {
    if (type === 'signup') {
        return `Signup!`;
    }
    return `Signin!`;
}

module.exports = MagicLink;
module.exports.JWTTokenProvider = require('./JWTTokenProvider');
