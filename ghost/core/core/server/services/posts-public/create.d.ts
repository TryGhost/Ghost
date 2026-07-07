declare function createPostsPublicService(deps: {
    events: object;
    cacheAdapter?: object | null;
}): {
    api: {cache: object | null};
    init(): void;
};

export = createPostsPublicService;
