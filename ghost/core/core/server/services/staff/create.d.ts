declare function createStaffService(deps: {
    models: object;
    domainEvents: object;
    settingsCache: object;
    urlUtils: object;
    memberAttribution: object;
    settingsHelpers: object;
    labs: object;
}): {
    api: object;
    init(): void;
};

export = createStaffService;
