declare function resolveAdapterOptions(name: string, adapterServiceConfig: object): {
    adapterClassName: string;
    adapterConfig: object;
};

export = resolveAdapterOptions;
