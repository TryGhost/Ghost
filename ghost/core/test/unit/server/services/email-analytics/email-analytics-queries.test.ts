import assert from 'node:assert/strict';
import createKnex, {type Knex} from 'knex';

const db = require('../../../../../core/server/data/db');
const queries = require('../../../../../core/server/services/email-analytics/lib/queries');

describe('EmailAnalyticsQueries', function () {
    let knex: Knex;
    let originalKnexDescriptor: PropertyDescriptor | undefined;

    beforeEach(async function () {
        knex = createKnex({
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

        await knex.schema.createTable('jobs', (table) => {
            table.text('id').primary();
            table.text('name').unique();
            table.text('status');
            table.text('started_at');
            table.text('finished_at');
            table.text('created_at');
            table.text('metadata');
        });
        await knex.schema.createTable('email_recipients', (table) => {
            table.text('opened_at');
            table.text('delivered_at');
            table.text('failed_at');
        });
        await knex.schema.createTable('automated_email_recipients', (table) => {
            table.text('opened_at');
            table.text('delivered_at');
        });

        originalKnexDescriptor = Object.getOwnPropertyDescriptor(db, 'knex');
        Object.defineProperty(db, 'knex', {
            configurable: true,
            value: knex
        });
    });

    afterEach(async function () {
        if (originalKnexDescriptor) {
            Object.defineProperty(db, 'knex', originalKnexDescriptor);
        }
        await knex.destroy();
    });

    it('seeds automation cursor from automation recipients', async function () {
        const newsletterTimestamp = '2024-02-01T00:00:00.000Z';
        const automationTimestamp = '2024-01-01T00:00:00.000Z';
        await knex('email_recipients').insert({
            opened_at: newsletterTimestamp
        });
        await knex('automated_email_recipients').insert({
            opened_at: automationTimestamp
        });

        const result = await queries.getLastEventTimestamp(
            'email-analytics-automation-latest-opened-test',
            ['opened'],
            {
                tableName: 'automated_email_recipients',
                eventColumns: {
                    delivered: 'delivered_at',
                    opened: 'opened_at'
                }
            }
        );

        assert.deepEqual(result, new Date(automationTimestamp));
    });

    it('uses the persisted job run timestamp instead of querying the recipients table', async function () {
        const jobTimestamp = '2024-01-01T00:00:00.000Z';
        await knex('jobs').insert({
            id: 'job-1',
            name: 'email-analytics-automation-latest-opened-test',
            finished_at: jobTimestamp
        });
        // A newer recipient timestamp that must be ignored while job data exists
        await knex('automated_email_recipients').insert({
            opened_at: '2024-02-01T00:00:00.000Z'
        });

        const result = await queries.getLastEventTimestamp(
            'email-analytics-automation-latest-opened-test',
            ['opened'],
            {
                tableName: 'automated_email_recipients',
                eventColumns: {
                    delivered: 'delivered_at',
                    opened: 'opened_at'
                }
            }
        );

        assert.deepEqual(result, new Date(jobTimestamp));
    });

    it('skips event columns that are not part of the event source', async function () {
        const deliveredTimestamp = '2024-01-01T00:00:00.000Z';
        await knex('automated_email_recipients').insert({
            delivered_at: deliveredTimestamp
        });

        // 'failed' has no column in the automation event source, so it must be
        // skipped rather than querying a non-existent failed_at column.
        const result = await queries.getLastEventTimestamp(
            'email-analytics-automation-latest-others-test',
            ['delivered', 'failed'],
            {
                tableName: 'automated_email_recipients',
                eventColumns: {
                    delivered: 'delivered_at',
                    opened: 'opened_at'
                }
            }
        );

        assert.deepEqual(result, new Date(deliveredTimestamp));
    });

    it('returns the latest timestamp across multiple event columns', async function () {
        await knex('email_recipients').insert({
            delivered_at: '2024-01-01T00:00:00.000Z',
            opened_at: '2024-03-01T00:00:00.000Z'
        });

        const result = await queries.getLastEventTimestamp(
            'email-analytics-latest-test',
            ['delivered', 'opened'],
            {
                tableName: 'email_recipients',
                eventColumns: {
                    delivered: 'delivered_at',
                    opened: 'opened_at',
                    failed: 'failed_at'
                }
            }
        );

        assert.deepEqual(result, new Date('2024-03-01T00:00:00.000Z'));
    });

    it('returns undefined and creates a tracking job when the table has no events', async function () {
        const jobName = 'email-analytics-automation-missing-test';

        const result = await queries.getLastEventTimestamp(
            jobName,
            ['opened'],
            {
                tableName: 'automated_email_recipients',
                eventColumns: {
                    delivered: 'delivered_at',
                    opened: 'opened_at'
                }
            }
        );

        assert.equal(result, undefined);

        const job = await knex('jobs').where('name', jobName).first();
        assert.ok(job, 'expected a tracking job to be created');
    });
});
