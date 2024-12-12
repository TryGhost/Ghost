const _ = require('lodash');
const MagicLink = require('@tryghost/magic-link');
const logging = require('@tryghost/logging');
const verifyEmailTemplate = require('./emails/verify-email');
const debug = require('@tryghost/debug')('services:newsletters');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const sentry = require('../../../shared/sentry');

const messages = {
    nameAlreadyExists: 'A newsletter with the same name already exists',
    newsletterNotFound: 'Newsletter not found.',
    senderEmailNotAllowed: 'You cannot set the sender email address to {email}',
    replyToNotAllowed: 'You cannot set the reply-to email address to {email}'
};

class NewslettersService {
    /**
     *
     * @param {Object} options
     * @param {Object} options.NewsletterModel
     * @param {Object} options.MemberModel
     * @param {Object} options.mail
     * @param {Object} options.singleUseTokenProvider
     * @param {Object} options.urlUtils
     * @param {ILimitService} options.limitService
     * @param {Object} options.emailAddressService
     * @param {Object} options.labs
     */
    constructor({NewsletterModel, MemberModel, mail, singleUseTokenProvider, urlUtils, limitService, labs, emailAddressService}) {
        this.NewsletterModel = NewsletterModel;
        this.MemberModel = MemberModel;
        this.urlUtils = urlUtils;
        /** @private */
        this.limitService = limitService;
        /** @private */
        this.labs = labs;
        /** @private */
        this.emailAddressService = emailAddressService;

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
            getSigninURL(token) {
                const adminUrl = urlUtils.urlFor('admin', true);
                const signinURL = new URL(adminUrl);
                signinURL.hash = `/settings/newsletters/?verifyEmail=${token}`;
                return signinURL.href;
            }
        };

        this.magicLinkService = new MagicLink({
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
     * @public
     * @param {Object} options data (id, uuid, slug...)
     * @param {Object} [options] options
     * @returns {Promise<object>}
     */
    async read(data, options = {}) {
        const newsletter = await this.NewsletterModel.findOne(data, options);

        if (!newsletter) {
            throw new errors.NotFoundError({
                message: tpl(messages.newsletterNotFound)
            });
        }
        return newsletter;
    }

    /**
     * @public
     * @param {Object} [options] options
     * @returns {Promise<object>}
     */
    async browse(options = {}) {
        return await this.NewsletterModel.findPage(options);
    }

    async getAll(options = {}) {
        const newsletters = await this.NewsletterModel.findAll(options);
        return newsletters.toJSON();
    }

    /**
     * @public
     * @param {object} attrs model properties
     * @param {Object} [options] options
     * @param {boolean} [options.opt_in_existing] Opt in existing members
     * @param {Object} [options.transacting]
     * @returns {Promise<{object}>} Newsetter Model with verification metadata
     */
    async add(attrs, options = {}) {
        // create newsletter and assign members in the same transaction
        if (options.opt_in_existing && !options.transacting) {
            return this.NewsletterModel.transaction((transacting) => {
                options.transacting = transacting;
                return this.add(attrs, options);
            });
        }

        if (!attrs.status || attrs.status === 'active') {
            await this.limitService.errorIfWouldGoOverLimit('newsletters', options.transacting ? {transacting: options.transacting} : {});
        }

        // remove any email properties that are not allowed to be set without verification
        const {cleanedAttrs, emailsToVerify} = await this.prepAttrsForEmailVerification(attrs);

        // add this newsletter last
        const sortOrder = await this.NewsletterModel.getNextAvailableSortOrder(options);
        cleanedAttrs.sort_order = sortOrder;

        let newsletter;
        try {
            // add the model now because we need the ID for sending verification emails
            newsletter = await this.NewsletterModel.add(cleanedAttrs, options);
        } catch (error) {
            if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
                throw new errors.ValidationError({
                    message: tpl(messages.nameAlreadyExists),
                    property: 'name'
                });
            }

            throw error;
        }

        let optedInMemberCount = undefined;

        // subscribe existing members if opt_in_existing=true
        if (options.opt_in_existing) {
            debug(`Subscribing members to newsletter '${newsletter.get('name')}'`);

            // subscribe members that have an existing subscription to an active newsletter
            const memberIds = await this.MemberModel.fetchAllSubscribed(_.pick(options, 'transacting'));

            optedInMemberCount = memberIds.length;

            if (memberIds.length) {
                debug(`Found ${memberIds.length} members to subscribe`);

                await newsletter.subscribeMembersById(memberIds, options);
            }
        }

        // Load relations correctly
        newsletter = await this.NewsletterModel.findOne({id: newsletter.id}, {...options, require: true});

        if (optedInMemberCount !== undefined) {
            newsletter.meta = newsletter.meta || {};
            newsletter.meta.opted_in_member_count = optedInMemberCount;
        }

        // send any verification emails and respond with the appropriate meta added
        return this.respondWithEmailVerification(newsletter, emailsToVerify);
    }

    /**
     * @public
     * @param {object} attrs model properties
     * @param {Object} options options
     * @param {string} options.id Newsletter id to edit
     * @param {Object} [options.transacting]
     * @returns {Promise<{object}>} Newsetter Model with verification metadata
     */
    async edit(attrs, options) {
        const sharedOptions = _.pick(options, 'transacting');

        // fetch newsletter first so we can compare changed emails
        const originalNewsletter = await this.NewsletterModel.findOne({id: options.id}, {...sharedOptions, require: true});

        const {cleanedAttrs, emailsToVerify} = await this.prepAttrsForEmailVerification(attrs, originalNewsletter);

        if (originalNewsletter.get('status') !== 'active' && cleanedAttrs.status === 'active') {
            await this.limitService.errorIfWouldGoOverLimit('newsletters', sharedOptions);
        }

        let updatedNewsletter;

        try {
            updatedNewsletter = await this.NewsletterModel.edit(cleanedAttrs, options);
        } catch (error) {
            if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
                throw new errors.ValidationError({
                    message: tpl(messages.nameAlreadyExists),
                    property: 'name'
                });
            }

            throw error;
        }

        // Load relations correctly in the response
        updatedNewsletter = await this.NewsletterModel.findOne({id: updatedNewsletter.id}, {...options, require: true});

        await this.respondWithEmailVerification(updatedNewsletter, emailsToVerify);
        return updatedNewsletter;
    }

    /**
     * @public
     * @param {string} token - token that provides details of what to update
     * @returns {Promise<{object}>} Newsetter Model
     */
    async verifyPropertyUpdate(token) {
        const data = await this.magicLinkService.getDataFromToken(token);
        const {id, property, value} = data;

        const attrs = {};
        attrs[property] = value;

        const updatedNewsletter = await this.NewsletterModel.edit(attrs, {id});

        updatedNewsletter.meta = updatedNewsletter.meta || {};
        updatedNewsletter.meta.email_verified = property;

        return updatedNewsletter;
    }

    /* Email verification Internals */

    /**
     * @private
     */
    async prepAttrsForEmailVerification(attrs, newsletter) {
        const cleanedAttrs = _.cloneDeep(attrs);
        const emailsToVerify = [];
        const emailProperties = [
            {property: 'sender_email', type: 'from', emptyable: true, error: messages.senderEmailNotAllowed}
        ];

        if (!this.emailAddressService.service.useNewEmailAddresses) {
            // Validate reply_to is either newsletter or support
            if (cleanedAttrs.sender_reply_to !== undefined) {
                if (!['newsletter', 'support'].includes(cleanedAttrs.sender_reply_to)) {
                    throw new errors.ValidationError({
                        message: tpl(messages.replyToNotAllowed, {email: cleanedAttrs.sender_reply_to})
                    });
                }
            }
        } else {
            if (cleanedAttrs.sender_reply_to !== undefined) {
                if (!['newsletter', 'support'].includes(cleanedAttrs.sender_reply_to)) {
                    emailProperties.push({property: 'sender_reply_to', type: 'replyTo', emptyable: false, error: messages.replyToNotAllowed});
                }
            }
        }

        for (const {property, type, emptyable, error} of emailProperties) {
            const email = cleanedAttrs[property];
            const hasChanged = !newsletter || newsletter.get(property) !== email;

            if (hasChanged && email !== undefined) {
                if (email === null || email === '' && emptyable) {
                    continue;
                }

                const validated = this.emailAddressService.service.validate(email, type);

                if (!validated.allowed) {
                    throw new errors.ValidationError({
                        message: tpl(error, {email})
                    });
                }

                if (validated.verificationEmailRequired) {
                    if (type === 'replyTo' && email === newsletter.get('sender_email')) {
                        // This is some custom behaviour that allows swapping sender_email to sender_reply_to without requiring validation again
                        continue;
                    }
                    delete cleanedAttrs[property];
                    emailsToVerify.push({email, property});
                }
            }
        }

        if (cleanedAttrs.feedback_enabled) {
            if (!this.labs.isSet('audienceFeedback')) {
                // Not allowed to set to true
                cleanedAttrs.feedback_enabled = false;
            }
        }

        // If one of the properties was changed, we need to reset sender_email in case it was not changed but is invalid in the database
        // which can happen after a config change (= auto correcting behaviour)
        const didChangeReplyTo = newsletter && attrs.sender_reply_to !== undefined && newsletter.get('sender_reply_to') !== attrs.sender_reply_to;
        const didChangeSenderEmail = newsletter && (attrs.sender_email !== undefined && newsletter.get('sender_email') !== attrs.sender_email);
        if (didChangeReplyTo && !didChangeSenderEmail && newsletter.get('sender_email')) {
            const validated = this.emailAddressService.service.validate(newsletter.get('sender_email'), 'from');
            if (!validated.allowed) {
                logging.info(`Resetting sender_email for newsletter ${newsletter.id} because it became invalid`);
                cleanedAttrs.sender_email = null;
            }
        }

        return {cleanedAttrs, emailsToVerify};
    }

    /**
     * @private
     */
    async respondWithEmailVerification(newsletter, emailsToVerify) {
        if (emailsToVerify.length > 0) {
            for (const {email, property} of emailsToVerify) {
                await this.sendEmailVerificationMagicLink({id: newsletter.get('id'), email, property});
            }

            newsletter.meta = newsletter.meta || {};
            newsletter.meta.sent_email_verification = emailsToVerify.map(v => v.property);
        }

        return newsletter;
    }

    /**
     * @private
     */
    async sendEmailVerificationMagicLink({id, email, property = 'sender_from'}) {
        const [,toDomain] = email.split('@');

        let fromEmail = `noreply@${toDomain}`;
        if (fromEmail === email) {
            fromEmail = `no-reply@${toDomain}`;
        }

        if (this.emailAddressService.service.useNewEmailAddresses) {
            // Gone with the old logic: always use the default email address here
            // We don't need to validate the FROM address, only the to address
            // Also because we are not only validating FROM addresses, but also possible REPLY-TO addresses, which we won't send FROM
            fromEmail = this.emailAddressService.service.defaultFromAddress;
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

        return this.magicLinkService.sendMagicLink({email, tokenData: {id, property, value: email}});
    }
}

/**
 * @typedef {object} ILimitService
 * @prop {(name: string, options?: {transacting?: Object}) => Promise<void>} errorIfWouldGoOverLimit
 **/

module.exports = NewslettersService;
