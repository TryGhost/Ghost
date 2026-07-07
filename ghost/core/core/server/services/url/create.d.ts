declare function createUrlService(deps: {
    siteConfig: object;
    deploymentConfig: {get: (key: string) => unknown};
    models: object;
}): object;

export = createUrlService;
