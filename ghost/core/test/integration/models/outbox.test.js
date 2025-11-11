// @ts-nocheck - Models are dynamically loaded
const assert = require('assert/strict');
const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const {OUTBOX_STATUSES} = require('../../../core/server/models/outbox');
const db = require('../../../core/server/data/db');

describe('Outbox Model Integration', function () {
    before(testUtils.setup('default'));

    afterEach(async function () {
        await db.knex('outbox').del();
    });

    it('can create an outbox entry with default values', async function () {
        const entry = await models.Outbox.add({
            event_type: 'MemberCreatedEvent',
            payload: JSON.stringify({
                memberId: 'member123',
                email: 'test@example.com',
                name: 'Test Member'
            })
        });

        assert.ok(entry.id);
        assert.equal(entry.get('event_type'), 'MemberCreatedEvent');
        assert.equal(entry.get('status'), OUTBOX_STATUSES.PENDING);
        assert.equal(entry.get('retry_count'), 0);
    });

    it('can query outbox entries by status', async function () {
        await models.Outbox.add({
            event_type: 'MemberCreatedEvent',
            payload: JSON.stringify({test: 'data1'}),
            status: OUTBOX_STATUSES.PENDING
        });

        await models.Outbox.add({
            event_type: 'MemberCreatedEvent',
            payload: JSON.stringify({test: 'data2'}),
            status: OUTBOX_STATUSES.FAILED
        });

        const pendingEntries = await models.Outbox.findAll({
            filter: `status:${OUTBOX_STATUSES.PENDING}`
        });

        assert.equal(pendingEntries.length, 1);
        assert.equal(pendingEntries.models[0].get('status'), OUTBOX_STATUSES.PENDING);
    });

    it('can update outbox entry status and retry_count', async function () {
        const entry = await models.Outbox.add({
            event_type: 'MemberCreatedEvent',
            payload: JSON.stringify({test: 'data'}),
            status: OUTBOX_STATUSES.PENDING,
            retry_count: 0
        });

        const updated = await models.Outbox.edit({
            status: OUTBOX_STATUSES.PROCESSING,
            retry_count: 1
        }, {id: entry.id});

        assert.equal(updated.get('status'), OUTBOX_STATUSES.PROCESSING);
        assert.equal(updated.get('retry_count'), 1);
    });

    it('can delete processed outbox entries', async function () {
        const entry = await models.Outbox.add({
            event_type: 'MemberCreatedEvent',
            payload: JSON.stringify({test: 'data'})
        });

        await models.Outbox.destroy({id: entry.id});

        const found = await models.Outbox.findOne({id: entry.id});
        assert.equal(found, null);
    });

    it('stores and retrieves JSON payload correctly', async function () {
        const payload = {
            memberId: 'member123',
            email: 'test@example.com',
            name: 'Test Member',
            source: 'member',
            timestamp: new Date().toISOString()
        };

        const entry = await models.Outbox.add({
            event_type: 'MemberCreatedEvent',
            payload: JSON.stringify(payload)
        });

        const retrieved = await models.Outbox.findOne({id: entry.id});
        const retrievedPayload = JSON.parse(retrieved.get('payload'));

        assert.deepEqual(retrievedPayload, payload);
    });
});

