declare class RouterRegistry {
    setRoute(routerName: string, route: string): void;
    setRouter(name: string, router: object): void;
    getAllRoutes(): object[];
    getRouter(name: string): object;
    getRouterByName(name: string): object | undefined;
    getRssUrl(options: object): string | null;
    resetAllRoutes(): void;
    resetAllRouters(): void;
}

export = RouterRegistry;
