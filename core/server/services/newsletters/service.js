const path = require('path');
const _ = require('lodash');
const MagicLink = require('@tryghost/magic-link');
const logging = require('@tryghost/logging');
const verifyEmailTemplate = require('./emails/verify-email');

const MAGIC_LINK_TOKEN_VALIDITY = 24 * 60 * 60 * 1000;

class NewslettersService {
    /**
     *
     * @param {Object} options
     * @param {Object} options.NewsletterModel
     */
    constructor({NewsletterModel, mail, settingsCache, SingleUseTokenModel, SingleUseTokenProvider, urlUtils}) {
        this.NewsletterModel = NewsletterModel;
        this.settingsCache = settingsCache;
        this.urlUtils = urlUtils;

        /* email verification setup */

        this.ghostMailer = new mail.GhostMailer();

        const {transporter, getSubject, getText, getHTML, getSigninURL} = {
            transporter: {
                sendMail() {
                    // noop - overridden in `sendEmailVerificationMagicLink`
                }
            },
            getSubject() {
                // not used - overridden in `sendEmailVerificationMagicLink`
                return `Verify email address`;
            },
            getText(url, type, email) {
                return `
                Hey there,

                Please confirm your email address with this link:

                ${url}

                For your security, the link will expire in 24 hours time.

                ---

                Sent to ${email}
                If you did not make this request, you can simply delete this message. This email address will not be used.
                `;
            },
            getHTML(url, type, email) {
                return verifyEmailTemplate({url, email});
            },
            getSigninURL(token, type) {
                const adminUrl = urlUtils.urlFor('admin', true);
                const signinURL = new URL(adminUrl);
                signinURL.pathname = path.join(signinURL.pathname, 'ghost/');
                signinURL.hash = `/settings/members-email-labs/?verifyEmail=${token}`;
                return signinURL.href;
            }
        };

        this.magicLinkService = new MagicLink({
            transporter,
            tokenProvider: new SingleUseTokenProvider(SingleUseTokenModel, MAGIC_LINK_TOKEN_VALIDITY),
            getSigninURL,
            getText,
            getHTML,
            getSubject
        });
    }

    /**
     *
     * @param {Object} options browse options
     * @returns
     */
    async browse(options) {
        let newsletters = await this.NewsletterModel.findAll(options);

        return newsletters.toJSON();
    }

    async add(attrs, options) {
        // remove any email properties that are not allowed to be set without verification
        const {cleanedAttrs, emailsToVerify} = await this.prepAttrsForEmailVerification(attrs);

        // add the model now because we need the ID for sending verification emails
        const newsletter = await this.NewsletterModel.add(cleanedAttrs, options);

        // send any verification emails and respond with the appropriate meta added
        return this.respondWithEmailVerification(newsletter, emailsToVerify);
    }

    async edit(attrs, options) {
        // fetch newsletter first so we can compare changed emails
        const originalNewsletter = await this.NewsletterModel.findOne(options, {require: true});

        const {cleanedAttrs, emailsToVerify} = await this.prepAttrsForEmailVerification(attrs, originalNewsletter);

        const updatedNewsletter = await this.NewsletterModel.edit(cleanedAttrs, options);

        return this.respondWithEmailVerification(updatedNewsletter, emailsToVerify);
    }

    /* Email verification (private) */

    async prepAttrsForEmailVerification(attrs, newsletter) {
        const cleanedAttrs = _.cloneDeep(attrs);
        const emailsToVerify = [];

        for (const property of ['sender_email']) {
            const email = cleanedAttrs[property];
            const hasChanged = !newsletter || newsletter.get(property) !== email;

            if (await this.requiresEmailVerification({email, hasChanged})) {
                delete cleanedAttrs[property];
                emailsToVerify.push({email, property});
            }
        }

        return {cleanedAttrs, emailsToVerify};
    }

    async requiresEmailVerification({email, hasChanged}) {
        if (!email || !hasChanged) {
            return false;
        }

        // TODO: check other newsletters for known/verified email

        return true;
    }

    async respondWithEmailVerification(newsletter, emailsToVerify) {
        if (emailsToVerify.length > 0) {
            for (const {email, property} of emailsToVerify) {
                await this.sendEmailVerificationMagicLink({id: newsletter.get('id'), email, property});
            }

            newsletter.meta = {
                sent_email_verification: emailsToVerify.map(v => v.property)
            };
        }

        return newsletter;
    }

    async sendEmailVerificationMagicLink({id, email, property = 'sender_from'}) {
        const [,toDomain] = email.split('@');

        let fromEmail = `noreply@${toDomain}`;
        if (fromEmail === email) {
            fromEmail = `no-reply@${toDomain}`;
        }

        const {ghostMailer} = this;

        this.magicLinkService.transporter = {
            sendMail(message) {
                if (process.env.NODE_ENV !== 'production') {
                    logging.warn(message.text);
                }
                let msg = Object.assign({
                    from: fromEmail,
                    subject: 'Verify email address',
                    forceTextContent: true
                }, message);

                return ghostMailer.send(msg);
            }
        };

        return this.magicLinkService.sendMagicLink({email, tokenData: {id, email, property}, subject: email, property});
    }

    async verifyAndUpdateEmail(token) {
        const data = await this.magicLinkService.getDataFromToken(token);
        const {id, email, property} = data;

        const attrs = {};
        attrs[property] = email;

        return this.NewsletterModel.edit(attrs, {id});
    }
}

module.exports = NewslettersService;

