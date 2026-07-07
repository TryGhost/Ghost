declare function createTiersService(deps: {models: object; domainEvents: object}): {
    api: object;
    repository: object;
    init(): Promise<void>;
};

export = createTiersService;
