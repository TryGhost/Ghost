declare function createDomainEvents(): {
    subscribe(Event: {name: string}, handler: (event: object) => Promise<void> | void): void;
    dispatch(event: object): void;
    dispatchRaw(name: string, data: object): void;
    allSettled(): Promise<void>;
};

export = createDomainEvents;
