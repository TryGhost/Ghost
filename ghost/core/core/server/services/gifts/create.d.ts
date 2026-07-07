declare function createGiftService(deps: {
    models: object;
    domainEvents: object;
    settingsCache: object;
    urlUtils: object;
    settingsHelpers: object;
    tiers: object;
    staff: object;
    membersService: object;
    t: (key: string) => string;
}): {
    service: object | null;
    controller: object | null;
    init(options?: {apiUrl?: string; schedulerAdapter?: object; internalKeys?: object}): Promise<void>;
};

export = createGiftService;
