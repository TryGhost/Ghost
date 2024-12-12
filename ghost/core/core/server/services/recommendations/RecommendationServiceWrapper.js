const DomainEvents = require('@tryghost/domain-events');
const {MentionCreatedEvent} = require('@tryghost/webmentions');
const logging = require('@tryghost/logging');

class RecommendationServiceWrapper {
    /**
     * @type {import('@tryghost/recommendations').RecommendationRepository}
     */
    repository;

    /**
     * @type {import('@tryghost/recommendations').BookshelfClickEventRepository}
     */
    clickEventRepository;

    /**
     * @type {import('@tryghost/recommendations').BookshelfSubscribeEventRepository}
     */
    subscribeEventRepository;

    /**
     * @type {import('@tryghost/recommendations').RecommendationController}
     */
    controller;

    /**
     * @type {import('@tryghost/recommendations').RecommendationService}
     */
    service;

    /**
     * @type {import('@tryghost/recommendations').IncomingRecommendationController}
     */
    incomingRecommendationController;

    /**
     * @type {import('@tryghost/recommendations').IncomingRecommendationService}
     */
    incomingRecommendationService;

    init() {
        const config = require('../../../shared/config');
        if (config.get('services:recommendations:enabled') === false) {
            logging.info('[Recommendations] Service is disabled via config');
            return;
        }

        if (this.repository) {
            return;
        }

        const urlUtils = require('../../../shared/url-utils');
        const models = require('../../models');
        const sentry = require('../../../shared/sentry');
        const settings = require('../settings');
        const RecommendationEnablerService = require('./RecommendationEnablerService');

        const {
            BookshelfRecommendationRepository,
            RecommendationService,
            RecommendationController,
            WellknownService,
            BookshelfClickEventRepository,
            IncomingRecommendationController,
            IncomingRecommendationService,
            IncomingRecommendationEmailRenderer,
            RecommendationMetadataService
        } = require('@tryghost/recommendations');

        const mentions = require('../mentions');

        if (!mentions.sendingService || !mentions.api) {
            // eslint-disable-next-line ghost/ghost-custom/no-native-error
            throw new Error('MentionSendingService not intialized, but this is a dependency of RecommendationServiceWrapper. Check boot order.');
        }

        const wellknownService = new WellknownService({
            dir: config.getContentPath('public'),
            urlUtils
        });

        const settingsService = settings.getSettingsBREADServiceInstance();
        const recommendationEnablerService = new RecommendationEnablerService({settingsService});

        this.repository = new BookshelfRecommendationRepository(models.Recommendation, {
            sentry
        });

        this.clickEventRepository = new BookshelfClickEventRepository(models.RecommendationClickEvent, {
            sentry
        });
        this.subscribeEventRepository = new BookshelfClickEventRepository(models.RecommendationSubscribeEvent, {
            sentry
        });

        const oembedService = require('../oembed');
        const externalRequest = require('../../../server/lib/request-external.js');

        const recommendationMetadataService = new RecommendationMetadataService({
            oembedService,
            externalRequest
        });

        this.service = new RecommendationService({
            repository: this.repository,
            recommendationEnablerService,
            wellknownService,
            mentionSendingService: mentions.sendingService,
            clickEventRepository: this.clickEventRepository,
            subscribeEventRepository: this.subscribeEventRepository,
            recommendationMetadataService
        });

        const mail = require('../mail');
        const mailer = new mail.GhostMailer();
        const emailService = {
            async send(to, subject, html, text) {
                return mailer.send({
                    to,
                    subject,
                    html,
                    text
                });
            }
        };

        this.incomingRecommendationService = new IncomingRecommendationService({
            mentionsApi: mentions.api,
            recommendationService: this.service,
            emailService,
            async getEmailRecipients() {
                const users = await models.User.getEmailAlertUsers('recommendation-received');
                return users.map((model) => {
                    return {
                        email: model.email,
                        slug: model.slug
                    };
                });
            },
            emailRenderer: new IncomingRecommendationEmailRenderer({
                staffService: require('../staff')
            })
        });

        this.controller = new RecommendationController({
            service: this.service
        });

        this.incomingRecommendationController = new IncomingRecommendationController({
            service: this.incomingRecommendationService
        });

        this.service.init().catch(logging.error);
        this.incomingRecommendationService.init().catch(logging.error);

        const PATH_SUFFIX = '/.well-known/recommendations.json';

        function isRecommendationUrl(url) {
            return url.pathname.endsWith(PATH_SUFFIX);
        }

        // Add mapper to WebmentionMetadata
        mentions.metadata.addMapper((url) => {
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
                logging.info('[INCOMING RECOMMENDATION] Received recommendation from ' + event.data.mention.source);
                await this.incomingRecommendationService.sendRecommendationEmail(event.data.mention);
            }
        });
    }
}

module.exports = RecommendationServiceWrapper;
