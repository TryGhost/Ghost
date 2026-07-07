/**
 * The composition root: every container registration lives here so the whole
 * graph stays greppable in one place. Registration names are API — factories
 * destructure dependencies by these names (see ghost-di-migration-plan.md).
 */

import type {Container, Cradle} from './shared/container/container';
import createConnection from './server/data/db/create-connection';
import createBookshelf from './server/models/base/create-bookshelf';
import createModels from './server/models/create-models';
import createEventRegistry from './server/lib/common/create-event-registry';
import createSettingsCache from './shared/settings-cache/create';

export const registerCoreServices = (container: Container): void => {
    container.register('settingsCache', {
        lifetime: 'SCOPED',
        factory: () => createSettingsCache()
    });

    container.register('events', {
        lifetime: 'SCOPED',
        factory: () => createEventRegistry(),
        dispose: (instance) => {
            (instance as import('events').EventEmitter).removeAllListeners();
        }
    });

    container.register('knex', {
        lifetime: 'SCOPED',
        factory: ({siteConfig}: Cradle) => createConnection(siteConfig.database),
        dispose: instance => (instance as import('knex').Knex).destroy()
    });

    container.register('models', {
        lifetime: 'SCOPED',
        factory: ({knex}: Cradle) => createModels(createBookshelf(knex))
    });
};
