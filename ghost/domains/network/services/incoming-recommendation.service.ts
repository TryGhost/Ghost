import { IncomingRecommendationEmailRenderer } from '../emails/incoming-recommendation.renderer';
import { RecommendationService } from './recommendation.service';
import type { GhostLogger } from '@tryghost/logging';
import type { Site } from '#support/site';
import { mailer } from '../../../shared/transition/mailer';
import { mentions } from '../../../shared/transition/mentions';
import { models } from '../../../shared/transition/models';
import { incomingRecommendationEmailRenderer } from '../emails/incoming-recommendation.renderer';
import { recommendations } from './recommendation.service';

export type IncomingRecommendation = {
  id: string;
  title: string;
  url: URL;
  excerpt: string | null;
  favicon: URL | null;
  featuredImage: URL | null;
  recommendingBack: boolean;
};

export type Report = {
  startDate: Date;
  endDate: Date;
  recommendations: IncomingRecommendation[];
};

type Mention = {
  id: string;
  source: URL;
  sourceTitle: string;
  sourceSiteTitle: string | null;
  sourceAuthor: string | null;
  sourceExcerpt: string | null;
  sourceFavicon: URL | null;
  sourceFeaturedImage: URL | null;
};

type MentionMeta = {
  pagination: {
    page: number;
    limit: number;
    pages: number;
    total: number;
    next: null | number;
    prev: null | number;
  };
};

type MentionsAPI = {
  refreshMentions(options: { filter: string; limit: number | 'all' }): Promise<void>;
  listMentions(options: {
    filter: string;
    page: number;
    limit: number | 'all';
  }): Promise<{ data: Mention[]; meta?: MentionMeta }>;
};

export type EmailRecipient = {
  email: string;
};

type EmailService = {
  send(to: string, subject: string, html: string, text: string): Promise<void>;
};

export class IncomingRecommendationService {
  #mentionsApi: MentionsAPI;
  #recommendationService: RecommendationService;

  #emailService: EmailService;
  #emailRenderer: IncomingRecommendationEmailRenderer;
  #getEmailRecipients: () => Promise<EmailRecipient[]>;
  #logging: Pick<GhostLogger, 'info' | 'error'>;

  constructor(deps: {
    recommendationService: RecommendationService;
    mentionsApi: MentionsAPI;
    emailService: EmailService;
    emailRenderer: IncomingRecommendationEmailRenderer;
    getEmailRecipients: () => Promise<EmailRecipient[]>;
    logging: Pick<GhostLogger, 'info' | 'error'>;
  }) {
    this.#recommendationService = deps.recommendationService;
    this.#logging = deps.logging;
    this.#mentionsApi = deps.mentionsApi;
    this.#emailService = deps.emailService;
    this.#emailRenderer = deps.emailRenderer;
    this.#getEmailRecipients = deps.getEmailRecipients;
  }

  /**
   * Checks every incoming recommendation again. A webmention from another site can be
   * missed, and so can the removal of one.
   */
  async refreshAll() {
    await this.#updateIncomingRecommendations();
  }

  #getMentionFilter() {
    return `source:~$'/.well-known/recommendations.json'`;
  }

  async #updateIncomingRecommendations() {
    // We refresh all incoming recommendations, including:
    // - recommendations that were not verified, as the verification could have failed
    // - recommendations that were deleted previously. Implementation note: given that we have `deleted:false` as default filter in the Mention model, we need to override it here
    const filter = this.#getMentionFilter() + '+deleted:[true,false]';
    await this.#mentionsApi.refreshMentions({ filter, limit: 100 });
  }

  async #mentionToIncomingRecommendation(mention: Mention): Promise<IncomingRecommendation | null> {
    try {
      const url = new URL(
        mention.source.toString().replace(/\/.well-known\/recommendations\.json$/, ''),
      );

      // Check if we are also recommending this URL
      const existing = await this.#recommendationService.readRecommendationByUrl(url);
      const recommendingBack = !!existing;

      return {
        id: mention.id,
        title: mention.sourceSiteTitle || mention.sourceTitle,
        url,
        excerpt: mention.sourceExcerpt,
        favicon: mention.sourceFavicon,
        featuredImage: mention.sourceFeaturedImage,
        recommendingBack,
      };
    } catch (e) {
      this.#logging.error('Failed to parse mention to incoming recommendation data type', e);
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

  async listIncomingRecommendations(options: {
    page?: number;
    limit?: number | 'all';
  }): Promise<{ incomingRecommendations: IncomingRecommendation[]; meta?: MentionMeta }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 5;
    const filter = this.#getMentionFilter();

    const mentions = await this.#mentionsApi.listMentions({ filter, page, limit });
    const mentionsToIncomingRecommendations = await Promise.all(
      mentions.data.map((mention) => this.#mentionToIncomingRecommendation(mention)),
    );
    const incomingRecommendations = mentionsToIncomingRecommendations.filter(
      (recommendation): recommendation is IncomingRecommendation => !!recommendation,
    );

    return {
      incomingRecommendations,
      meta: mentions.meta,
    };
  }
}

export const incomingRecommendations = (site: Site) =>
  new IncomingRecommendationService({
    // Mentions is read when it is used: it is not ready until boot has started it.
    mentionsApi: {
      refreshMentions: (options) => mentions(site).api.refreshMentions(options),
      listMentions: (options) => mentions(site).api.listMentions(options),
    },
    recommendationService: recommendations(site),
    emailService: {
      async send(to, subject, html, text) {
        await mailer(site).send({ to, subject, html, text });
      },
    },
    async getEmailRecipients() {
      const users = await models(site).User.getEmailAlertUsers('recommendation-received');
      return users.map((model: { email: string; slug: string }) => {
        return {
          email: model.email,
          slug: model.slug,
        };
      });
    },
    emailRenderer: incomingRecommendationEmailRenderer(site),
    logging: site.log,
  });
