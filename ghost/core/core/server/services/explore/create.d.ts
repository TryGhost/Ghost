declare function createExploreService(deps: {
    models: object;
    membersService: object;
    postsService: object;
    publicConfigService: object;
    statsService: object;
    stripeService: object;
}): object;

export = createExploreService;
