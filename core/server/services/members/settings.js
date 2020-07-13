const MagicLink = require('@tryghost/magic-link');
const {URL} = require('url');
const path = require('path');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../settings/cache');
const logging = require('../../../shared/logging');
const mail = require('../mail');
const updateEmailTemplate = require('./emails/updateEmail');

const ghostMailer = new mail.GhostMailer();

function createSettingsInstance(config) {
    const {transporter, getSubject, getText, getHTML, getSigninURL} = {
        transporter: {
            sendMail(message) {
                if (process.env.NODE_ENV !== 'production') {
                    logging.warn(message.text);
                }
                let msg = Object.assign({
                    from: config.getEmailFromAddress(),
                    subject: 'Update email address',
                    forceTextContent: true
                }, message);

                return ghostMailer.send(msg);
            }
        },
        getSubject() {
            return `Confirm your email address`;
        },
        getText(url, type, email) {
            return `
            Hey there,

            Please confirm your email address with this link:

            ${url}

            For your security, the link will expire in 10 minutes time.

            ---

            Sent to ${email}
            If you did not make this request, you can simply delete this message. This email address will not be used.
            `;
        },
        getHTML(url, type, email) {
            const siteTitle = settingsCache.get('title');
            return updateEmailTemplate({url, email, siteTitle});
        },
        getSigninURL(token, type) {
            const signinURL = new URL(getApiUrl({version: 'v3', type: 'admin'}));
            signinURL.pathname = path.join(signinURL.pathname, '/settings/members/email/');
            signinURL.searchParams.set('token', token);
            signinURL.searchParams.set('action', type);
            return signinURL.href;
        }
    };

    const getApiUrl = ({version, type}) => {
        return urlUtils.urlFor('api', {version: version, versionType: type}, true);
    };

    const magicLinkService = new MagicLink({
        transporter,
        secret: config.getAuthSecret(),
        getSigninURL,
        getText,
        getHTML,
        getSubject
    });

    const sendFromAddressUpdateMagicLink = ({email, payload = {}}) => {
        return magicLinkService.sendMagicLink({email, payload, subject: email, type: 'updateFromAddress'});
    };

    const getEmailFromToken = ({token}) => {
        return magicLinkService.getUserFromToken(token);
    };

    const getAdminRedirectLink = () => {
        const adminUrl = urlUtils.urlFor('admin', true);
        return urlUtils.urlJoin(adminUrl, '#/settings/labs/?fromAddressUpdate=success');
    };

    return {
        sendFromAddressUpdateMagicLink,
        getEmailFromToken,
        getAdminRedirectLink
    };
}

module.exports = createSettingsInstance;
