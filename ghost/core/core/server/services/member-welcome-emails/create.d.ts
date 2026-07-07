declare function createMemberWelcomeEmailService(deps: {
    models: object;
    events: object;
    settingsCache: object;
}): {
    readonly api: object | null;
    init(): void;
};

export = createMemberWelcomeEmailService;
