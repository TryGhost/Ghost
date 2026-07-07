import {Knex} from 'knex';

declare function createStatsService(deps: {
    knex: Knex;
    models: object;
    urlService: object;
    cacheAdapter?: object | null;
}): {
    api: object;
    cache: object | null;
    init(): void;
};

export = createStatsService;
