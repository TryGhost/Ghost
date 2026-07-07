/**
 * The composition root: every container registration lives here so the whole
 * graph stays greppable in one place. Registration names are API — factories
 * destructure dependencies by these names (see ghost-di-migration-plan.md).
 */

import type {Container, Cradle} from './shared/container/container';
import createConnection from './server/data/db/create-connection';

export const registerCoreServices = (container: Container): void => {
    container.register('knex', {
        lifetime: 'SCOPED',
        factory: ({siteConfig}: Cradle) => createConnection(siteConfig.database),
        dispose: instance => (instance as import('knex').Knex).destroy()
    });
};
