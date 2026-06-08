const {IncorrectUsageError, BadRequestError} = require('@tryghost/errors');
const {isEmail} = require('@tryghost/validator');
const tpl = require('@tryghost/tpl');

const messages = {
    invalidEmail: 'Email is not valid'
};

/**
 * @typedef { import('nodemailer').Transporter } MailTransporter
 * @typedef { import('nodemailer').SentMessageInfo } SentMessageInfo
 * @typedef { string } URL
 */

/**
 * @typedef {Object} TokenValidateOptions
 * @prop {string} [otcVerification] - "timestamp:hash" string used to verify an OTC-bound token
 */

/**
 * @template T
 * @template D
 * @typedef {Object} TokenProvider<T, D>
 * @prop {(data: D) => Promise<T>} create
 * @prop {(token: T, options?: TokenValidateOptions) => Promise<D>} validate
 * @prop {(token: T) => Promise<string | null>} [getRefByToken]
 * @prop {(otcRef: string, tokenValue: T) => string} [deriveOTC]
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
     * @param {(token: Token, type: string, referrer?: string, otcVerification?: string) => URL} options.getSigninURL
     * @param {typeof defaultGetText} [options.getText]
     * @param {typeof defaultGetHTML} [options.getHTML]
     * @param {typeof defaultGetSubject} [options.getSubject]
     * @param {object} [options.sentry]
     * @param {{isSet(name: string): boolean}} [options.labsService]
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
        this.labsService = options.labsService || undefined;
    }

    /**
     * sendMagicLink
     *
     * @param {object} options
     * @param {string} options.email - The email to send magic link to
     * @param {TokenData} options.tokenData - The data for token
     * @param {string} [options.type='signin'] - The type to be passed to the url and content generator functions
     * @param {string} [options.referrer=null] - The referrer of the request, if exists. The member will be redirected back to this URL after signin.
     * @param {boolean} [options.includeOTC=false] - Whether to send a one-time-code in the email.
     * @returns {Promise<{token: Token, otcRef: string | null, info: SentMessageInfo}>}
     */
    async sendMagicLink(options) {
        this.sentry?.captureMessage?.(`[Magic Link] Generating magic link`, {extra: options});

        if (!isEmail(options.email)) {
            throw new BadRequestError({
                message: tpl(messages.invalidEmail)
            });
        }

        const token = await this.tokenProvider.create(options.tokenData);

        const type = options.type || 'signin';

        const url = this.getSigninURL(token, type, options.referrer);

        let otc = null;
        if (options.includeOTC) {
            try {
                otc = await this.getOTCFromToken(token);
            } catch (err) {
                this.sentry?.captureException?.(err);
                otc = null;
            }
        }

        const info = await this.transporter.sendMail({
            to: options.email,
            subject: this.getSubject(type, otc),
            text: this.getText(url, type, options.email, otc),
            html: this.getHTML(url, type, options.email, otc)
        });

        // return otcRef so we can pass it as a reference to the client so it
        // can pass it back as a reference when verifying the OTC. We only do
        // this if we've successfully generated an OTC to avoid clients showing
        // a token input field when the email doesn't contain an OTC
        let otcRef = null;
        if (otc) {
            try {
                otcRef = await this.getRefFromToken(token);
            } catch (err) {
                this.sentry?.captureException?.(err);
                otcRef = null;
            }
        }

        return {token, otcRef, info};
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
     * getRefFromToken
     *
     * @param {Token} token - The token to get the ref from
     * @returns {Promise<string|null>} ref - The ref of the token
     */
    async getRefFromToken(token) {
        if (typeof this.tokenProvider.getRefByToken !== 'function') {
            return null;
        }

        const id = await this.tokenProvider.getRefByToken(token);
        return id;
    }

    /**
     * getOTCFromToken
     *
     * @param {Token} token - The token to get the otc from
     * @returns {Promise<string|null>} otc - The otc of the token
     */
    async getOTCFromToken(token) {
        const tokenId = await this.getRefFromToken(token);

        if (!tokenId || typeof this.tokenProvider.deriveOTC !== 'function') {
            return null;
        }

        const otc = await this.tokenProvider.deriveOTC(tokenId, token);
        return otc;
    }

    /**
     * getDataFromToken
     *
     * @param {Token} token - The token to decode
     * @param {string} [otcVerification] - Optional "timestamp:hash" to bind token usage to an OTC verification window
     * @returns {Promise<TokenData>} data - The data object associated with the magic link
     */
    async getDataFromToken(token, otcVerification) {
        const tokenData = await this.tokenProvider.validate(token, {otcVerification});
        return tokenData;
    }
}

/**
 * defaultGetText
 *
 * @param {URL} url - The url which will trigger sign in flow
 * @param {string} type - The type of email to send e.g. signin, signup
 * @param {string} email - The recipient of the email to send
 * @param {string} otc - Optional one-time-code
 * @returns {string} text - The text content of an email to send
 */
function defaultGetText(url, type, email, otc) {
    let msg = 'sign in';
    if (type === 'signup') {
        msg = 'confirm your email address';
    }

    if (otc) {
        return `Enter the code ${otc} or click here to ${msg} ${url}. This msg was sent to ${email}`;
    }

    return `Click here to ${msg} ${url}. This msg was sent to ${email}`;
}

/**
 * defaultGetHTML
 *
 * @param {URL} url - The url which will trigger sign in flow
 * @param {string} type - The type of email to send e.g. signin, signup
 * @param {string} email - The recipient of the email to send
 * @param {string} otc - Optional one-time-code
 * @returns {string} HTML - The HTML content of an email to send
 */
function defaultGetHTML(url, type, email, otc) {
    let msg = 'sign in';
    if (type === 'signup') {
        msg = 'confirm your email address';
    }

    if (otc) {
        return `Enter the code ${otc} or <a href="${url}">click here to ${msg}</a> This msg was sent to ${email}`;
    }

    return `<a href="${url}">Click here to ${msg}</a> This msg was sent to ${email}`;
}

/**
 * defaultGetSubject
 *
 * @param {string} type - The type of email to send e.g. signin, signup
 * @param {string} otc - Optional one-time-code
 * @returns {string} subject - The subject of an email to send
 */
function defaultGetSubject(type, otc) {
    if (type === 'signup') {
        return `Signup!`;
    }

    if (otc) {
        return `Your signin verification code is ${otc}`;
    }

    return `Signin!`;
}

module.exports = MagicLink;
