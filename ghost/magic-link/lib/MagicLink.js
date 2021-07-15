const {IncorrectUsageError} = require('@tryghost/errors');

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
     * @param {(token: Token, type: string, requestSrc?: string) => URL} options.getSigninURL
     * @param {typeof defaultGetText} [options.getText]
     * @param {typeof defaultGetHTML} [options.getHTML]
     * @param {typeof defaultGetSubject} [options.getSubject]
     */
    constructor(options) {
        if (!options || !options.transporter || !options.tokenProvider || !options.getSigninURL) {
            throw new IncorrectUsageError('Missing options. Expects {transporter, tokenProvider, getSigninURL}');
        }
        this.transporter = options.transporter;
        this.tokenProvider = options.tokenProvider;
        this.getSigninURL = options.getSigninURL;
        this.getText = options.getText || defaultGetText;
        this.getHTML = options.getHTML || defaultGetHTML;
        this.getSubject = options.getSubject || defaultGetSubject;
    }

    /**
     * sendMagicLink
     *
     * @param {object} options
     * @param {string} options.email - The email to send magic link to
     * @param {string} options.requestSrc - The source magic link was requested from
     * @param {TokenData} options.tokenData - The data for token
     * @param {string=} [options.type='signin'] - The type to be passed to the url and content generator functions
     * @returns {Promise<{token: Token, info: SentMessageInfo}>}
     */
    async sendMagicLink(options) {
        const token = await this.tokenProvider.create(options.tokenData);

        const type = options.type || 'signin';
        const requestSrc = options.requestSrc || '';

        const url = this.getSigninURL(token, type, requestSrc);

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
     * @param {string=} [options.type='signin'] - The type to be passed to the url and content generator functions
     * @returns {Promise<URL>} - signin URL
     */
    async getMagicLink(options) {
        const token = await this.tokenProvider.create(options.tokenData);

        const type = options.type || 'signin';

        return this.getSigninURL(token, type);
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
