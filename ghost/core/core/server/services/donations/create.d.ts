declare function createDonationService(deps: {models: object}): {
    repository: object;
    init(): void;
};

export = createDonationService;
