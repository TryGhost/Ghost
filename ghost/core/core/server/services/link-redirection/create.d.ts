declare function createLinkRedirectsService(deps: {
    models: object;
    urlUtils: object;
    events: object;
    cacheAdapter?: object | null;
}): {
    service: object;
    linkRedirectRepository: object;
    init(): void;
};

export = createLinkRedirectsService;
