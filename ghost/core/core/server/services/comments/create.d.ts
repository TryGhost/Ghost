import {Knex} from 'knex';

declare function createCommentsService(deps: {
    models: object;
    settingsCache: object;
    urlUtils: object;
    knex: Knex;
    urlService: object;
    members: object;
    settingsHelpers: object;
    labs: object;
}): {
    api: object;
    controller: object;
    init(): void;
};

export = createCommentsService;
