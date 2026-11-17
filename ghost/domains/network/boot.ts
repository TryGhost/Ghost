import { z } from 'zod';
import { defineDomain } from '@tryghost/kernel/domains/definitions';
import type { Logger } from '@tryghost/kernel/logging';
import type { IncomingRecommendationEmailRenderer } from './emails/incoming-recommendation-email.renderer';
import type { BookshelfClickEventRepository } from './repositories/bookshelf-click-event.repository';
import type { BookshelfRecommendationRepository } from './repositories/bookshelf-recommendation.repository';
import type { IncomingRecommendationService } from './services/recommendations/incoming-recommendation.service';
import type { RecommendationEnablerService } from './services/recommendations/recommendation-enabler.service';
import type { RecommendationMetadataService } from './services/recommendations/recommendation-metadata.service';
import type { RecommendationService } from './services/recommendations/recommendation.service';
import type { WellknownService } from './services/recommendations/well-known.service';

// What each class in the domain asks for, taken from its constructor, so this
// file states every outside dependency in the terms the domain already uses.
type Needs<Class extends abstract new (...args: never[]) => unknown> =
  ConstructorParameters<Class>[0];
type Incoming = Needs<typeof IncomingRecommendationService>;

/** The part of Ghost's config the network domain reads, and its shape. */
const RecommendationsConfig = z.object({
  /** False turns off the two background refreshes. Anything else leaves them on. */
  enabled: z.unknown().optional(),
});

/**
 * Everything the network domain's service roots need from outside the domain.
 * The roots import nothing but the domain and the kernel; this is the whole
 * list of what the domain takes from the rest of Ghost.
 */
export interface NetworkDependencies {
  // Foundation.
  readonly logging: Pick<Logger, 'info' | 'error'>;
  /** Whether the background refreshes run, from `services:recommendations`. */
  readonly refreshesEnabled: boolean;
  /** The environment Ghost runs as, from config's `env`. */
  readonly environment: string;

  // Shared.
  readonly sentry: ConstructorParameters<typeof BookshelfRecommendationRepository>[1]['sentry'];
  readonly urlUtils: Needs<typeof WellknownService>['urlUtils'];
  readonly externalRequest: Needs<typeof RecommendationMetadataService>['externalRequest'];
  readonly settingsService: Needs<typeof RecommendationEnablerService>['settingsService'];
  readonly sendEmail: Incoming['emailService']['send'];

  // Another domain, through its public action.
  readonly describeExternalPage: (
    url: string,
    options: { type: 'mention' },
  ) => ReturnType<
    Needs<typeof RecommendationMetadataService>['oembedService']['fetchOembedDataFromUrl']
  >;

  // This domain's own models, which have moved in but are not reshaped.
  readonly models: {
    readonly Recommendation: ConstructorParameters<typeof BookshelfRecommendationRepository>[0];
    readonly RecommendationClickEvent: ConstructorParameters<
      typeof BookshelfClickEventRepository
    >[0];
    readonly RecommendationSubscribeEvent: ConstructorParameters<
      typeof BookshelfClickEventRepository
    >[0];
  };

  // Code that is not in a domain yet.
  readonly mentions: Incoming['mentionsApi'] &
    Needs<typeof RecommendationService>['mentionSendingService'] & {
      /** Lets Mentions resolve a recommendation URL to the site it points at. */
      addUrlMapper(mapper: (url: URL) => URL | undefined): void;
    };
  readonly getStaffAlertRecipients: Incoming['getEmailRecipients'];
  readonly staffService: Needs<typeof IncomingRecommendationEmailRenderer>['staffService'];
}

export default defineDomain<NetworkDependencies>({
  // The foundation is handed in. Everything else is imported here, when the
  // domain starts, and nowhere else in the domain.
  dependencies: ({ config, logging }) => {
    // Shared.
    const sentry = require('../../core/shared/sentry');
    const urlUtils = require('../../core/shared/url-utils').default;
    const mail = require('../../core/server/lib/mail');
    const externalRequest = require('../../core/server/lib/request-external');
    const settings = require('../../core/server/services/settings');
    // Another domain, through its public surface.
    const {
      describeExternalPage,
    }: typeof import('../publishing/actions/describe-external-page.action') = require('../publishing/actions/describe-external-page.action');
    // Legacy code, counted by the domain-legacy-imports rule.
    const models = require('../../core/server/models');
    const mentions = require('../../core/server/services/mentions').default;
    const staff = require('../../core/server/services/staff').default;

    const mailer = new mail.GhostMailer();
    // Parsed once, here: a value the domain cannot read stops Ghost starting.
    const recommendations = config.slice('services:recommendations', RecommendationsConfig);

    return {
      logging,
      refreshesEnabled: recommendations.enabled !== false,
      environment: String(config.get('env')),

      sentry,
      urlUtils,
      externalRequest,
      settingsService: settings.getSettingsBREADServiceInstance(),
      sendEmail: async (to, subject, html, text) => mailer.send({ to, subject, html, text }),

      describeExternalPage,

      models: {
        Recommendation: models.Recommendation,
        RecommendationClickEvent: models.RecommendationClickEvent,
        RecommendationSubscribeEvent: models.RecommendationSubscribeEvent,
      },

      // Mentions and Staff are other roots, started by boot.js before any
      // domain. Each is asked when it is used, not now.
      mentions: {
        sendAll: (options) => mentions.service.sendingService.sendAll(options),
        refreshMentions: (options) => mentions.service.api.refreshMentions(options),
        listMentions: (options) => mentions.service.api.listMentions(options),
        addUrlMapper: (mapper) => mentions.service.metadata.addMapper(mapper),
      },
      // Who receives staff alerts is a staff user's own preference. That belongs
      // to identity, which does not exist yet, so the user model is asked.
      async getStaffAlertRecipients() {
        const users = await models.User.getEmailAlertUsers('recommendation-received');
        return users.map((model: { email: string; slug: string }) => {
          return {
            email: model.email,
            slug: model.slug,
          };
        });
      },
      // The renderer reads the ready Staff service for each email.
      staffService: {
        get api() {
          return staff.service;
        },
      },
    };
  },
});
