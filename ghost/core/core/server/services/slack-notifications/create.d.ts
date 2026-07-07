declare function createSlackNotificationsService(deps: {
    domainEvents: object;
    urlUtils: object;
    siteConfig: object;
}): {
    api: object;
    init(): void;
};

export = createSlackNotificationsService;
