declare function createRecommendationsService(deps: {
    models: object;
    domainEvents: object;
    urlUtils: object;
    siteConfig: object;
    deploymentConfig: {get: (key: string) => unknown};
    mentions: object;
    staff: object;
    settingsBREADService: object;
    oembedService: object;
}): {
    repository?: object;
    controller?: object;
    service?: object;
    incomingRecommendationService?: object;
    incomingRecommendationController?: object;
    init(): void;
};

export = createRecommendationsService;
