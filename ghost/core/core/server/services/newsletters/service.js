const _ = require('lodash');
const MagicLink = require('@tryghost/magic-link');
const logging = require('@tryghost/logging');
const verifyEmailTemplate = require('./emails/verify-email');
const debug = require('@tryghost/debug')('services:newsletters');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    nameAlreadyExists: 'A newsletter with the same name already exists',
    newsletterNotFound: 'Newsletter not found.'
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
     */
    constructor({NewsletterModel, MemberModel, mail, singleUseTokenProvider, urlUtils, limitService}) {
        this.NewsletterModel = NewsletterModel;
        this.MemberModel = MemberModel;
        this.urlUtils = urlUtils;
        /** @private */
        this.limitService = limitService;

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
            getSubject
        });
    }

    /**
     * @public
     * @param {Object} options data (id, uuid, slug...)
     * @param {Object} [options] options
     * @returns {Promise<object>} JSONified Newsletter models
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
     * @returns {Promise<object>} JSONified Newsletter models
     */
    async browse(options = {}) {
        let newsletters = await this.NewsletterModel.findAll(options);

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

        // Load relations correctly
        newsletter = await this.NewsletterModel.findOne({id: newsletter.id}, {...options, require: true});

        // subscribe existing members if opt_in_existing=true
        if (options.opt_in_existing) {
            debug(`Subscribing members to newsletter '${newsletter.get('name')}'`);

            // subscribe members that have an existing subscription to an active newsletter
            const memberIds = await this.MemberModel.fetchAllSubscribed(_.pick(options, 'transacting'));

            newsletter.meta = newsletter.meta || {};
            newsletter.meta.opted_in_member_count = memberIds.length;

            if (memberIds.length) {
                debug(`Found ${memberIds.length} members to subscribe`);

                await newsletter.subscribeMembersById(memberIds, options);
            }
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

        return this.NewsletterModel.edit(attrs, {id});
    }

    /* Email verification Internals */

    /**
     * @private
     */
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

    /**
     * @private
     */
    async requiresEmailVerification({email, hasChanged}) {
        if (!email || !hasChanged) {
            return false;
        }

        // TODO: check other newsletters for known/verified email

        return true;
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
