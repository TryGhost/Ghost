const PATH_SUFFIX = '/.well-known/recommendations.json';

/**
 * @param {URL} url
 */
function isRecommendationUrl(url) {
  return url.pathname.endsWith(PATH_SUFFIX);
}

/**
 * @typedef {object} RecommendationServiceWrapperDeps
 * @property {{get(key: string): unknown}} config
 * @property {{info(...args: unknown[]): void, error(...args: unknown[]): void}} logging
 * @property {{captureException(err: unknown): void}} sentry
 * @property {{relativeToAbsolute(url: string): string}} urlUtils
 * @property {object} models
 * @property {{GhostMailer: new () => {send(message: object): Promise<unknown>}}} mail
 * @property {object} externalRequest
 * @property {{subscribe(Event: unknown, handler: (event: unknown) => Promise<void>): void}} DomainEvents
 * @property {unknown} MentionCreatedEvent
 * @property {import('../mentions').default} mentions
 * @property {object} oembedService
 * @property {import('../settings/settings-service')} settings
 * @property {import('../staff')} staffService
 */

class RecommendationServiceWrapper {
  /**
   * @type {import('./service').RecommendationRepository}
   */
  repository;

  /**
   * @type {import('./service').BookshelfClickEventRepository}
   */
  clickEventRepository;

  /**
   * @type {import('./service').BookshelfSubscribeEventRepository}
   */
  subscribeEventRepository;

  /**
   * @type {import('./service').RecommendationController}
   */
  controller;

  /**
   * @type {import('./service').WellknownController}
   */
  wellknownController;

  /**
   * @type {import('./service').RecommendationService}
   */
  service;

  /**
   * @type {import('./service').IncomingRecommendationController}
   */
  incomingRecommendationController;

  /**
   * @type {import('./service').IncomingRecommendationService}
   */
  incomingRecommendationService;

  /** @type {RecommendationServiceWrapperDeps} */
  #deps;

  /**
   * @param {RecommendationServiceWrapperDeps} deps
   */
  constructor(deps) {
    this.#deps = deps;
  }

  init() {
    if (this.repository) {
      return;
    }

    const {
      config,
      logging,
      sentry,
      urlUtils,
      models,
      mail,
      externalRequest,
      DomainEvents,
      MentionCreatedEvent,
      mentions,
      oembedService,
      settings,
      staffService,
    } = this.#deps;
    const RecommendationEnablerService = require('./recommendation-enabler-service');

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
    } = require('./service');

    // Boot awaits Mentions before this group; reading the facade earlier throws.
    const mentionsFacade = mentions.service;

    const wellknownService = new WellknownService({
      urlUtils,
    });

    const settingsService = settings.getSettingsBREADServiceInstance();
    const recommendationEnablerService = new RecommendationEnablerService({ settingsService });

    this.repository = new BookshelfRecommendationRepository(models.Recommendation, {
      sentry,
      logging,
    });

    this.clickEventRepository = new BookshelfClickEventRepository(models.RecommendationClickEvent, {
      sentry,
      logging,
    });
    this.subscribeEventRepository = new BookshelfClickEventRepository(
      models.RecommendationSubscribeEvent,
      {
        sentry,
        logging,
      },
    );

    const recommendationMetadataService = new RecommendationMetadataService({
      oembedService,
      externalRequest,
    });

    this.service = new RecommendationService({
      repository: this.repository,
      recommendationEnablerService,
      wellknownService,
      mentionSendingService: mentionsFacade.sendingService,
      clickEventRepository: this.clickEventRepository,
      subscribeEventRepository: this.subscribeEventRepository,
      recommendationMetadataService,
      logging,
    });

    const mailer = new mail.GhostMailer();
    const emailService = {
      async send(to, subject, html, text) {
        return mailer.send({
          to,
          subject,
          html,
          text,
        });
      },
    };

    this.incomingRecommendationService = new IncomingRecommendationService({
      mentionsApi: mentionsFacade.api,
      recommendationService: this.service,
      emailService,
      async getEmailRecipients() {
        const users = await models.User.getEmailAlertUsers('recommendation-received');
        return users.map((model) => {
          return {
            email: model.email,
            slug: model.slug,
          };
        });
      },
      emailRenderer: new IncomingRecommendationEmailRenderer({
        staffService,
      }),
      logging,
    });

    this.controller = new RecommendationController({
      service: this.service,
    });

    this.wellknownController = new WellknownController({
      service: this.service,
    });

    this.incomingRecommendationController = new IncomingRecommendationController({
      service: this.incomingRecommendationService,
    });

    if (config.get('services:recommendations:enabled') === false) {
      logging.info('[Recommendations] Background refreshes are disabled via config');
    } else {
      this.service.init().catch(logging.error);
      this.incomingRecommendationService.init().catch(logging.error);
    }

    // Add mapper to WebmentionMetadata
    mentionsFacade.metadata.addMapper((url) => {
      if (isRecommendationUrl(url)) {
        // Strip p
        const newUrl = new URL(url.toString());
        newUrl.pathname = newUrl.pathname.slice(0, -PATH_SUFFIX.length);
        return newUrl;
      }
    });

    // Listen for incoming webmentions
    DomainEvents.subscribe(MentionCreatedEvent, async (event) => {
      // Check if this is a recommendation
      if (event.data.mention.verified && isRecommendationUrl(event.data.mention.source)) {
        logging.info(
          '[INCOMING RECOMMENDATION] Received recommendation from ' + event.data.mention.source,
        );
        await this.incomingRecommendationService.sendRecommendationEmail(event.data.mention);
      }
    });
  }
}

module.exports = RecommendationServiceWrapper;
