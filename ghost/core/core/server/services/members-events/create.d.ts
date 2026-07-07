import {Knex} from 'knex';

declare function createMembersEventsService(deps: {
    models: object;
    domainEvents: object;
    events: object;
    settingsCache: object;
    knex: Knex;
    labs: object;
    members: object;
    deploymentConfig: {get: (key: string) => unknown};
}): {
    eventStorage: object;
    lastSeenAtCache: object;
    lastSeenAtUpdater: object;
    init(): void;
    clearLastSeenAtCache(): void;
};

export = createMembersEventsService;
