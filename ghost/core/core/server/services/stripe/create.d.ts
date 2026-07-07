declare function createStripeService(deps: {
    models: object;
    settingsCache: object;
    settingsHelpers: object;
    urlUtils: object;
    events: object;
    donations: object;
    gifts: object;
    staff: object;
    deploymentConfig: {get: (key: string) => unknown};
    isTestEnv: () => boolean;
    labs: object;
    membersService: object;
}): object;

export = createStripeService;
