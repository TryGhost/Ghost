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

        const {InMemoryRecommendationRepository, RecommendationService, RecommendationController} = require('@tryghost/recommendations');

        this.repository = new InMemoryRecommendationRepository();
        this.service = new RecommendationService({
            repository: this.repository
        });
        this.controller = new RecommendationController({
            service: this.service
        });
    }
}

module.exports = RecommendationServiceWrapper;
