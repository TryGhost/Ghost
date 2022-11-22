const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    postNotFound: 'Post not found.',
    noEmailsProvided: 'No emails provided.',
    emailNotFound: 'Email not found.'
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
        const post = await this.models.Post.findOne({...frame.data, status: 'all'}, {...frame.options});

        if (!post) {
            throw new errors.NotFoundError({
                message: tpl(messages.postNotFound)
            });
        }

        let newsletter;
        if (frame.options.newsletter) {
            newsletter = await this.models.Newsletter.findOne({slug: frame.options.newsletter});
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

        return await this.service.sendTestEmail(post, newsletter, segment, emails);
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
