declare function createMemberWelcomeEmailService(deps: {
    models: object;
    events: object;
    settingsCache: object;
}): {
    api: object | null;
    init(): void;
};

export = createMemberWelcomeEmailService;
