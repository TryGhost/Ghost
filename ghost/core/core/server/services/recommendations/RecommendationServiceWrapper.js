class RecommendationServiceWrapper {
    /**
     * @type {import('@tryghost/recommendations').RecommendationRepository}
     */
    repository;

    /**
     * @type {import('@tryghost/recommendations').RecommendationController}
     */
    controller;

    /**
     * @type {import('@tryghost/recommendations').RecommendationService}
     */
    service;

    init() {
        if (this.repository) {
            return;
        }

        const config = require('../../../shared/config');
        const urlUtils = require('../../../shared/url-utils');
        const models = require('../../models');
        const sentry = require('../../../shared/sentry');
        const settings = require('../settings');
        const RecommendationEnablerService = require('./RecommendationEnablerService');
        const {
            BookshelfRecommendationRepository,
            RecommendationService,
            RecommendationController,
            WellknownService
        } = require('@tryghost/recommendations');

        const mentions = require('../mentions');

        if (!mentions.sendingService) {
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
        this.service = new RecommendationService({
            repository: this.repository,
            recommendationEnablerService,
            wellknownService,
            mentionSendingService: mentions.sendingService
        });
        this.controller = new RecommendationController({
            service: this.service
        });

        // eslint-disable-next-line no-console
        this.service.init().catch(console.error);

        // Add mapper to WebmentionMetadata
        mentions.metadata.addMapper((url) => {
            const p = '/.well-known/recommendations.json';
            if (url.pathname.endsWith(p)) {
                // Strip p
                const newUrl = new URL(url.toString());
                newUrl.pathname = newUrl.pathname.slice(0, -p.length);
                return newUrl;
            }
        });
    }
}

module.exports = RecommendationServiceWrapper;
