import {IncomingRecommendationEmailRenderer} from './IncomingRecommendationEmailRenderer';
import {RecommendationService} from './RecommendationService';
import logging from '@tryghost/logging';

export type IncomingRecommendation = {
    title: string;
    siteTitle: string|null;
    url: URL;
    excerpt: string|null;
    favicon: URL|null;
    featuredImage: URL|null;
    recommendingBack: boolean;
}

export type Report = {
    startDate: Date,
    endDate: Date,
    recommendations: IncomingRecommendation[]
}

type Mention = {
    source: URL,
    sourceTitle: string,
    sourceSiteTitle: string|null,
    sourceAuthor: string|null,
    sourceExcerpt: string|null,
    sourceFavicon: URL|null,
    sourceFeaturedImage: URL|null
}

type MentionsAPI = {
    refreshMentions(options: {filter: string, limit: number|'all'}): Promise<void>
    listMentions(options: {filter: string, limit: number|'all'}): Promise<{data: Mention[]}>
}

export type EmailRecipient = {
    email: string
}

type EmailService = {
    send(to: string, subject: string, html: string, text: string): Promise<void>
}

export class IncomingRecommendationService {
    #mentionsApi: MentionsAPI;
    #recommendationService: RecommendationService;

    #emailService: EmailService;
    #emailRenderer: IncomingRecommendationEmailRenderer;
    #getEmailRecipients: () => Promise<EmailRecipient[]>;

    constructor(deps: {
        recommendationService: RecommendationService,
        mentionsApi: MentionsAPI,
        emailService: EmailService,
        emailRenderer: IncomingRecommendationEmailRenderer,
        getEmailRecipients: () => Promise<EmailRecipient[]>,
    }) {
        this.#recommendationService = deps.recommendationService;
        this.#mentionsApi = deps.mentionsApi;
        this.#emailService = deps.emailService;
        this.#emailRenderer = deps.emailRenderer;
        this.#getEmailRecipients = deps.getEmailRecipients;
    }

    async init() {
        // When we boot, it is possible that we missed some webmentions from other sites recommending you
        // More importantly, we might have missed some deletes which we can detect.
        // So we do a slow revalidation of all incoming recommendations
        // This also prevents doing multiple external fetches when doing quick reboots of Ghost after each other (requires Ghost to be up for at least 15 seconds)
        if (!process.env.NODE_ENV?.startsWith('test')) {
            setTimeout(() => {
                logging.info('Updating incoming recommendations on boot');
                this.#updateIncomingRecommendations().catch((err) => {
                    logging.error('Failed to update incoming recommendations on boot', err);
                });
            }, 15 * 1000 + Math.random() * 5 * 60 * 1000);
        }
    }

    #getMentionFilter({verified = true} = {}) {
        const base = `source:~$'/.well-known/recommendations.json'`;
        if (verified) {
            return `${base}+verified:true`;
        }
        return base;
    }

    async #updateIncomingRecommendations() {
        // Note: we also recheck recommendations that were not verified (verification could have failed)
        const filter = this.#getMentionFilter({verified: false});
        await this.#mentionsApi.refreshMentions({filter, limit: 100});
    }

    async #mentionToIncomingRecommendation(mention: Mention): Promise<IncomingRecommendation|null> {
        try {
            const url = new URL(mention.source.toString().replace(/\/.well-known\/recommendations\.json$/, ''));

            // Check if we are also recommending this URL
            const existing = await this.#recommendationService.countRecommendations({
                filter: `url:~^'${url}'`
            });
            const recommendingBack = existing > 0;

            return {
                title: mention.sourceTitle,
                siteTitle: mention.sourceSiteTitle,
                url,
                excerpt: mention.sourceExcerpt,
                favicon: mention.sourceFavicon,
                featuredImage: mention.sourceFeaturedImage,
                recommendingBack
            };
        } catch (e) {
            logging.error('Failed to parse mention to incoming recommendation data type', e);
        }
        return null;
    }

    async sendRecommendationEmail(mention: Mention) {
        const recommendation = await this.#mentionToIncomingRecommendation(mention);
        if (!recommendation) {
            return;
        }
        const recipients = await this.#getEmailRecipients();

        for (const recipient of recipients) {
            const subject = await this.#emailRenderer.renderSubject(recommendation);
            const html = await this.#emailRenderer.renderHTML(recommendation, recipient);
            const text = await this.#emailRenderer.renderText(recommendation, recipient);

            await this.#emailService.send(recipient.email, subject, html, text);
        }
    }
}
