import { defineService } from '../../../kernel/define-service';
import { isRecommendationUrl, PATH_SUFFIX } from './recommendation-url';
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
};

// Boot awaits Mentions before this root, so the facade is ready here. Every
// construction failure happens before the detached refreshes, the mentions mapper
// and the event subscription, so a failed attempt leaves nothing to release.
export default defineService('Recommendations', (): RecommendationsService => {
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
  const config = require('../../../shared/config');
  const logging = require('@tryghost/logging');
  const sentry = require('../../../shared/sentry');
  const urlUtils = require('../../../shared/url-utils').default;
  const models = require('../../models');
  const mail = require('../../lib/mail');
  const externalRequest = require('../../lib/request-external');
  const DomainEvents = require('@tryghost/domain-events');
  const MentionCreatedEvent = require('../mentions/mention-created-event');
  const mentions = require('../mentions').default;
  const oembedService = require('../oembed');
  const settings = require('../settings');
  const staff = require('../staff').default;
  // The renderer reads the ready Staff service for each email.
  const staffService = {
    get api() {
      return staff.service;
    },
  };

  const mentionsFacade = mentions.service;

  const recommendationEnablerService = new RecommendationEnablerService({
    settingsService: settings.getSettingsBREADServiceInstance(),
  });
  const repository = new BookshelfRecommendationRepository(models.Recommendation, {
    sentry,
    logging,
  });
  const clickEventRepository = new BookshelfClickEventRepository(models.RecommendationClickEvent, {
    sentry,
    logging,
  });
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
    mentionSendingService: mentionsFacade.sendingService,
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
    mentionsApi: mentionsFacade.api,
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
    emailRenderer: new IncomingRecommendationEmailRenderer({ staffService }),
    logging,
  });

  const result = {
    controller: new RecommendationController({ service }),
    wellknownController: new WellknownController({ service }),
    incomingRecommendationController: new IncomingRecommendationController({
      service: incomingRecommendationService,
    }),
  };

  // Side effects come last, in this order; nothing above needs unwinding when it throws.
  if (config.get('services:recommendations:enabled') === false) {
    logging.info('[Recommendations] Background refreshes are disabled via config');
  } else {
    service.init().catch(logging.error);
    incomingRecommendationService.init().catch(logging.error);
  }

  mentionsFacade.metadata.addMapper((url: URL) => {
    if (isRecommendationUrl(url)) {
      const newUrl = new URL(url.toString());
      newUrl.pathname = newUrl.pathname.slice(0, -PATH_SUFFIX.length);
      return newUrl;
    }
  });

  DomainEvents.subscribe(
    MentionCreatedEvent,
    async (event: { data: { mention: Mention & { verified: boolean } } }) => {
      if (event.data.mention.verified && isRecommendationUrl(event.data.mention.source)) {
        logging.info(
          '[INCOMING RECOMMENDATION] Received recommendation from ' + event.data.mention.source,
        );
        await incomingRecommendationService.sendRecommendationEmail(event.data.mention);
      }
    },
  );

  return result;
});
