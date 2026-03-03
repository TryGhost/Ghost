const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const verifyEmailTemplate = require('./emails/verify-email');
const MagicLink = require('../lib/magic-link/magic-link');
const sentry = require('../../../shared/sentry');

const messages = {
    verifiedEmailNotFound: 'Verified email not found'
};

class EmailVerificationService {
    /** @private */
    #VerifiedEmailModel;
    /** @private */
    #NewsletterModel;
    /** @private */
    #SettingsModel;
    /** @private */
    #AutomatedEmailModel;
    /** @private */
    #magicLinkService;
    /** @private */
    #ghostMailer;
    /** @private */
    #emailAddressService;

    /**
     * @param {Object} options
     * @param {Object} options.VerifiedEmailModel
     * @param {Object} options.NewsletterModel
     * @param {Object} options.SettingsModel
     * @param {Object} options.AutomatedEmailModel
     * @param {Object} options.mail
     * @param {Object} options.singleUseTokenProvider
     * @param {Object} options.urlUtils
     * @param {Object} options.emailAddressService
     */
    constructor({VerifiedEmailModel, NewsletterModel, SettingsModel, AutomatedEmailModel, mail, singleUseTokenProvider, urlUtils, emailAddressService}) {
        this.#VerifiedEmailModel = VerifiedEmailModel;
        this.#NewsletterModel = NewsletterModel;
        this.#SettingsModel = SettingsModel;
        this.#AutomatedEmailModel = AutomatedEmailModel;
        this.#emailAddressService = emailAddressService;

        /* email verification setup */

        this.#ghostMailer = new mail.GhostMailer();

        const {transporter, getSubject, getText, getHTML, getSigninURL} = {
            transporter: {
                sendMail() {
                    // noop - overridden in #sendVerificationEmail
                }
            },
            getSubject() {
                // not used - overridden in #sendVerificationEmail
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
            getSigninURL(token) {
                const adminUrl = urlUtils.urlFor('admin', true);
                const signinURL = new URL(adminUrl);
                signinURL.hash = `/settings/verified-emails/?verifyEmail=${token}`;
                return signinURL.href;
            }
        };

        this.#magicLinkService = new MagicLink({
            transporter,
            tokenProvider: singleUseTokenProvider,
            getSigninURL,
            getText,
            getHTML,
            getSubject,
            sentry
        });
    }

    /**
     * List all verified email rows
     * @returns {Promise<Object>}
     */
    async list() {
        return await this.#VerifiedEmailModel.findAll();
    }

    /**
     * Check if an email exists in verified_emails with status 'verified'
     * @param {string} email
     * @returns {Promise<boolean>}
     */
    async check(email) {
        const existing = await this.#VerifiedEmailModel.findOne({email, status: 'verified'});
        return !!existing;
    }

    /**
     * Add an email for verification
     * @param {string} email
     * @param {Object} [context] - optional context for what triggered the verification
     * @param {string} [context.type] - 'newsletter' | 'setting' | 'automated_email'
     * @param {string} [context.id] - ID of the newsletter or automated_email
     * @param {string} [context.property] - property being verified (e.g. 'sender_email')
     * @param {string} [context.key] - settings key (e.g. 'members_support_address')
     * @returns {Promise<Object>} - the VerifiedEmail model
     */
    async add(email, context) {
        const existing = await this.#VerifiedEmailModel.findOne({email});

        if (existing) {
            if (existing.get('status') === 'pending') {
                // Resend verification email
                await this.#sendVerificationEmail(email, context);
            }
            return existing;
        }

        // Create new row with status 'pending'
        const model = await this.#VerifiedEmailModel.add({email, status: 'pending'});
        await this.#sendVerificationEmail(email, context);
        return model;
    }

    /**
     * Verify a token and mark the email as verified
     * @param {string} token
     * @returns {Promise<{verifiedEmail: Object, context: Object|undefined}>}
     */
    async verify(token) {
        const data = await this.#magicLinkService.getDataFromToken(token);
        const {email, context} = data;

        // Find the verified_email row and update status
        const verifiedEmail = await this.#VerifiedEmailModel.findOne({email});
        if (!verifiedEmail) {
            throw new errors.NotFoundError({
                message: tpl(messages.verifiedEmailNotFound)
            });
        }

        await verifiedEmail.save({status: 'verified'}, {patch: true});

        // If context exists, apply the verified email to the target
        if (context) {
            await this.#applyVerification(email, context);
        }

        return {verifiedEmail, context};
    }

    /**
     * Apply a verified email to its target (newsletter, setting, or automated_email)
     * @private
     * @param {string} email
     * @param {Object} context
     */
    async #applyVerification(email, context) {
        const {type, id, property, key} = context;

        if (type === 'newsletter' && id && property) {
            await this.#NewsletterModel.edit({[property]: email}, {id});
        } else if (type === 'setting' && key) {
            await this.#SettingsModel.edit({key, value: email});
        } else if (type === 'automated_email' && id && property) {
            await this.#AutomatedEmailModel.edit({[property]: email}, {id});
        }
    }

    /**
     * Send a verification email via MagicLink
     * @private
     * @param {string} email
     * @param {Object} [context]
     */
    async #sendVerificationEmail(email, context) {
        const fromEmail = this.#emailAddressService.service.defaultFromAddress;
        const ghostMailer = this.#ghostMailer;

        this.#magicLinkService.transporter = {
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

        return this.#magicLinkService.sendMagicLink({email, tokenData: {email, context}});
    }
}

module.exports = EmailVerificationService;
