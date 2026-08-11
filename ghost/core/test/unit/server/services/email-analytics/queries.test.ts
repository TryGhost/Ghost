import assert from 'node:assert/strict';
import ObjectId from 'bson-objectid';
import createKnex, {type Knex} from 'knex';
import {Queries} from '../../../../../core/server/services/email-analytics/lib/queries';

const createDatabase = async (): Promise<Knex> => {
    const database = createKnex({
        client: 'better-sqlite3',
        connection: {
            filename: ':memory:'
        },
        pool: {
            min: 1,
            max: 1
        },
        useNullAsDefault: true
    });

    await database.schema.createTable('jobs', (table) => {
        table.text('id').primary();
        table.text('name').notNullable().unique();
        table.text('status').notNullable().defaultTo('queued');
        table.datetime('started_at');
        table.datetime('finished_at');
        table.datetime('created_at').notNullable();
        table.datetime('updated_at');
        table.text('metadata');
        table.integer('queue_entry').unsigned();
    });

    return database;
};

describe('Email analytics queries', function () {
    let knex: Knex;
    let queries: Queries;

    beforeEach(async function () {
        knex = await createDatabase();
        queries = new Queries(knex);
    });

    afterEach(async function () {
        await knex.destroy();
    });

    describe('getJobData', function () {
        it('returns job data when job exists', async function () {
            const startedAt = '2026-08-11T10:00:00.000Z';
            const finishedAt = '2026-08-11T10:05:00.000Z';
            const metadata = {begin: startedAt, end: finishedAt};

            await knex('jobs').insert({
                id: ObjectId().toHexString(),
                name: 'email-analytics-scheduled',
                status: 'finished',
                started_at: startedAt,
                finished_at: finishedAt,
                created_at: startedAt,
                updated_at: finishedAt,
                metadata: JSON.stringify(metadata),
                queue_entry: 1
            });

            const result = await queries.getJobData('email-analytics-scheduled');

            assert.deepEqual(result, {
                finished_at: finishedAt,
                started_at: startedAt,
                metadata
            });
        });

        it('returns null when job does not exist', async function () {
            const result = await queries.getJobData('email-analytics-scheduled');

            assert.equal(result, null);
        });
    });
});
