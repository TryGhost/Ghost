import { defineService } from '../../../../bootstrap/transition/define-service';
import mentions from '../mentions';
import staff from '../staff';
import { isRecommendationUrl } from './recommendation-url';
import type {
  IncomingRecommendationController,
  IncomingRecommendationService,
  RecommendationController,
  WellknownController,
} from './service';

type Mention = Parameters<IncomingRecommendationService['sendRecommendationEmail']>[0];

export type RecommendationsService = {
  controller: RecommendationController;
  wellknownController: WellknownController;
  incomingRecommendationController: IncomingRecommendationController;
  /** Emails staff when a verified mention is an incoming recommendation. */
  notifyOfMention(mention: Mention & { verified: boolean }): Promise<void>;
  /** Refreshes what recommendations cache from other sites, without waiting for it. */
  refreshInBackground(): void;
};

const MentionCreatedEvent = require('../mentions/mention-created-event');

export default defineService('Recommendations', {
  // Mentions sends and reads the mentions recommendations travel as; Staff addresses the emails.
  needs: { mentions, staff },
  create: ({ mentions: mentionsService, staff: staffService }): RecommendationsService => {
    const {
      BookshelfRecommendationRepository,
      RecommendationService,
      RecommendationController,
      WellknownService,
      WellknownController,
      BookshelfClickEventRepository,
      IncomingRecommendationController,
      IncomingRecommendationService,
      IncomingRecommendationEmailRenderer,
      RecommendationMetadataService,
    }: typeof import('./service') = require('./service');
    const RecommendationEnablerService = require('./recommendation-enabler-service');
    const logging = require('@tryghost/logging');
    const sentry = require('../../../shared/sentry');
    const urlUtils = require('../../../shared/url-utils').default;
    const models = require('../../models');
    const mail = require('../../lib/mail');
    const externalRequest = require('../../lib/request-external');
    const oembedService = require('../oembed');
    const settings = require('../settings');

    const recommendationEnablerService = new RecommendationEnablerService({
      settingsService: settings.getSettingsBREADServiceInstance(),
    });
    const repository = new BookshelfRecommendationRepository(models.Recommendation, {
      sentry,
      logging,
    });
    const clickEventRepository = new BookshelfClickEventRepository(
      models.RecommendationClickEvent,
      {
        sentry,
        logging,
      },
    );
    const subscribeEventRepository = new BookshelfClickEventRepository(
      models.RecommendationSubscribeEvent,
      {
        sentry,
        logging,
      },
    );

    const service = new RecommendationService({
      repository,
      recommendationEnablerService,
      wellknownService: new WellknownService({ urlUtils }),
      mentionSendingService: mentionsService.sendingService,
      clickEventRepository,
      subscribeEventRepository,
      recommendationMetadataService: new RecommendationMetadataService({
        oembedService,
        externalRequest,
      }),
      logging,
    });

    const mailer = new mail.GhostMailer();
    const incomingRecommendationService = new IncomingRecommendationService({
      mentionsApi: mentionsService.api,
      recommendationService: service,
      emailService: {
        async send(to, subject, html, text) {
          return mailer.send({ to, subject, html, text });
        },
      },
      async getEmailRecipients() {
        const users = await models.User.getEmailAlertUsers('recommendation-received');
        return users.map((model: { email: string; slug: string }) => {
          return {
            email: model.email,
            slug: model.slug,
          };
        });
      },
      emailRenderer: new IncomingRecommendationEmailRenderer({
        staffService: { api: staffService },
      }),
      logging,
    });

    return {
      controller: new RecommendationController({ service }),
      wellknownController: new WellknownController({ service }),
      incomingRecommendationController: new IncomingRecommendationController({
        service: incomingRecommendationService,
      }),
      async notifyOfMention(mention) {
        if (mention.verified && isRecommendationUrl(mention.source)) {
          logging.info('[INCOMING RECOMMENDATION] Received recommendation from ' + mention.source);
          await incomingRecommendationService.sendRecommendationEmail(mention);
        }
      },
      refreshInBackground() {
        service.init().catch(logging.error);
        incomingRecommendationService.init().catch(logging.error);
      },
    };
  },
  listeners: [
    {
      event: MentionCreatedEvent,
      handle: (service, event: { data: { mention: Mention & { verified: boolean } } }) =>
        service.notifyOfMention(event.data.mention),
    },
  ],
  // Work with no request behind it: refreshing what is cached from other sites.
  start(service, { foundation }) {
    if (foundation.config.get('services:recommendations:enabled') === false) {
      foundation.logger.info('[Recommendations] Background refreshes are disabled via config');
      return;
    }
    service.refreshInBackground();
  },
});
