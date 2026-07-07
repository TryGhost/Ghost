import assert from 'node:assert/strict';
import {createContainer} from '../../../../core/shared/container/container';
import {registerCoreServices} from '../../../../core/registrations';

/**
 * The DI migration's definition of done: everything registered in the
 * container must be able to run twice in one process with zero bleed.
 * Every migrated subsystem gets its isolation asserted here.
 */
describe('two scopes in one process', function () {
    const createSiteScope = (root: ReturnType<typeof createContainer>) => {
        return root.createScope({
            siteConfig: {
                database: {
                    client: 'better-sqlite3',
                    connection: {filename: ':memory:'}
                }
            }
        });
    };

    it('gives each scope its own database connection', async function () {
        const root = createContainer();
        registerCoreServices(root);
        const scopeA = createSiteScope(root);
        const scopeB = createSiteScope(root);

        const knexA = scopeA.resolve('knex') as import('knex').Knex;
        const knexB = scopeB.resolve('knex') as import('knex').Knex;

        try {
            assert.notEqual(knexA, knexB);

            await knexA.raw('create table site_a_only (x integer)');
            await knexA.raw('insert into site_a_only (x) values (1)');

            const rows = await knexA.raw('select x from site_a_only');
            assert.equal(rows[0].x, 1);

            await assert.rejects(knexB.raw('select x from site_a_only'));
        } finally {
            await scopeA.dispose();
            await scopeB.dispose();
        }
    });

    it('gives each scope its own model graph bound to its own database', async function () {
        const root = createContainer();
        registerCoreServices(root);
        const scopeA = createSiteScope(root);
        const scopeB = createSiteScope(root);

        try {
            const modelsA = scopeA.resolve('models') as Record<string, {knex?: unknown}>;
            const modelsB = scopeB.resolve('models') as Record<string, {knex?: unknown}>;

            assert.ok(modelsA.Post);
            assert.notEqual(modelsA.Post, modelsB.Post);
            assert.equal(modelsA.Base.knex, scopeA.resolve('knex'));
            assert.equal(modelsB.Base.knex, scopeB.resolve('knex'));
        } finally {
            await scopeA.dispose();
            await scopeB.dispose();
        }
    });

    it('gives each scope its own event bus', async function () {
        const root = createContainer();
        registerCoreServices(root);
        const scopeA = createSiteScope(root);
        const scopeB = createSiteScope(root);

        try {
            const eventsA = scopeA.resolve('events') as import('events').EventEmitter;
            const eventsB = scopeB.resolve('events') as import('events').EventEmitter;
            let fired = 0;
            eventsA.on('settings.edited', () => {
                fired += 1;
            });

            eventsB.emit('settings.edited');
            assert.equal(fired, 0);

            eventsA.emit('settings.edited');
            assert.equal(fired, 1);
        } finally {
            await scopeA.dispose();
            await scopeB.dispose();
        }
    });

    it('disposing one scope leaves the other working', async function () {
        const root = createContainer();
        registerCoreServices(root);
        const scopeA = createSiteScope(root);
        const scopeB = createSiteScope(root);

        const knexA = scopeA.resolve('knex') as import('knex').Knex;
        const knexB = scopeB.resolve('knex') as import('knex').Knex;

        await scopeA.dispose();

        await assert.rejects(knexA.raw('select 1'));
        const result = await knexB.raw('select 1 as x');
        assert.equal(result[0].x, 1);

        await scopeB.dispose();
    });
});
