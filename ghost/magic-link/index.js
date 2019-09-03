const jwt = require('jsonwebtoken');
module.exports = MagicLink;

/**
 * @typedef { Buffer | string } RsaPublicKey
 * @typedef { Buffer | string } RsaPrivateKey
 * @typedef { import('nodemailer').Transporter } MailTransporter
 * @typedef { import('nodemailer').SentMessageInfo } SentMessageInfo
 * @typedef { string } JSONWebToken
 * @typedef { string } URL
 */

/**
 * defaultGetText
 *
 * @param {URL} url - The url which will trigger sign in flow
 * @returns {string} text - The text content of an email to send
 */
function defaultGetText(url) {
    return `Click here to sign in ${url}`;
}

/**
 * defaultGetHTML
 *
 * @param {URL} url - The url which will trigger sign in flow
 * @returns {string} HTML - The HTML content of an email to send
 */
function defaultGetHTML(url) {
    return `<a href="${url}">Click here to sign in</a>`;
}

/**
 * MagicLink
 * @constructor
 *
 * @param {object} options
 * @param {MailTransporter} options.transporter
 * @param {RsaPublicKey} options.publicKey
 * @param {RsaPrivateKey} options.privateKey
 * @param {(token: JSONWebToken) => URL} options.getSigninURL
 * @param {typeof defaultGetText} [options.getText]
 * @param {typeof defaultGetHTML} [options.getHTML]
 */
function MagicLink(options) {
    if (!options || !options.transporter || !options.publicKey || !options.privateKey || !options.getSigninURL) {
        throw new Error('Missing options. Expects {transporter, publicKey, privateKey, getSigninURL}');
    }
    this.transporter = options.transporter;
    this.publicKey = options.publicKey;
    this.privateKey = options.privateKey;
    this.getSigninURL = options.getSigninURL;
    this.getText = options.getText || defaultGetText;
    this.getHTML = options.getHTML || defaultGetHTML;
}

/**
 * sendMagicLink
 *
 * @param {object} options
 * @param {string} options.email - The email to send magic link to
 * @param {object} options.user - The user object to associate with the magic link
 * @returns {Promise<{token: JSONWebToken, info: SentMessageInfo}>}
 */
MagicLink.prototype.sendMagicLink = async function sendMagicLink(options) {
    const token = jwt.sign({
        user: options.user
    }, this.privateKey, {
        audience: '@tryghost/magic-link',
        issuer: '@tryghost/magic-link',
        algorithm: 'RS512',
        subject: options.email,
        expiresIn: '10m'
    });

    const url = this.getSigninURL(token);

    const info = await this.transporter.sendMail({
        to: options.email,
        text: this.getText(url),
        html: this.getHTML(url)
    });

    return {token, info};
};

/**
 * getUserFromToken
 *
 * @param {JSONWebToken} token - The token to decode
 * @returns {object} user - The user object associated with the magic link
 */
MagicLink.prototype.getUserFromToken = function getUserFromToken(token) {
    /** @type {object} */
    const claims = jwt.verify(token, this.publicKey, {
        audience: '@tryghost/magic-link',
        issuer: '@tryghost/magic-link',
        algorithms: ['RS512'],
        maxAge: '10m'
    });
    return claims.user;
};
