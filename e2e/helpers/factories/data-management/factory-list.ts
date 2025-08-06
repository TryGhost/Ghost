import {createDatabase} from '../utils/database';
import {
    EntityRegistry,
    DatabaseMetadata,
    TinyBirdApiMetadata,
    KnexPersistenceAdapter,
    TinybirdPersistenceAdapter
} from '../persistence';

import {config as appConfig} from '../../../config/config';
import {PageHitFactory, PostFactory} from '../factories';

export interface FactoryList {
    postFactory: PostFactory,
    pageHitFactory: PageHitFactory,
}

function createDatabasePersistence() {
    const db = createDatabase();
    const registry = new EntityRegistry<DatabaseMetadata>();
    registry.register('posts', {tableName: 'posts'});

    return new KnexPersistenceAdapter(db, registry);
}

function createApiPersistence() {
    const registry = new EntityRegistry<TinyBirdApiMetadata>();
    registry.register('analytics_events', {
        endpoint: '/v0/events?name=analytics_events',
        primaryKey: 'session_id'
    });

    return new TinybirdPersistenceAdapter(appConfig.tinyBird, registry);
}

export function createFactories(): FactoryList {
    const dbPersistence = createDatabasePersistence();
    const apiPersistence = createApiPersistence();

    return {
        postFactory: new PostFactory(dbPersistence),
        pageHitFactory: new PageHitFactory(apiPersistence)
    } as const;
}

export const factories = createFactories();
