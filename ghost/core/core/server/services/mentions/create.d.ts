declare function createMentionsService(deps: {
    models: object;
    events: object;
    domainEvents: object;
    urlUtils: object;
    settingsCache: object;
    urlService: object;
    jobsService: object;
}): {
    api: object;
    repository: object;
    controller: object;
    metadata: object;
    sendingService: object;
    init(): Promise<void>;
};

export = createMentionsService;
