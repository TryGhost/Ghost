declare function createAudienceFeedbackService(deps: {
    models: object;
    urlUtils: object;
    urlService: object;
}): {
    repository: object;
    service: object;
    controller: object;
    init(): void;
};

export = createAudienceFeedbackService;
