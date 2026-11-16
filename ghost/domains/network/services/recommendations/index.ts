import { defineService } from '../../../../core/kernel/define-service';
import { isRecommendationUrl, PATH_SUFFIX } from '../../entities/recommendation-url.value';
import type { IncomingRecommendationController } from '../../http/incoming-recommendation.controller';
import type { RecommendationController } from '../../http/recommendation.controller';
import type { IncomingRecommendationService } from './incoming-recommendation.service';
import type { RecommendationService } from './recommendation.service';

export type RecommendationsService = {
  service: RecommendationService;
  incomingService: IncomingRecommendationService;
  controller: RecommendationController;
  incomingRecommendationController: IncomingRecommendationController;
  /** Run by the jobs in ../../jobs some time after Ghost has started. */
  refreshRecommendationMetadata(): Promise<void>;
  refreshIncomingRecommendations(): Promise<void>;
};

// The domain layer starts this root after everything boot.js initializes, so
// Mentions and Staff are ready whenever they are used. They are still legacy
// code, so they are wired here and nowhere else in the domain.
//
// Mentions is read when it is used, with one exception: the URL mapper below is
// registered on it while this root is built. Every construction failure happens
// before that registration, so a failed attempt leaves nothing to release.
export default defineService('Recommendations', (): RecommendationsService => {
  const {
    BookshelfRecommendationRepository,
  }: typeof import('../../repositories/bookshelf-recommendation.repository') = require('../../repositories/bookshelf-recommendation.repository');
  const {
    BookshelfClickEventRepository,
  }: typeof import('../../repositories/bookshelf-click-event.repository') = require('../../repositories/bookshelf-click-event.repository');
  const {
    RecommendationService,
  }: typeof import('./recommendation.service') = require('./recommendation.service');
  const {
    RecommendationController,
  }: typeof import('../../http/recommendation.controller') = require('../../http/recommendation.controller');
  const {
    WellknownService,
  }: typeof import('./well-known.service') = require('./well-known.service');
  const {
    IncomingRecommendationController,
  }: typeof import('../../http/incoming-recommendation.controller') = require('../../http/incoming-recommendation.controller');
  const {
    IncomingRecommendationService,
  }: typeof import('./incoming-recommendation.service') = require('./incoming-recommendation.service');
  const {
    IncomingRecommendationEmailRenderer,
  }: typeof import('../../emails/incoming-recommendation-email.renderer') = require('../../emails/incoming-recommendation-email.renderer');
  const {
    RecommendationMetadataService,
  }: typeof import('./recommendation-metadata.service') = require('./recommendation-metadata.service');
  const {
    RecommendationEnablerService,
  }: typeof import('./recommendation-enabler.service') = require('./recommendation-enabler.service');
  // Another domain, through its public surface.
  const {
    describeExternalPage,
  }: typeof import('../../../publishing/actions/describe-external-page.action') = require('../../../publishing/actions/describe-external-page.action');
  // Foundation and shared.
  const config = require('../../../../core/shared/config');
  const logging = require('@tryghost/logging');
  const sentry = require('../../../../core/shared/sentry');
  const urlUtils = require('../../../../core/shared/url-utils').default;
  const mail = require('../../../../core/server/lib/mail');
  const externalRequest = require('../../../../core/server/lib/request-external');
  const settings = require('../../../../core/server/services/settings');
  // Legacy code, counted by the domain-legacy-imports rule.
  const models = require('../../../../core/server/models');
  const mentions = require('../../../../core/server/services/mentions').default;
  const staff = require('../../../../core/server/services/staff').default;

  // The renderer reads the ready Staff service for each email.
  const staffService = {
    get api() {
      return staff.service;
    },
  };

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
    // Mentions is another root: ask it when a mention is sent, not now.
    mentionSendingService: {
      sendAll: (options) => mentions.service.sendingService.sendAll(options),
    },
    clickEventRepository,
    subscribeEventRepository,
    recommendationMetadataService: new RecommendationMetadataService({
      // Describing a page on another site is publishing's work. Its action finds
      // its own service when a page is fetched, not now.
      oembedService: {
        fetchOembedDataFromUrl: (url, type) => describeExternalPage(url, { type }),
      },
      externalRequest,
    }),
    logging,
  });

  const mailer = new mail.GhostMailer();
  const incomingService = new IncomingRecommendationService({
    mentionsApi: {
      refreshMentions: (options) => mentions.service.api.refreshMentions(options),
      listMentions: (options) => mentions.service.api.listMentions(options),
    },
    recommendationService: service,
    emailService: {
      async send(to, subject, html, text) {
        return mailer.send({ to, subject, html, text });
      },
    },
    // Who receives staff alerts is a staff user's own preference. That belongs
    // to identity, which does not exist yet, so the user model is asked.
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

  const refreshesEnabled = config.get('services:recommendations:enabled') !== false;
  if (!refreshesEnabled) {
    logging.info('[Recommendations] Background refreshes are disabled via config');
  }

  // Registered last: nothing above needs unwinding when it throws.
  mentions.service.metadata.addMapper((url: URL) => {
    if (isRecommendationUrl(url)) {
      const newUrl = new URL(url.toString());
      newUrl.pathname = newUrl.pathname.slice(0, -PATH_SUFFIX.length);
      return newUrl;
    }
  });

  return {
    service,
    incomingService,
    controller: new RecommendationController({ service }),
    incomingRecommendationController: new IncomingRecommendationController({
      service: incomingService,
    }),
    async refreshRecommendationMetadata() {
      if (refreshesEnabled) {
        await service.refreshOnBoot();
      }
    },
    async refreshIncomingRecommendations() {
      // Skipped in development, as it always has been: it fetches other sites.
      if (refreshesEnabled && process.env.NODE_ENV !== 'development') {
        await incomingService.refreshOnBoot();
      }
    },
  };
});
