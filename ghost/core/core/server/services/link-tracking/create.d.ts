declare function createLinkTrackingService(deps: {
    models: object;
    urlUtils: object;
    domainEvents: object;
    linkRedirection: {service: object; linkRedirectRepository: object};
}): {
    service: object;
    linkClickRepository: object;
    init(): Promise<void>;
};

export = createLinkTrackingService;
