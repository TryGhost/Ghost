import { defineService } from '@tryghost/kernel/define-service';
import type { NetworkDependencies } from '../../boot';
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

// Everything from outside the domain arrives from ../../boot.ts. This file
// imports the domain and the kernel, and nothing else.
//
// Mentions is asked when it is used, with one exception: the URL mapper below
// is registered on it while this root is built. Every construction failure
// happens before that registration, so a failed attempt leaves nothing to
// release.
export default defineService(
  'Recommendations',
  (outside: NetworkDependencies): RecommendationsService => {
    const { logging, sentry, models, mentions } = outside;
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
    const recommendationEnablerService = new RecommendationEnablerService({
      settingsService: outside.settingsService,
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
      wellknownService: new WellknownService({ urlUtils: outside.urlUtils }),
      mentionSendingService: mentions,
      clickEventRepository,
      subscribeEventRepository,
      recommendationMetadataService: new RecommendationMetadataService({
        // Describing a page on another site is publishing's work. Its action finds
        // its own service when a page is fetched, not now.
        oembedService: {
          fetchOembedDataFromUrl: (url, type) => outside.describeExternalPage(url, { type }),
        },
        externalRequest: outside.externalRequest,
      }),
      logging,
    });

    const incomingService = new IncomingRecommendationService({
      mentionsApi: mentions,
      recommendationService: service,
      emailService: { send: outside.sendEmail },
      getEmailRecipients: outside.getStaffAlertRecipients,
      emailRenderer: new IncomingRecommendationEmailRenderer({
        staffService: outside.staffService,
      }),
      logging,
    });

    const { refreshesEnabled } = outside;
    if (!refreshesEnabled) {
      logging.info('[Recommendations] Background refreshes are disabled via config');
    }

    // Registered last: nothing above needs unwinding when it throws.
    mentions.addUrlMapper((url: URL) => {
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
        if (refreshesEnabled && outside.environment !== 'development') {
          await incomingService.refreshOnBoot();
        }
      },
    };
  },
);
