declare function createSettingsHelpers(deps: {
    settingsCache: object;
    urlUtils: object;
    configView: {get: (key: string) => unknown};
    labs: object;
    limits: object;
}): object;

export = createSettingsHelpers;
