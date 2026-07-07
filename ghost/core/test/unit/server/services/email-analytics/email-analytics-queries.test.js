const assert = require('node:assert/strict');
const knex = require('knex').default;
const sinon = require('sinon');

const db = require('../../../../../core/server/data/db');
const queries = require('../../../../../core/server/services/email-analytics/lib/queries');

describe('Email analytics queries', function () {
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
            table.integer('newsletter_email_count').notNullable().defaultTo(0);
            table.integer('newsletter_tracked_email_count').nullable();
            table.integer('newsletter_email_open_count').notNullable().defaultTo(0);
            table.integer('email_open_rate').nullable();
        });

        await testDb.schema.createTable('emails', function (table) {
            table.string('id').primary();
            table.boolean('track_opens').notNullable().defaultTo(true);
        });

        await testDb.schema.createTable('email_recipients', function (table) {
            table.string('id').primary();
            table.string('member_id').notNullable();
            table.string('email_id').notNullable();
            table.dateTime('opened_at').nullable();
        });
    });

    afterEach(async function () {
        sinon.restore();
        await testDb.destroy();
    });

    async function createMember(id) {
        await testDb('members').insert({id});
    }

    async function createEmail(id, trackOpens) {
        await testDb('emails').insert({
            id,
            track_opens: trackOpens ? 1 : 0
        });
    }

    async function createRecipient(id, memberId, emailId, opened = false) {
        await testDb('email_recipients').insert({
            id,
            member_id: memberId,
            email_id: emailId,
            opened_at: opened ? new Date() : null
        });
    }

    it('stores tracked newsletter email count when aggregating one member', async function () {
        await createMember('member-1');
        await createEmail('tracked-opened', true);
        await createEmail('tracked-unopened', true);
        await createEmail('untracked', false);
        await createRecipient('recipient-1', 'member-1', 'tracked-opened', true);
        await createRecipient('recipient-2', 'member-1', 'tracked-unopened');
        await createRecipient('recipient-3', 'member-1', 'untracked');

        await queries.aggregateMemberStats('member-1');

        const member = await testDb('members').where('id', 'member-1').first();
        assert.equal(member.newsletter_email_count, 3);
        assert.equal(member.newsletter_tracked_email_count, 2);
        assert.equal(member.newsletter_email_open_count, 1);
    });

    it('stores tracked newsletter email count when aggregating members in a batch', async function () {
        await createMember('member-1');
        await createMember('member-2');
        await createMember('member-3');
        await createEmail('tracked', true);
        await createEmail('untracked', false);
        await createRecipient('recipient-1', 'member-1', 'tracked', true);
        await createRecipient('recipient-2', 'member-1', 'tracked');
        await createRecipient('recipient-3', 'member-1', 'untracked');
        await createRecipient('recipient-4', 'member-2', 'untracked');

        await queries.aggregateMemberStatsBatch(['member-1', 'member-2', 'member-3']);

        const members = await testDb('members').orderBy('id');
        assert.equal(members[0].newsletter_tracked_email_count, 2);
        assert.equal(members[1].newsletter_tracked_email_count, 0);
        assert.equal(members[2].newsletter_tracked_email_count, 0);
    });
});
