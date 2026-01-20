const {BadRequestError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    invalidEmailSegment: 'The email segment parameter doesn\'t contain a valid filter'
};

const EMAIL_SENDING_STATUSES = ['published', 'sent'];

class PostEmailHandler {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.models
     * @param {Object} dependencies.emailService
     */
    constructor({models, emailService}) {
        this.models = models;
        this.emailService = emailService;
    }

    /**
     * Validates email can be sent before saving the post (if an email will be sent)
     *
     * @param {import('@tryghost/api-framework').Frame} frame
     * @returns {Promise<void>}
     */
    async validateBeforeSave(frame) {
        const newStatus = frame.data.posts[0].status;

        if (!EMAIL_SENDING_STATUSES.includes(newStatus)) {
            return;
        }

        const existingPost = await this.models.Post.findOne(
            {id: frame.options.id, status: 'all'},
            {columns: ['id', 'status', 'newsletter_id', 'email_recipient_filter']}
        );
        const previousStatus = existingPost?.get('status');

        const hasNewsletter = frame.options.newsletter || existingPost?.get('newsletter_id');
        const sendingEmail = hasNewsletter && this.shouldSendEmail(newStatus, previousStatus);

        if (!sendingEmail) {
            return;
        }

        const emailRecipientFilter = frame.options.email_segment || existingPost?.get('email_recipient_filter') || 'all';

        await this.validateEmailRecipientFilter(emailRecipientFilter);

        const newsletter = await this.getNewsletter(frame, existingPost);

        await this.emailService.checkCanSendEmail(newsletter, emailRecipientFilter);
    }

    /**
     * Validates the email recipient filter is valid
     *
     * @param {string} emailRecipientFilter
     * @returns {Promise<void>}
     */
    async validateEmailRecipientFilter(emailRecipientFilter) {
        if (!emailRecipientFilter || emailRecipientFilter === 'all') {
            return;
        }

        try {
            await this.models.Member.findPage({filter: emailRecipientFilter, limit: 1});
        } catch (err) {
            throw new BadRequestError({
                message: tpl(messages.invalidEmailSegment),
                context: err.message
            });
        }
    }

    /**
     * Retrieves the newsletter for the post
     *
     * @param {import('@tryghost/api-framework').Frame} frame
     * @param {Object|null} existingPost
     * @returns {Promise<Object|null>}
     */
    async getNewsletter(frame, existingPost) {
        if (frame.options.newsletter) {
            return this.models.Newsletter.findOne({slug: frame.options.newsletter});
        }

        if (existingPost?.get('newsletter_id')) {
            return this.models.Newsletter.findOne({id: existingPost.get('newsletter_id')});
        }

        return null;
    }

    /**
     * Handles creating or retrying the newsletter email after post is saved
     *
     * @param {Object} model - The post model
     * @returns {Promise<void>}
     */
    async createOrRetryEmail(model) {
        if (!model.get('newsletter_id')) {
            return;
        }

        const sendEmail = model.wasChanged() && this.shouldSendEmail(model.get('status'), model.previous('status'));

        if (!sendEmail) {
            return;
        }

        const postEmail = model.relations.email;
        let email;

        if (!postEmail) {
            email = await this.emailService.createEmail(model);
        } else if (postEmail.get('status') === 'failed') {
            email = await this.emailService.retryEmail(postEmail);
        }

        if (email) {
            model.set('email', email);
        }
    }

    /**
     * Calculates if the email should be tried to be sent out
     *
     * @param {String} currentStatus current status from the post model
     * @param {String} previousStatus previous status from the post model
     * @returns {Boolean}
     */
    shouldSendEmail(currentStatus, previousStatus) {
        return EMAIL_SENDING_STATUSES.includes(currentStatus)
            && !EMAIL_SENDING_STATUSES.includes(previousStatus);
    }
}

module.exports = PostEmailHandler;
