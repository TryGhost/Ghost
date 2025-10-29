const assert = require('assert/strict');
const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const {OUTBOX_STATUSES} = require('../../../core/server/models/outbox');
const db = require('../../../core/server/data/db');
const labs = require('../../../core/shared/labs');
const sinon = require('sinon');

describe('Welcome Emails Integration', function () {
    before(testUtils.setup('default'));

    beforeEach(async function () {
        await db.knex('outbox').del();
        await db.knex('members').del();
    });

    afterEach(async function () {
        await db.knex('outbox').del();
        await db.knex('members').del();
        sinon.restore();
    });

    describe('Member creation with welcome emails enabled', function () {
        it('creates outbox entry when member source is "member"', async function () {
            sinon.stub(labs, 'isSet').withArgs('welcomeEmails').returns(true);

            const member = await models.Member.add({
                email: 'welcome-test@example.com',
                name: 'Welcome Test Member',
                email_disabled: false
            }, {context: {}});

            const outboxEntries = await models.Outbox.findAll({
                filter: 'event_type:MemberCreatedEvent'
            });

            assert.equal(outboxEntries.length, 1);
            const entry = outboxEntries.models[0];
            assert.equal(entry.get('event_type'), 'MemberCreatedEvent');
            assert.equal(entry.get('status'), OUTBOX_STATUSES.PENDING);
            
            const payload = JSON.parse(entry.get('payload'));
            assert.equal(payload.memberId, member.id);
            assert.equal(payload.email, 'welcome-test@example.com');
            assert.equal(payload.name, 'Welcome Test Member');
            assert.equal(payload.source, 'member');
        });

        it('does NOT create outbox entry when welcome emails feature is disabled', async function () {
            sinon.stub(labs, 'isSet').withArgs('welcomeEmails').returns(false);

            await models.Member.add({
                email: 'no-welcome@example.com',
                name: 'No Welcome Member',
                email_disabled: false
            }, {context: {}});

            const outboxEntries = await models.Outbox.findAll({
                filter: 'event_type:MemberCreatedEvent'
            });

            assert.equal(outboxEntries.length, 0);
        });

        it('does NOT create outbox entry when member is imported', async function () {
            sinon.stub(labs, 'isSet').withArgs('welcomeEmails').returns(true);

            await models.Member.add({
                email: 'imported@example.com',
                name: 'Imported Member',
                email_disabled: false
            }, {context: {import: true}});

            const outboxEntries = await models.Outbox.findAll({
                filter: 'event_type:MemberCreatedEvent'
            });

            assert.equal(outboxEntries.length, 0);
        });

        it('does NOT create outbox entry when member is created by admin', async function () {
            sinon.stub(labs, 'isSet').withArgs('welcomeEmails').returns(true);

            await models.Member.add({
                email: 'admin-created@example.com',
                name: 'Admin Created Member',
                email_disabled: false
            }, {context: {user: true}});

            const outboxEntries = await models.Outbox.findAll({
                filter: 'event_type:MemberCreatedEvent'
            });

            assert.equal(outboxEntries.length, 0);
        });

        it('creates outbox entry with correct timestamp', async function () {
            sinon.stub(labs, 'isSet').withArgs('welcomeEmails').returns(true);

            const beforeCreation = new Date();
            
            await models.Member.add({
                email: 'timestamp-test@example.com',
                name: 'Timestamp Test',
                email_disabled: false
            }, {context: {}});

            const afterCreation = new Date();

            const outboxEntries = await models.Outbox.findAll({
                filter: 'event_type:MemberCreatedEvent'
            });

            assert.equal(outboxEntries.length, 1);
            const entry = outboxEntries.models[0];
            const payload = JSON.parse(entry.get('payload'));
            
            const timestamp = new Date(payload.timestamp);
            assert.ok(timestamp >= beforeCreation);
            assert.ok(timestamp <= afterCreation);
        });
    });
});

