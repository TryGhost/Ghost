declare function createCustomThemeSettingsService(deps: {
    models: object;
    customThemeSettingsCache: object;
}): {
    api: object;
    init(): void;
};

export = createCustomThemeSettingsService;
