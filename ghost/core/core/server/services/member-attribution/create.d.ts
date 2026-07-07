declare function createMemberAttributionService(deps: {
    models: object;
    urlUtils: object;
    settingsCache: object;
    urlService: object;
}): {
    service: object;
    attributionBuilder: object;
    outboundLinkTagger: object;
    init(): void;
};

export = createMemberAttributionService;
