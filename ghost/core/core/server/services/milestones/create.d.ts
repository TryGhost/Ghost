import {Knex} from 'knex';

declare function createMilestonesService(deps: {
    models: object;
    domainEvents: object;
    knex: Knex;
    settingsCache: object;
    getMilestonesConfig: () => object | undefined;
}): {
    api: object;
    init(): Promise<void>;
    run(): Promise<object>;
    scheduleRun(customTimeout?: number): Promise<object>;
    initAndRun(customTimeout?: number): Promise<object>;
};

export = createMilestonesService;
