declare function createEmailAddressService(deps: {
    labs: object;
    settingsHelpers: object;
    configView: {get: (key: string) => unknown};
}): {
    service: object;
    init(): void;
};

export = createEmailAddressService;
