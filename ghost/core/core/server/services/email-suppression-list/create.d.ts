declare function createEmailSuppressionList(deps: {
    models: object;
    settingsCache: object;
    configView: {get: (key: string) => unknown};
    labs: object;
}): object;

export = createEmailSuppressionList;
