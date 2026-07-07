declare function createNewslettersService(deps: {
    models: object;
    urlUtils: object;
    limits: object;
    mail: object;
    labs: object;
    emailAddressService: object;
}): object;

export = createNewslettersService;
