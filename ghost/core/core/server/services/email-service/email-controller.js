const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    postNotFound: 'Post not found.',
    noEmailsProvided: 'No emails provided.',
    emailNotFound: 'Email not found.',
    tooManyEmailsProvided: 'Too many emails provided. Maximum of 1 test email can be sent at once.',
    invalidMemberStatus: 'member_status must be \'free\' or \'paid\'.',
    invalidMemberTier: 'member_tier must be a single tier slug.',
    invalidMemberSegment: 'memberSegment is deprecated and only accepts \'status:free\' or \'status:-free\' — use member_status instead.'
};

// deprecated memberSegment values older clients send, mapped onto the
// member_status vocabulary — production logs show nothing else in use
const LEGACY_SEGMENT_STATUSES = {
    'status:free': 'free',
    'status:-free': 'paid'
};

class EmailController {
    service;
    models;
    getRequiredUrlRelations;

    /**
     *
     * @param {EmailService} service
     * @param {{models: {Post: any, Newsletter: any, Email: any}, getRequiredUrlRelations?: () => string[]}} dependencies
     */
    constructor(service, {models, getRequiredUrlRelations = () => []}) {
        this.service = service;
        this.models = models;
        this.getRequiredUrlRelations = getRequiredUrlRelations;
    }

    async _getFrameData(frame) {
        // Bit absurd situation in email-previews endpoints that one endpoint is using options and other one is using data.
        // So we need to handle both cases.

        // repeated query params / JSON arrays arrive as non-strings — reject
        // rather than 500 downstream (the api-framework only validates
        // required/values, so the endpoint can't do this for us)
        const memberTier = frame.options.member_tier ?? frame.data?.member_tier ?? null;
        if (memberTier !== null && (typeof memberTier !== 'string' || memberTier === '')) {
            throw new errors.ValidationError({
                message: tpl(messages.invalidMemberTier)
            });
        }

        let memberStatus = frame.options.member_status ?? frame.data?.member_status ?? null;
        if (memberStatus !== null && !['free', 'paid'].includes(memberStatus)) {
            throw new errors.ValidationError({
                message: tpl(messages.invalidMemberStatus)
            });
        }

        const legacySegment = frame.options.memberSegment ?? frame.data?.memberSegment ?? null;
        if (legacySegment !== null && (typeof legacySegment !== 'string' || !Object.hasOwn(LEGACY_SEGMENT_STATUSES, legacySegment))) {
            throw new errors.ValidationError({
                message: tpl(messages.invalidMemberSegment)
            });
        }
        if (memberStatus === null && legacySegment !== null) {
            memberStatus = LEGACY_SEGMENT_STATUSES[legacySegment];
        }

        let post;
        // 'tiers' is required by the email tier-gating logic (renderer/segmenter), not for URL generation
        const withRelated = [...new Set(['posts_meta', 'authors', 'tiers', ...this.getRequiredUrlRelations()])];
        if (frame.options.id) {
            post = await this.models.Post.findOne({...frame.options, status: 'all'}, {withRelated});
        } else {
            post = await this.models.Post.findOne({...frame.data, status: 'all'}, {...frame.options, withRelated});
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
            memberStatus,
            memberTier
        };
    }

    async previewEmail(frame) {
        const {post, newsletter, memberStatus, memberTier} = await this._getFrameData(frame);
        return await this.service.previewEmail(post, newsletter, memberStatus, memberTier);
    }

    async sendTestEmail(frame) {
        const {post, newsletter, memberStatus, memberTier} = await this._getFrameData(frame);

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

        await this.service.sendTestEmail(post, newsletter, memberStatus, emails, memberTier);
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
