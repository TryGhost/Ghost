import {
    EntityRegistry,
    DatabaseMetadata,
    TinyBirdApiMetadata,
    KnexPersistenceAdapter,
    TinybirdPersistenceAdapter
} from '../persistence';

import {config, config as appConfig} from '../../../config/config';
import {PageHitFactory, PostFactory} from '../factory';
import {FetchHttpClient} from '../utils/http-client';

export interface FactoryList {
    postFactory: PostFactory,
    pageHitFactory: PageHitFactory,
}

function createDatabasePersistence() {
    const registry = new EntityRegistry<DatabaseMetadata>();
    registry.register('posts', {tableName: 'posts'});

    return new KnexPersistenceAdapter({
        client: 'mysql2',
        connection: {
            ...config.ghostDb,
            charset: 'utf8mb4'
        },
        pool: {min: 0, max: 5}
    }, registry);
}

function createApiPersistence() {
    const registry = new EntityRegistry<TinyBirdApiMetadata>();
    registry.register('analytics_events', {
        endpoint: '/v0/events?name=analytics_events',
        primaryKey: 'session_id'
    });

    return new TinybirdPersistenceAdapter(appConfig.tinyBird, registry, new FetchHttpClient());
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
