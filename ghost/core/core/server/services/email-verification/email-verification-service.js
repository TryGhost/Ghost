const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const verifyEmailTemplate = require('./emails/verify-email');
const MagicLink = require('../lib/magic-link/magic-link');
const sentry = require('../../../shared/sentry');

const messages = {
    emailInUse: 'Cannot delete verified email: it is currently in use by {usages}',
    verifiedEmailNotFound: 'Verified email not found'
};

// Map context types to FK column names
const FK_COLUMNS = {
    sender_email: 'sender_email_verified_email_id',
    sender_reply_to: 'sender_reply_to_verified_email_id'
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
     * @returns {Promise<{verified?: boolean, pending?: boolean, email: string}>}
     */
    async add(email, context) {
        const existing = await this.#VerifiedEmailModel.findOne({email});

        if (existing) {
            if (existing.get('status') === 'verified') {
                return {verified: true, email};
            }

            // Status is 'pending' - resend verification email
            await this.#sendVerificationEmail(email, context);
            return {pending: true, email};
        }

        // Create new row with status 'pending'
        await this.#VerifiedEmailModel.add({email, status: 'pending'});
        await this.#sendVerificationEmail(email, context);
        return {pending: true, email};
    }

    /**
     * Verify a token and mark the email as verified
     * @param {string} token
     * @returns {Promise<{email: string, context?: Object}>}
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
        const verifiedEmailId = verifiedEmail.get('id');

        // If context exists, apply the verified email to the target
        if (context) {
            await this.#applyVerification(email, verifiedEmailId, context);
        }

        return {email, context};
    }

    /**
     * Delete a verified email by ID
     * @param {string} id
     * @throws {ValidationError} if the email is in use
     */
    async destroy(id) {
        const verifiedEmail = await this.#VerifiedEmailModel.findOne({id});
        if (!verifiedEmail) {
            throw new errors.NotFoundError({
                message: tpl(messages.verifiedEmailNotFound)
            });
        }

        const usages = await this.#findUsages(id, verifiedEmail.get('email'));
        if (usages.length > 0) {
            throw new errors.ValidationError({
                message: tpl(messages.emailInUse, {usages: usages.join(', ')})
            });
        }

        await this.#VerifiedEmailModel.destroy({id});
    }

    /**
     * Apply a verified email to its target (newsletter, setting, or automated_email)
     * @private
     * @param {string} email
     * @param {string} verifiedEmailId
     * @param {Object} context
     */
    async #applyVerification(email, verifiedEmailId, context) {
        const {type, id, property, key} = context;

        if (type === 'newsletter' && id && property) {
            const fkColumn = FK_COLUMNS[property];
            const attrs = {[property]: email};
            if (fkColumn) {
                attrs[fkColumn] = verifiedEmailId;
            }
            await this.#NewsletterModel.edit(attrs, {id});
        } else if (type === 'setting' && key) {
            await this.#SettingsModel.edit({key, value: email});
        } else if (type === 'automated_email' && id && property) {
            const fkColumn = FK_COLUMNS[property];
            const attrs = {[property]: email};
            if (fkColumn) {
                attrs[fkColumn] = verifiedEmailId;
            }
            await this.#AutomatedEmailModel.edit(attrs, {id});
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

    /**
     * Find usages of a verified email across newsletters, automated_emails, and settings
     * @private
     * @param {string} id - verified email ID
     * @param {string} email - the email address
     * @returns {Promise<string[]>} - array of usage descriptions
     */
    async #findUsages(id, email) {
        const usages = [];

        // Check newsletters by FK columns
        for (const [property, fkColumn] of Object.entries(FK_COLUMNS)) {
            const newsletters = await this.#NewsletterModel.findAll({
                filter: `${fkColumn}:'${id}'`
            });

            if (newsletters && newsletters.models.length > 0) {
                for (const newsletter of newsletters.models) {
                    usages.push(`newsletter "${newsletter.get('name')}" (${property})`);
                }
            }
        }

        // Check automated_emails by FK columns
        for (const [property, fkColumn] of Object.entries(FK_COLUMNS)) {
            const automatedEmails = await this.#AutomatedEmailModel.findAll({
                filter: `${fkColumn}:'${id}'`
            });

            if (automatedEmails && automatedEmails.models.length > 0) {
                for (const automatedEmail of automatedEmails.models) {
                    usages.push(`automated email "${automatedEmail.get('name')}" (${property})`);
                }
            }
        }

        // Check settings (members_support_address) by text value match
        const supportAddress = await this.#SettingsModel.findOne({key: 'members_support_address'});
        if (supportAddress && supportAddress.get('value') === email) {
            usages.push('setting "members_support_address"');
        }

        return usages;
    }
}

module.exports = EmailVerificationService;
