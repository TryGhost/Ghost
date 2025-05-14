const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    postNotFound: 'Post not found.',
    noEmailsProvided: 'No emails provided.',
    emailNotFound: 'Email not found.',
    tooManyEmailsProvided: 'Too many emails provided. Maximum of 1 test email can be sent at once.'
};

class EmailController {
    service;
    models;

    /**
     *
     * @param {EmailService} service
     * @param {{models: {Post: any, Newsletter: any, Email: any}}} dependencies
     */
    constructor(service, {models}) {
        this.service = service;
        this.models = models;
    }

    async _getFrameData(frame) {
        // Bit absurd situation in email-previews endpoints that one endpoint is using options and other one is using data.
        // So we need to handle both cases.
        let post;
        if (frame.options.id) {
            post = await this.models.Post.findOne({...frame.options, status: 'all'}, {withRelated: ['posts_meta', 'authors']});
        } else {
            post = await this.models.Post.findOne({...frame.data, status: 'all'}, {...frame.options, withRelated: ['posts_meta', 'authors']});
        }

        if (!post) {
            throw new errors.NotFoundError({
                message: tpl(messages.postNotFound)
            });
        }

        let newsletter;
        const slug = frame?.options?.newsletter ?? frame?.data?.newsletter ?? null;
        if (slug) {
            newsletter = await this.models.Newsletter.findOne({slug}, {require: true});
        } else {
            newsletter = (await post.getLazyRelation('newsletter')) ?? (await this.models.Newsletter.getDefaultNewsletter());
        }
        return {
            post,
            newsletter,
            segment: frame.options.memberSegment ?? frame.data.memberSegment ?? null
        };
    }

    async previewEmail(frame) {
        const {post, newsletter, segment} = await this._getFrameData(frame);
        return await this.service.previewEmail(post, newsletter, segment);
    }

    async sendTestEmail(frame) {
        const {post, newsletter, segment} = await this._getFrameData(frame);

        const emails = frame.data.emails ?? [];

        if (emails.length === 0) {
            throw new errors.ValidationError({
                message: tpl(messages.noEmailsProvided)
            });
        }

        // test emails are limited to 1
        if (emails.length > 1) {
            throw new errors.ValidationError({
                message: tpl(messages.tooManyEmailsProvided)
            });
        }

        await this.service.sendTestEmail(post, newsletter, segment, emails);
    }

    async retryFailedEmail(frame) {
        const email = await this.models.Email.findOne(frame.data, {require: false});

        if (!email) {
            throw new errors.NotFoundError({
                message: tpl(messages.emailNotFound)
            });
        }

        return await this.service.retryEmail(email);
    }
}

module.exports = EmailController;
