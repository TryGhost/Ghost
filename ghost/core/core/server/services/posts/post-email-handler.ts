/* eslint-disable ghost/filenames/match-exported-class */
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

const messages = {
    invalidEmailSegment: 'The email segment parameter doesn\'t contain a valid filter'
};

const EMAIL_SENDING_STATUSES = ['published', 'sent'];

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'sent';

export interface Frame {
    data: {
        posts: Array<{
            status?: PostStatus;
        }>;
    };
    options: {
        id: string;
        newsletter?: string;
        email_segment?: string;
    };
}

export interface PostModel {
    get(key: 'status'): PostStatus;
    get(key: 'newsletter_id'): string | null;
    get(key: 'email_recipient_filter'): string;
    get(key: string): unknown;
    previous(key: 'status'): PostStatus | undefined;
    previous(key: string): unknown;
    wasChanged(): boolean;
    set(key: string, value: unknown): void;
    relations: {
        email?: EmailModel;
    };
}

export interface EmailModel {
    get(key: string): unknown;
}

export interface NewsletterModel {
    get(key: string): unknown;
}

export interface Models {
    Post: {
        findOne(query: { id: string; status: string }, options?: { columns: string[] }): Promise<PostModel | null>;
    };
    Member: {
        findPage(options: { filter: string; limit: number }): Promise<unknown>;
    };
    Newsletter: {
        findOne(query: { slug?: string; id?: string }): Promise<NewsletterModel | null>;
    };
}

export interface EmailService {
    checkCanSendEmail(newsletter: NewsletterModel | null, emailRecipientFilter: string): Promise<void>;
    createEmail(model: PostModel): Promise<EmailModel>;
    retryEmail(email: EmailModel): Promise<EmailModel>;
}

export class PostEmailHandler {
    private models: Models;
    private emailService: EmailService;

    constructor({models, emailService}: {models: Models; emailService: EmailService}) {
        this.models = models;
        this.emailService = emailService;
    }

    /**
     * Validates email can be sent before saving the post (if an email will be sent)
     */
    async validateBeforeSave(frame: Frame): Promise<void> {
        const newStatus = frame.data.posts[0].status;

        if (!newStatus || !EMAIL_SENDING_STATUSES.includes(newStatus)) {
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
     */
    async validateEmailRecipientFilter(emailRecipientFilter: string): Promise<void> {
        if (!emailRecipientFilter || emailRecipientFilter === 'all') {
            return;
        }

        try {
            await this.models.Member.findPage({filter: emailRecipientFilter, limit: 1});
        } catch (err) {
            throw new errors.BadRequestError({
                message: tpl(messages.invalidEmailSegment),
                context: (err instanceof Error) ? err.message : 'Unknown error'
            });
        }
    }

    /**
     * Retrieves the newsletter specified in the frame options or on the existing post
     */
    async getNewsletter(frame: Frame, existingPost: PostModel | null): Promise<NewsletterModel | null> {
        if (frame.options.newsletter) {
            return this.models.Newsletter.findOne({slug: frame.options.newsletter});
        }

        const newsletterId = existingPost?.get('newsletter_id');
        if (newsletterId) {
            return this.models.Newsletter.findOne({id: newsletterId});
        }

        return null;
    }

    /**
     * Handles creating or retrying the email after post is saved
     */
    async createOrRetryEmail(model: PostModel): Promise<void> {
        if (!model.get('newsletter_id')) {
            return;
        }

        const sendEmail = model.wasChanged() && this.shouldSendEmail(
            model.get('status'),
            model.previous('status')
        );

        if (!sendEmail) {
            return;
        }

        const postEmail = model.relations.email;
        let email: EmailModel | undefined;

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
     */
    shouldSendEmail(currentStatus: PostStatus, previousStatus: PostStatus | undefined): boolean {
        return EMAIL_SENDING_STATUSES.includes(currentStatus)
            && (!previousStatus || !EMAIL_SENDING_STATUSES.includes(previousStatus));
    }
}
