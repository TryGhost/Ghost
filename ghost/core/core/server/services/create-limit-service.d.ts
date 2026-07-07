declare function createLimitService(options: {
    getHostSettings: () => object | undefined;
    db: object;
}): {
    init(): void;
    isLimited(name: string): boolean;
};

export = createLimitService;
