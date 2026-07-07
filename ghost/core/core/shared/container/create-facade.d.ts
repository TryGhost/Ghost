declare function createFacade<T extends object = Record<string, unknown>>(
    registrationName: string,
    createLegacy: () => object
): T;

export = createFacade;
