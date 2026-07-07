declare class EmailServiceWrapper {
    constructor(deps: object);
    service: object;
    renderer: object;
    controller: object;
    init(options?: {ghostServer?: object}): void;
}

export = EmailServiceWrapper;
