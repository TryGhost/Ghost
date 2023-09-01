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
        const {BookshelfRecommendationRepository, RecommendationService, RecommendationController, WellknownService} = require('@tryghost/recommendations');

        const mentions = require('../mentions');

        if (!mentions.sendingService) {
            // eslint-disable-next-line ghost/ghost-custom/no-native-error
            throw new Error('MentionSendingService not intialized, but this is a dependency of RecommendationServiceWrapper. Check boot order.');
        }

        const wellknownService = new WellknownService({
            dir: config.getContentPath('public'),
            urlUtils
        });

        this.repository = new BookshelfRecommendationRepository(models.Recommendation, {
            sentry
        });
        this.service = new RecommendationService({
            repository: this.repository,
            wellknownService,
            mentionSendingService: mentions.sendingService
        });
        this.controller = new RecommendationController({
            service: this.service
        });

        // eslint-disable-next-line no-console
        this.service.init().catch(console.error);
    }
}

module.exports = RecommendationServiceWrapper;
