const assert = require('node:assert/strict');
const knex = require('knex').default;
const sinon = require('sinon');

const db = require('../../../../../core/server/data/db');
const queries = require('../../../../../core/server/services/email-analytics/lib/queries');
const backfill = require('../../../../../core/server/services/email-analytics/jobs/backfill-newsletter-tracked-email-count');

describe('Backfill newsletter tracked email count', function () {
    /** @type {import('knex').Knex} */
    let testDb;

    beforeEach(async function () {
        testDb = knex({
            client: 'better-sqlite3',
            useNullAsDefault: true,
            connection: {
                filename: ':memory:'
            }
        });

        sinon.stub(db, 'knex').get(() => testDb);

        await testDb.schema.createTable('members', function (table) {
            table.string('id').primary();
            table.integer('newsletter_tracked_email_count').nullable();
        });
    });

    afterEach(async function () {
        sinon.restore();
        await testDb.destroy();
    });

    it('backfills members with missing newsletter tracked counts', async function () {
        await testDb('members').insert([
            {id: 'member-1', newsletter_tracked_email_count: null},
            {id: 'member-2', newsletter_tracked_email_count: 3}
        ]);

        const aggregateMemberStatsBatch = sinon.stub(queries, 'aggregateMemberStatsBatch').resolves();

        const result = await backfill.backfillBatch();

        assert.equal(result, 1);
        sinon.assert.calledOnceWithExactly(aggregateMemberStatsBatch, ['member-1']);
    });
});
